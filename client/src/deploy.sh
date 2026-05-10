#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vault Bot — VPS Deploy Script
# Ubuntu 22 LTS · systemd · optional nginx
# Usage: bash scripts/deploy.sh [--no-nginx]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

step()  { echo -e "\n${CYAN}▶ $*${RESET}"; }
ok()    { echo -e "  ${GREEN}✓${RESET} $*"; }
warn()  { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
die()   { echo -e "\n${RED}✗ $*${RESET}\n"; exit 1; }
ask()   { echo -e "  ${BOLD}?${RESET}  $1"; }

# ── Options ──────────────────────────────────────────────────────────────────
SETUP_NGINX=true
for arg in "$@"; do
  [[ "$arg" == "--no-nginx" ]] && SETUP_NGINX=false
done

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_FILE="$ROOT/vault-bot.service"
ENV_FILE="$ROOT/.env"
ENV_EXAMPLE="$ROOT/.env.example"

echo ""
echo -e "${CYAN}╔══════════════════════════════════╗${RESET}"
echo -e "${CYAN}║   Vault Bot VPS Deploy v2.0      ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════╝${RESET}"
echo ""

# ── 1. Check we're running as a real user (not root) ─────────────────────────
step "Checking environment"
if [[ "$EUID" -eq 0 ]]; then
  die "Do not run as root. Run as your regular user; the script will use sudo when needed."
fi
DEPLOY_USER="$(whoami)"
ok "Running as: $DEPLOY_USER"

# ── 2. Node ≥ 20 ─────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  die "Node.js is not installed. Install with: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
fi
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  die "Node.js 20+ required. You have $(node --version). Upgrade first."
fi
ok "Node.js $(node --version)"

# ── 3. git ────────────────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  warn "git not found — installing…"
  sudo apt-get update -qq && sudo apt-get install -y git
fi
ok "git $(git --version | awk '{print $3}')"

# ── 4. .env — create or validate ─────────────────────────────────────────────
step "Environment file"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  ok "Created .env from .env.example"
  echo ""
  warn "Required values in .env (press Enter to keep existing value):"
  echo ""

  # Helper: read a value from .env
  get_env() { grep -E "^${1}=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' || true; }
  set_env() {
    local key="$1" val="$2"
    if grep -qE "^${key}=" "$ENV_FILE"; then
      sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
      echo "${key}=${val}" >> "$ENV_FILE"
    fi
  }

  # API_SECRET_KEY
  current=$(get_env API_SECRET_KEY)
  ask "API_SECRET_KEY [generate random? y/n, default: y]:"
  read -r ans
  if [[ "$ans" != "n" && "$ans" != "N" ]]; then
    generated=$(openssl rand -hex 32)
    set_env "API_SECRET_KEY" "$generated"
    ok "Generated API_SECRET_KEY: $generated"
    echo "  (Save this — you'll need it to log into the web UI)"
  fi

  # VAULT_PATH
  current=$(get_env VAULT_PATH)
  ask "VAULT_PATH — absolute path to your Obsidian vault [${current:-/home/${DEPLOY_USER}/obsidian-vault}]:"
  read -r ans
  val="${ans:-${current:-/home/${DEPLOY_USER}/obsidian-vault}}"
  set_env "VAULT_PATH" "$val"
  ok "VAULT_PATH=$val"

  # VAULT_INDEX_PATH
  current=$(get_env VAULT_INDEX_PATH)
  default_idx="/home/${DEPLOY_USER}/vault-index/vault-index.json"
  ask "VAULT_INDEX_PATH — local path to vault-index.json [${current:-$default_idx}]:"
  read -r ans
  val="${ans:-${current:-$default_idx}}"
  set_env "VAULT_INDEX_PATH" "$val"
  ok "VAULT_INDEX_PATH=$val"

  # GITHUB_REPO_PATH
  current=$(get_env GITHUB_REPO_PATH)
  default_repo="/home/${DEPLOY_USER}/vault-index"
  ask "GITHUB_REPO_PATH — local path to the git repo for pushing index [${current:-$default_repo}]:"
  read -r ans
  val="${ans:-${current:-$default_repo}}"
  set_env "GITHUB_REPO_PATH" "$val"
  ok "GITHUB_REPO_PATH=$val"

  # NODE_ENV
  set_env "NODE_ENV" "production"
  ok "NODE_ENV=production"

  # PORT
  current=$(get_env PORT)
  ask "PORT [${current:-4000}]:"
  read -r ans
  val="${ans:-${current:-4000}}"
  set_env "PORT" "$val"
  ok "PORT=$val"
  APP_PORT="$val"

  # CORS_ORIGINS — set after we know the domain
else
  ok ".env already exists — using existing values"
  APP_PORT=$(grep -E "^PORT=" "$ENV_FILE" | cut -d= -f2 | tr -d '"' || echo "4000")
  # Make sure NODE_ENV is production
  if grep -qE "^NODE_ENV=" "$ENV_FILE"; then
    sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "$ENV_FILE"
  else
    echo "NODE_ENV=production" >> "$ENV_FILE"
  fi
  ok "Ensured NODE_ENV=production"
fi

# ── 5. Install dependencies ───────────────────────────────────────────────────
step "Installing dependencies"
cd "$ROOT"
npm install --prefer-offline 2>&1 | tail -3
ok "Dependencies ready"

# ── 6. Build ──────────────────────────────────────────────────────────────────
step "Building (client + server)"
npm run build 2>&1 | grep -E "(error|warning|built|vite|tsc|✓)" || true
ok "Build complete"

# ── 7. Systemd service ────────────────────────────────────────────────────────
step "Setting up systemd service"

# Patch the service file with real values
PATCHED_SERVICE="/tmp/vault-bot.service.tmp"
sed \
  -e "s|YOUR_USERNAME|${DEPLOY_USER}|g" \
  -e "s|WorkingDirectory=.*|WorkingDirectory=${ROOT}|" \
  -e "s|EnvironmentFile=.*|EnvironmentFile=${ENV_FILE}|" \
  "$SERVICE_FILE" > "$PATCHED_SERVICE"

sudo cp "$PATCHED_SERVICE" /etc/systemd/system/vault-bot.service
rm "$PATCHED_SERVICE"
sudo systemctl daemon-reload
sudo systemctl enable vault-bot
ok "vault-bot.service installed and enabled"

# Restart (or start fresh)
if sudo systemctl is-active --quiet vault-bot; then
  sudo systemctl restart vault-bot
  ok "Service restarted"
else
  sudo systemctl start vault-bot
  ok "Service started"
fi

sleep 2
if sudo systemctl is-active --quiet vault-bot; then
  ok "Service is running ✓"
else
  warn "Service may have failed to start. Check: journalctl -u vault-bot -n 30"
fi

# ── 8. Nginx (optional) ───────────────────────────────────────────────────────
if $SETUP_NGINX; then
  step "Nginx setup"
  if ! command -v nginx &>/dev/null; then
    warn "nginx not installed — installing…"
    sudo apt-get update -qq && sudo apt-get install -y nginx
  fi
  ok "nginx $(nginx -v 2>&1 | grep -o '[0-9.]*$')"

  ask "Domain name (e.g. vault.example.com) — or press Enter to skip nginx config:"
  read -r DOMAIN

  if [[ -n "$DOMAIN" ]]; then
    NGINX_CONF="/etc/nginx/sites-available/vault-bot"
    sudo tee "$NGINX_CONF" > /dev/null << NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # Increase body size for photo uploads (base64 is ~33% larger than binary)
    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
    }
}
NGINX

    # Enable site
    sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/vault-bot 2>/dev/null || true
    # Remove default if it exists
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

    # Test config
    if sudo nginx -t 2>/dev/null; then
      sudo systemctl reload nginx
      ok "Nginx configured for $DOMAIN"

      # Update CORS_ORIGINS in .env
      if grep -qE "^CORS_ORIGINS=" "$ENV_FILE"; then
        sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://${DOMAIN}|" "$ENV_FILE"
      else
        echo "CORS_ORIGINS=http://${DOMAIN}" >> "$ENV_FILE"
      fi
      ok "CORS_ORIGINS set to http://${DOMAIN}"

      # Restart app so it picks up new CORS setting
      sudo systemctl restart vault-bot
      ok "App restarted with new CORS config"

      echo ""
      warn "For HTTPS (strongly recommended for clipboard API on Android):"
      echo "  sudo apt install certbot python3-certbot-nginx"
      echo "  sudo certbot --nginx -d ${DOMAIN}"
    else
      warn "Nginx config test failed — check manually: sudo nginx -t"
    fi
  else
    warn "Skipped nginx config — app accessible at http://YOUR_SERVER_IP:${APP_PORT}"
  fi
else
  warn "Skipped nginx (--no-nginx flag set)"
fi

# ── 9. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════╗${RESET}"
echo -e "${GREEN}║      Deploy complete! ✓           ║${RESET}"
echo -e "${GREEN}╚══════════════════════════════════╝${RESET}"
echo ""
echo "  Useful commands:"
echo -e "    ${CYAN}sudo systemctl status vault-bot${RESET}        — check service"
echo -e "    ${CYAN}journalctl -u vault-bot -f${RESET}             — live logs"
echo -e "    ${CYAN}tail -f ${ROOT}/logs/vault-bot-\$(date +%Y-%m-%d).log${RESET}"
echo ""
echo "  Re-deploy after code changes:"
echo -e "    ${CYAN}bash ${ROOT}/scripts/deploy.sh${RESET}"
echo ""
