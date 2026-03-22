---
name: aio-google-workspace
description: Interact with Google Workspace services (Gmail, Drive, Calendar, Sheets, Docs, Tasks) via the gws CLI. Triggers: "send email", "upload to drive", "create event", "read spreadsheet", "standup report", gws, Google Workspace.
---

# Google Workspace (gws CLI)

## Environment
- gws: !`which gws 2>/dev/null || echo "NOT INSTALLED"`
- gws auth: !`gws auth status 2>/dev/null || echo "NOT AUTHENTICATED — run: gws auth login"`

Interact with Google Workspace services using the `gws` CLI tool.

## Prerequisites

- `gws` CLI must be installed and authenticated
- If auth errors occur, run: `gws auth login`

## General Syntax

```bash
gws <service> <resource> <method> --params '<JSON>'
gws <service> +<helper> [args]           # Helper commands (shortcuts)
gws schema <service.resource.method>     # View API schema
```

### Common Flags

| Flag | Description |
|------|-------------|
| `--params '<JSON>'` | URL/query parameters |
| `--json '<JSON>'` | Request body (POST/PATCH/PUT) |
| `--upload <PATH>` | Upload file as media content |
| `--output <PATH>` | Save binary response to file |
| `--format <FMT>` | Output: json (default), table, yaml, csv |
| `--page-all` | Auto-paginate (NDJSON output) |
| `--page-limit <N>` | Max pages (default: 10) |
| `--dry-run` | Validate without sending |

---

## Gmail

### Helpers (preferred for common tasks)

```bash
# Send email
gws gmail +send --params '{"to": "user@example.com", "subject": "Hello", "body": "Message body"}'

# Triage inbox - show unread summary
gws gmail +triage

# Watch for new emails (streaming)
gws gmail +watch
```

### Direct API

```bash
# List messages
gws gmail users messages list --params '{"userId": "me", "maxResults": 10}'

# List with query filter
gws gmail users messages list --params '{"userId": "me", "q": "from:boss@company.com is:unread"}'

# Get a specific message
gws gmail users messages get --params '{"userId": "me", "id": "MESSAGE_ID"}'

# Search emails
gws gmail users messages list --params '{"userId": "me", "q": "subject:invoice after:2025/01/01"}'

# List labels
gws gmail users labels list --params '{"userId": "me"}'

# Modify labels (archive = remove INBOX)
gws gmail users messages modify --params '{"userId": "me", "id": "MSG_ID"}' --json '{"removeLabelIds": ["INBOX"]}'

# List threads
gws gmail users threads list --params '{"userId": "me", "maxResults": 5}'

# Get thread
gws gmail users threads get --params '{"userId": "me", "id": "THREAD_ID"}'
```

---

## Google Drive

### Helpers

```bash
# Upload a file
gws drive +upload --params '{"name": "report.pdf", "parent": "FOLDER_ID"}' --upload ./report.pdf
```

### Direct API

```bash
# List files (recent)
gws drive files list --params '{"pageSize": 10, "orderBy": "modifiedTime desc"}'

# List with fields
gws drive files list --params '{"pageSize": 10, "fields": "files(id,name,mimeType,modifiedTime,size)"}'

# Search files by name
gws drive files list --params '{"q": "name contains '\''report'\''", "pageSize": 10}'

# Search by type
gws drive files list --params '{"q": "mimeType='\''application/pdf'\''", "pageSize": 10}'

# List files in a folder
gws drive files list --params '{"q": "'\''FOLDER_ID'\'' in parents", "pageSize": 20}'

# Get file metadata
gws drive files get --params '{"fileId": "FILE_ID"}'

# Download file
gws drive files get --params '{"fileId": "FILE_ID", "alt": "media"}' --output ./downloaded-file

# Export Google Doc as PDF
gws drive files export --params '{"fileId": "FILE_ID", "mimeType": "application/pdf"}' --output ./doc.pdf

# Create folder
gws drive files create --json '{"name": "New Folder", "mimeType": "application/vnd.google-apps.folder"}'

# Move file to folder
gws drive files update --params '{"fileId": "FILE_ID", "addParents": "FOLDER_ID", "removeParents": "OLD_PARENT_ID"}'

# Share file (anyone with link)
gws drive permissions create --params '{"fileId": "FILE_ID"}' --json '{"role": "reader", "type": "anyone"}'

# Share with specific user
gws drive permissions create --params '{"fileId": "FILE_ID"}' --json '{"role": "writer", "type": "user", "emailAddress": "user@example.com"}'

# Delete file
gws drive files delete --params '{"fileId": "FILE_ID"}'

# Search across all drives
gws drive files list --params '{"q": "fullText contains '\''quarterly report'\''", "includeItemsFromAllDrives": true, "supportsAllDrives": true}'
```

