#!/usr/bin/env bash
# Vault Bot VPS setup
# Usage: bash scripts/vps-setup.sh
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

step()  { echo -e "\n${CYAN}▶ $*${RESET}"; }
ok()    { echo -e "  ${GREEN}✓${RESET} $*"; }
warn()  { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
die()   { echo -e "\n${RED}✗ $*${RESET}\n"; exit 1; }
ask()   { echo -ne "  ${BOLD}?${RESET}  $1 "; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT/.env"
ENV_EXAMPLE="$ROOT/.env.example"
SERVICE_NAME="vault-bot"
DEFAULT_DOMAIN="${VAULT_BOT_DOMAIN:-note.zayu.dev}"

get_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  grep -E "^${1}=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed 's/^"//;s/"$//' || true
}

set_env() {
  local key="$1" val="$2"
  touch "$ENV_FILE"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    printf "%s=%s\n" "$key" "$val" >> "$ENV_FILE"
  fi
}

prompt() {
  local label="$1" default="$2" answer
  ask "${label} [${default}]:"
  read -r answer
  printf "%s" "${answer:-$default}"
}

ensure_command() {
  local cmd="$1" pkg="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    ok "$cmd available"
    return
  fi
  warn "$cmd not found; installing $pkg"
  sudo apt-get update -qq
  sudo apt-get install -y "$pkg"
}

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -e "process.stdout.write(process.versions.node.split('.')[0])")"
    if [[ "$major" -ge 20 ]]; then
      ok "Node.js $(node --version)"
      return
    fi
    warn "Node.js $(node --version) found, but Node 20+ is required"
  fi
  warn "Installing Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ok "Node.js $(node --version)"
}

write_service() {
  local user="$1"
  sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<SERVICE
[Unit]
Description=Vault Bot - Obsidian knowledge pipeline
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${user}
WorkingDirectory=${ROOT}
EnvironmentFile=${ENV_FILE}
ExecStart=$(command -v node) ${ROOT}/server/dist/index.js
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SERVICE
}

