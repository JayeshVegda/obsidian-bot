# Tasker Integration Setup Guide

This guide explains how to set up Tasker (Android automation app) to send notes directly to Vault Bot via API.

## Prerequisites

1. **Tasker app** installed on your Android phone
2. **API Secret Key** from your Vault Bot server (set in `.env` as `API_SECRET_KEY`)
3. **Server URL** where Vault Bot is running
4. **Network access** from your phone to the Vault Bot server (same WiFi or accessible domain)

---

## API Endpoint Details

### Save Note Endpoint

**URL:** `POST http(s)://your-server:port/api/notes`

**Authentication:** Include the API key in the request header:
```
X-API-Key: your_api_secret_key
```

**Content-Type:** `application/json`

### Request Body (JSON)

Required fields must be present and non-empty:

```json
{
  "title": "Note Title",
  "tags": ["tag1", "tag2"],
  "note_type": "thought",
  "para_suggestion": "paragraph tag or section",
  "created_date": "2026-05-11T12:00:00Z",
  "content": "Your note content here (minimum word count required)",
  "backlinks": ["optional", "related notes"],
  "photos": ["optional/relative/path/to/photo.jpg"]
}
```

### Field Requirements

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | String | ✓ | Non-empty, max length checked |
| `tags` | Array | ✓ | At least 1 tag, each must be non-empty |
| `note_type` | String | ✓ | Must be from your allowed note types (see config.yaml) |
| `para_suggestion` | String | ✓ | Paragraph/section where note should go |
| `created_date` | String | ✓ | ISO 8601 format (e.g., `2026-05-11T12:00:00Z`) |
| `content` | String | ✓ | Minimum word count required |
| `backlinks` | Array | ✗ | Links to other notes |
| `photos` | Array | ✗ | Vault-relative paths to photos |

### Response

**Success (200):**
```json
{
  "status": "success",
  "filename": "20260511_120000_note_title.md",
  "tags": ["tag1", "tag2"],
  "backlinks": [],
  "para_suggestion": "paragraph tag",
  "note_type": "thought",
  "index_pushed": true
}
```

**Error (400):**
```json
{
  "status": "error",
  "type": "validation_failed",
  "errors": ["title: exceeds max length (200)", "content: too short (minimum 10 words)"]
}
```

**Unauthorized (401):**
```json
{
  "status": "error",
  "type": "unauthorized",
  "message": "Invalid API key"
}
```

---

## Tasker Setup Steps

### 1. Create a Tasker Project

1. Open **Tasker**
2. Go to **Projects** tab
3. Tap **+** to create a new project
4. Name it: `"Vault Bot"` or similar

### 2. Create a Task

1. In the Vault Bot project, tap **+** to add a task
2. Name it: `"Save to Vault"` or `"Send Note"`

### 3. Add HTTP Post Action

1. Tap **+** to add an action
2. Search for **HTTP Post**
3. Configure:

   **URL:**
   ```
   http://your-server-ip:4000/api/notes
   ```
   (Replace `your-server-ip` with your actual server IP/domain and port)

   **Headers:**
   ```
   X-API-Key: your_api_secret_key
   ```
   (Replace with your actual API key)

   **Body:**
   Use JSON format with Tasker variables for dynamic content:
   ```json
   {
     "title": "%title",
     "tags": ["%tag1", "%tag2"],
     "note_type": "%note_type",
     "para_suggestion": "%para",
     "created_date": "%created_date",
     "content": "%content"
   }
   ```

### 4. Set Up Input Variables

Before running the task, you need to set variables. Add actions before the HTTP Post:

**Set Title:**
- Action: **Variable Set** → `%title` = `Your Note Title Here`

**Set Tags (as JSON array):**
- Action: **Variable Set** → `%tag1` = `important`
- Action: **Variable Set** → `%tag2` = `personal`

**Set Note Type:**
- Action: **Variable Set** → `%note_type` = `thought` (or configured type)

**Set Paragraph:**
- Action: **Variable Set** → `%para` = `Daily Notes`