---

## Google Calendar

### Helpers

```bash
# Show upcoming events
gws calendar +agenda

# Create an event
gws calendar +insert --params '{"summary": "Team Standup", "start": "2025-03-20T09:00:00", "end": "2025-03-20T09:30:00"}'
```

### Direct API

```bash
# List upcoming events
gws calendar events list --params '{"calendarId": "primary", "timeMin": "2025-03-17T00:00:00Z", "maxResults": 10, "singleEvents": true, "orderBy": "startTime"}'

# Get event details
gws calendar events get --params '{"calendarId": "primary", "eventId": "EVENT_ID"}'

# Create event with attendees
gws calendar events insert --params '{"calendarId": "primary"}' --json '{
  "summary": "Project Review",
  "start": {"dateTime": "2025-03-20T14:00:00", "timeZone": "Asia/Ho_Chi_Minh"},
  "end": {"dateTime": "2025-03-20T15:00:00", "timeZone": "Asia/Ho_Chi_Minh"},
  "attendees": [{"email": "user@example.com"}]
}'

# Update event
gws calendar events patch --params '{"calendarId": "primary", "eventId": "EVENT_ID"}' --json '{"summary": "Updated Title"}'

# Delete event
gws calendar events delete --params '{"calendarId": "primary", "eventId": "EVENT_ID"}'

# List calendars
gws calendar calendarList list

# Check free/busy
gws calendar freebusy query --json '{
  "timeMin": "2025-03-20T00:00:00Z",
  "timeMax": "2025-03-21T00:00:00Z",
  "items": [{"id": "primary"}]
}'
```

---

## Google Sheets

### Helpers

```bash
# Read values
gws sheets +read --params '{"spreadsheetId": "SHEET_ID", "range": "Sheet1!A1:D10"}'

# Append a row
gws sheets +append --params '{"spreadsheetId": "SHEET_ID", "range": "Sheet1!A:D"}' --json '{"values": [["value1", "value2", "value3", "value4"]]}'
```

### Direct API

```bash
# Get spreadsheet info
gws sheets spreadsheets get --params '{"spreadsheetId": "SHEET_ID"}'

# Read a range
gws sheets spreadsheets values get --params '{"spreadsheetId": "SHEET_ID", "range": "Sheet1!A1:E20"}'

# Write values
gws sheets spreadsheets values update --params '{"spreadsheetId": "SHEET_ID", "range": "Sheet1!A1", "valueInputOption": "USER_ENTERED"}' --json '{"values": [["Name", "Score"], ["Alice", 95], ["Bob", 87]]}'

# Batch read multiple ranges
gws sheets spreadsheets values batchGet --params '{"spreadsheetId": "SHEET_ID", "ranges": ["Sheet1!A:B", "Sheet2!A:C"]}'

# Create new spreadsheet
gws sheets spreadsheets create --json '{"properties": {"title": "New Spreadsheet"}}'

# Clear a range
gws sheets spreadsheets values clear --params '{"spreadsheetId": "SHEET_ID", "range": "Sheet1!A1:Z100"}'
```

---

## Google Tasks

```bash
# List task lists
gws tasks tasklists list

# List tasks in a list
gws tasks tasks list --params '{"tasklist": "TASKLIST_ID"}'

# Create a task
gws tasks tasks insert --params '{"tasklist": "TASKLIST_ID"}' --json '{"title": "Review PR", "notes": "Check the auth changes", "due": "2025-03-20T00:00:00Z"}'

# Complete a task
gws tasks tasks patch --params '{"tasklist": "TASKLIST_ID", "task": "TASK_ID"}' --json '{"status": "completed"}'

# Delete a task
gws tasks tasks delete --params '{"tasklist": "TASKLIST_ID", "task": "TASK_ID"}'

# Create a task list
gws tasks tasklists insert --json '{"title": "Sprint 42"}'
```