write_nginx() {
  local domain="$1" port="$2"
  sudo tee "/etc/nginx/sites-available/${SERVICE_NAME}" >/dev/null <<NGINX
server {
    listen 80;
    server_name ${domain};

    client_max_body_size 40M;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINX
  sudo ln -sf "/etc/nginx/sites-available/${SERVICE_NAME}" "/etc/nginx/sites-enabled/${SERVICE_NAME}"
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl reload nginx
}

ensure_index_repo() {
  local repo_path="$1" index_path="$2" remote_url="$3" git_name="$4" git_email="$5"

  mkdir -p "$repo_path"
  if [[ ! -d "$repo_path/.git" ]]; then
    if [[ -n "$remote_url" ]]; then
      rmdir "$repo_path" 2>/dev/null || true
      git clone "$remote_url" "$repo_path"
    else
      git -C "$repo_path" init
    fi
  fi

  git -C "$repo_path" config user.name "$git_name"
  git -C "$repo_path" config user.email "$git_email"

  if [[ -n "$remote_url" ]] && ! git -C "$repo_path" remote get-url origin >/dev/null 2>&1; then
    git -C "$repo_path" remote add origin "$remote_url"
  fi

  mkdir -p "$(dirname "$index_path")"
  if [[ ! -f "$index_path" ]]; then
    cat > "$index_path" <<'JSON'
{
  "last_updated": null,
  "last_full_reindex": null,
  "total_notes": 0,
  "note_type_counts": {},
  "para_folder_counts": {},
  "tags": [],
  "tag_frequency": {},
  "orphan_notes": [],
  "top_backlink_targets": [],
  "last_10_notes": [],
  "notes": [],
  "backlinks": {}
}
JSON
    git -C "$repo_path" add "$index_path" || true
    git -C "$repo_path" commit -m "vault-index: initialize" >/dev/null 2>&1 || true
  fi
}

echo ""
echo -e "${CYAN}╔══════════════════════════════════╗${RESET}"
echo -e "${CYAN}║      Vault Bot VPS Setup         ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════╝${RESET}"
echo ""

if [[ "$EUID" -eq 0 ]]; then
  die "Run this as your deploy user, not root. The script will use sudo when needed."
fi

DEPLOY_USER="$(whoami)"
ok "Deploy user: $DEPLOY_USER"

step "System dependencies"
ensure_command curl curl
ensure_command git git
ensure_node

step "Environment"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  ok "Created .env"
else
  ok ".env already exists"
fi

CURRENT_DOMAIN="$(get_env APP_DOMAIN || true)"
DOMAIN="$(prompt "Domain" "${CURRENT_DOMAIN:-$DEFAULT_DOMAIN}")"
APP_PORT="$(prompt "App port" "$(get_env PORT || true)")"
APP_PORT="${APP_PORT:-4000}"
VAULT_PATH="$(prompt "Obsidian vault path" "$(get_env VAULT_PATH || true)")"
VAULT_PATH="${VAULT_PATH:-/home/${DEPLOY_USER}/obsidian-vault}"
INDEX_REPO_PATH="$(prompt "Vault index git repo path" "$(get_env GITHUB_REPO_PATH || true)")"
INDEX_REPO_PATH="${INDEX_REPO_PATH:-/home/${DEPLOY_USER}/vault-index}"
INDEX_PATH="$(prompt "vault-index.json path" "$(get_env VAULT_INDEX_PATH || true)")"
INDEX_PATH="${INDEX_PATH:-${INDEX_REPO_PATH}/vault-index.json}"
INDEX_REMOTE="$(prompt "Vault index git remote URL (blank to skip)" "")"
RAW_INDEX_URL="$(prompt "Raw vault index URL (GitHub raw URL, blank allowed)" "$(get_env VAULT_INDEX_GITHUB_URL || true)")"
GIT_NAME="$(prompt "Git commit name for index repo" "$(git config --global user.name || true)")"
GIT_NAME="${GIT_NAME:-vault-bot}"
GIT_EMAIL="$(prompt "Git commit email for index repo" "$(git config --global user.email || true)")"
GIT_EMAIL="${GIT_EMAIL:-vault-bot@${DOMAIN}}"

if [[ "$(get_env API_SECRET_KEY)" == "" || "$(get_env API_SECRET_KEY)" == change-this-* ]]; then
  API_SECRET_KEY="$(openssl rand -hex 32)"
  set_env API_SECRET_KEY "$API_SECRET_KEY"
  ok "Generated API_SECRET_KEY: $API_SECRET_KEY"
  warn "Save this key; you need it to sign in."
else
  ok "API_SECRET_KEY already set"
fi

mkdir -p "$VAULT_PATH"
mkdir -p "$VAULT_PATH/00_Inbox/_Attachments" "$VAULT_PATH/00_Inbox/_Quick_Notes"

set_env NODE_ENV production
set_env HOST 127.0.0.1
set_env PORT "$APP_PORT"
set_env BODY_LIMIT 35mb
set_env VAULT_PATH "$VAULT_PATH"
set_env VAULT_INDEX_PATH "$INDEX_PATH"
set_env GITHUB_REPO_PATH "$INDEX_REPO_PATH"
set_env VAULT_INDEX_GITHUB_URL "$RAW_INDEX_URL"
set_env CORS_ORIGINS "https://${DOMAIN},http://${DOMAIN}"
set_env APP_DOMAIN "$DOMAIN"

step "Vault index git repo"
ensure_index_repo "$INDEX_REPO_PATH" "$INDEX_PATH" "$INDEX_REMOTE" "$GIT_NAME" "$GIT_EMAIL"
ok "Index repo ready at $INDEX_REPO_PATH"

step "Install and build"
npm install
npm run build
ok "Build complete"

step "systemd"
write_service "$DEPLOY_USER"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
sleep 2
sudo systemctl is-active --quiet "$SERVICE_NAME" && ok "Service running" || warn "Service did not start; run journalctl -u ${SERVICE_NAME} -n 80"

step "Nginx"
ensure_command nginx nginx
write_nginx "$DOMAIN" "$APP_PORT"
ok "Nginx configured for http://${DOMAIN}"

ask "Install/renew HTTPS certificate with certbot now? [y/N]:"
read -r CERTBOT_ANSWER
if [[ "$CERTBOT_ANSWER" == "y" || "$CERTBOT_ANSWER" == "Y" ]]; then
  ensure_command certbot certbot
  sudo apt-get install -y python3-certbot-nginx
  sudo certbot --nginx -d "$DOMAIN"
  set_env CORS_ORIGINS "https://${DOMAIN}"
  sudo systemctl restart "$SERVICE_NAME"
  ok "HTTPS configured and CORS updated"
else
  warn "Skipped HTTPS. Clipboard features and secure browser APIs work best over HTTPS."
fi

echo ""
echo -e "${GREEN}Setup complete.${RESET}"
echo "URL: https://${DOMAIN}"
echo "Service: sudo systemctl status ${SERVICE_NAME}"
echo "Logs: journalctl -u ${SERVICE_NAME} -f"
echo "Settings page will show whether vault/index/git paths are correct."