**Set Current Date:**
- Action: **Variable Set** → `%created_date` = `%TIMES` (Tasker's current timestamp)
  - Convert to ISO format if needed

**Set Content:**
- Action: **Variable Set** → `%content` = `Your full note content...`

### 5. Add Error Handling (Optional)

After HTTP Post, add:

1. **Flash** action to display response:
   ```
   %http_response
   ```
   This shows the server's JSON response on your phone.

2. **If** action to check status:
   ```
   If %http_response_code = 200
     Flash: ✓ Note saved successfully
   Else
     Flash: ✗ Failed to save: %http_response
   End If
   ```

### 6. Create a Profile/Shortcut (Optional)

To make it quick to use:

1. Go to **Profiles** tab
2. Create a new profile (e.g., trigger on app launch, time, gesture)
3. Link it to your `"Save to Vault"` task
4. Now you can run it from the Tasker home screen or trigger automatically

---

## Example: Quick Note Profile

This example saves a timestamped quick note:

```
Profile: "Quick Note to Vault"
  Trigger: On Task - %quick_note_triggered
  
Task: "Quick Note"
  1. Variable Set: %title = Get user input "Note title:"
  2. Variable Set: %content = Get user input "Note content:"
  3. Variable Set: %tag1 = "quick-note"
  4. Variable Set: %note_type = "thought"
  5. Variable Set: %para = "Inbox"
  6. Variable Set: %created_date = Get current ISO timestamp
  7. HTTP Post to /api/notes with above variables
  8. Flash: Server response (%http_response_code)
```

---

## Troubleshooting

### 401 Unauthorized
- **Check:** API key is correct and matches `API_SECRET_KEY` in `.env`
- **Check:** Header is spelled correctly: `X-API-Key` (case-sensitive)

### 400 Validation Failed
- **Check:** All required fields are present
- **Check:** `note_type` matches one in your `config.yaml`
- **Check:** `created_date` is in ISO 8601 format (e.g., `2026-05-11T12:00:00Z`)
- **Check:** `content` has minimum required word count
- **Check:** `title` doesn't exceed max length
- **Check:** At least 1 tag is provided

### Connection Refused
- **Check:** Server is running (`sudo systemctl status vault-bot`)
- **Check:** Firewall allows traffic on the port
- **Check:** Your phone can reach the server (same WiFi or port forwarded)
- **Check:** URL format is correct (include protocol: `http://` or `https://`)

### Timestamp Issues

Tasker's `%TIMES` variable returns milliseconds. Use this formula to convert to ISO 8601:

```
Java Expression: new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'")
                    .format(new java.util.Date(%TIMES))
```

Or use a simpler approach with Tasker's built-in:
```
%now = %TIMES
# Use an online converter or calculate manually
```

---

## Example Tasker Tasks

### Simple One-Line Note

```json
{
  "title": "Quick Thought",
  "tags": ["thoughts"],
  "note_type": "thought",
  "para_suggestion": "Daily Inbox",
  "created_date": "2026-05-11T12:00:00Z",
  "content": "This is a quick note from my phone"
}
```

### Detailed Note with Context

```json
{
  "title": "Meeting Notes - Q2 Planning",
  "tags": ["meeting", "planning", "q2"],
  "note_type": "meeting",
  "para_suggestion": "Meetings",
  "created_date": "2026-05-11T10:30:00Z",
  "content": "Discussed project roadmap, timeline, and resource allocation. Key decisions: focus on feature X first.",
  "backlinks": ["Project Roadmap", "Resource Planning"],
  "photos": []
}
```

---

## Server Configuration Validation

Before setting up Tasker, verify your server config in `config.yaml`:

```yaml
note_types:
  allowed:
    - thought
    - idea
    - task
    - meeting
    - research
```

Check allowed types in your config and use those in the `note_type` field.

---

## Testing Your Setup

1. **Via Curl (from your computer):**
   ```bash
   curl -X POST http://localhost:4000/api/notes \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your_api_secret_key" \
     -d '{
       "title": "Test from Curl",
       "tags": ["test"],
       "note_type": "thought",
       "para_suggestion": "Inbox",
       "created_date": "2026-05-11T12:00:00Z",
       "content": "This is a test note from curl command line interface"
     }'
   ```

2. **Via Tasker:**
   - Create the task as described above
   - Run it manually first
   - Check phone logs and server logs for errors
   - Verify the note appears in your vault

3. **Check Logs:**
   ```bash
   journalctl -u vault-bot -n 50
   # or
   tail -f logs/bot.log
   ```

---

## Security Notes

1. **API Key:** Keep your `API_SECRET_KEY` private. Don't share it.
2. **HTTPS:** Use HTTPS in production (set up reverse proxy with SSL)
3. **CORS:** By default, only configured origins can access the API
4. **Rate Limiting:** API is rate-limited to 200 requests per 15 minutes
5. **Network:** Only expose the server to trusted networks or use VPN

---

## Advanced: Custom Tasker Templates

### Variable Helper Task

Create a reusable task to standardize inputs:

```
Task: "Prepare Note Variables"
  1. Variable Set: %current_time = [current ISO timestamp]
  2. Variable Set: %title = Get user input
  3. Variable Set: %content = Get user input
  4. Variable Set: %tags_input = Get user input (comma-separated)
  5. Parse %tags_input into JSON array
  6. Set other defaults based on time/context
  7. Return prepared variables
```

### Auto-Tagging by Context

Add context-based tagging:

```
If %TIMES > [work hours start] AND %TIMES < [work hours end]
  Variable Set: %context_tag = "work"
Else
  Variable Set: %context_tag = "personal"
End If

# Include %context_tag in tags array
```

---

## FAQ

**Q: Can I send photos with notes?**
A: Yes, include vault-relative paths in the `photos` array. The photos must already exist in your vault.

**Q: What if the server is on a home network?**
A: You'll need to either:
- Use a VPN to connect to your home network from phone
- Port forward the Vault Bot port to your router (security risk)
- Use a reverse proxy with dynamic DNS

**Q: Can I automate note saving (e.g., every hour)?**
A: Yes, use Tasker's **Time** profile to trigger the task on a schedule, but customize content via prompts or integration with other apps.

**Q: What happens if my phone loses internet?**
A: The HTTP request will fail. Consider using Tasker's **Queue** feature to retry later when connection is restored.

**Q: Can I send notes from other apps?**
A: Yes, use IFTTT, Make.com, or other automation tools to trigger HTTP requests to the same `/api/notes` endpoint.