---

## Google Docs

```bash
# Get document content
gws docs documents get --params '{"documentId": "DOC_ID"}'

# Create a document
gws docs documents create --json '{"title": "Meeting Notes"}'

# Batch update (insert text)
gws docs documents batchUpdate --params '{"documentId": "DOC_ID"}' --json '{
  "requests": [{"insertText": {"location": {"index": 1}, "text": "Hello World\n"}}]
}'
```

---

## Google Slides

```bash
# Get presentation
gws slides presentations get --params '{"presentationId": "PRES_ID"}'

# Create presentation
gws slides presentations create --json '{"title": "Q1 Review"}'

# Get a specific page/slide
gws slides presentations pages get --params '{"presentationId": "PRES_ID", "pageObjectId": "PAGE_ID"}'
```

---

## Google Chat

```bash
# List spaces
gws chat spaces list

# Send message to space
gws chat spaces messages create --params '{"parent": "spaces/SPACE_ID"}' --json '{"text": "Hello team!"}'

# List messages in space
gws chat spaces messages list --params '{"parent": "spaces/SPACE_ID", "pageSize": 10}'
```

---

## Google People (Contacts)

```bash
# List contacts
gws people people connections list --params '{"resourceName": "people/me", "personFields": "names,emailAddresses,phoneNumbers", "pageSize": 20}'

# Search contacts
gws people people searchContacts --params '{"query": "John", "readMask": "names,emailAddresses"}'
```

---

## Cross-Service Workflows

```bash
# Standup report (today's meetings + open tasks)
gws workflow +standup-report

# Meeting prep (agenda, attendees, linked docs)
gws workflow +meeting-prep

# Convert email to task
gws workflow +email-to-task --params '{"messageId": "MSG_ID"}'

# Weekly digest (meetings + unread count)
gws workflow +weekly-digest

# Announce a Drive file in Chat
gws workflow +file-announce --params '{"fileId": "FILE_ID", "spaceId": "SPACE_ID"}'
```

---

## Schema Discovery

Use `gws schema` to explore any API method's parameters:

```bash
# View method parameters
gws schema drive.files.list
gws schema gmail.users.messages.list
gws schema calendar.events.insert

# Resolve nested references
gws schema calendar.events.insert --resolve-refs
```

---

## Pagination

For large result sets:

```bash
# Auto-paginate all results (NDJSON, one JSON per page)
gws drive files list --params '{"pageSize": 100}' --page-all

# Limit to 5 pages
gws drive files list --params '{"pageSize": 100}' --page-all --page-limit 5

# Add delay between pages (rate limiting)
gws gmail users messages list --params '{"userId": "me"}' --page-all --page-delay 200
```

## Output Formats

```bash
# Table format (human-readable)
gws drive files list --params '{"pageSize": 5}' --format table

# CSV (for spreadsheet import)
gws drive files list --params '{"pageSize": 100}' --format csv

# YAML
gws calendar events list --params '{"calendarId": "primary", "maxResults": 5}' --format yaml
```

## Common Patterns

### Find a file then share it
```bash
# 1. Search for file
gws drive files list --params '{"q": "name = '\''Budget 2025'\''"}' --format table
# 2. Share with team (use fileId from step 1)
gws drive permissions create --params '{"fileId": "FILE_ID"}' --json '{"role": "writer", "type": "user", "emailAddress": "team@company.com"}'
```

### Check inbox then reply
```bash
# 1. Triage unread
gws gmail +triage
# 2. Read specific message (use id from triage)
gws gmail users messages get --params '{"userId": "me", "id": "MSG_ID"}'
# 3. Reply
gws gmail +send --params '{"to": "sender@example.com", "subject": "Re: Original Subject", "body": "Thanks for the update.", "threadId": "THREAD_ID"}'
```

### Morning productivity check
```bash
# Run all three
gws gmail +triage
gws calendar +agenda
gws workflow +standup-report
```

## Errors

| Error | Fix |
|-------|-----|
| `401 Unauthorized` | Run `gws auth login` to re-authenticate |
| `403 Forbidden` | Check scopes — may need broader OAuth consent |
| `404 Not Found` | Verify resource ID (fileId, eventId, etc.) |
| `429 Rate Limit` | Use `--page-delay` for bulk operations |
