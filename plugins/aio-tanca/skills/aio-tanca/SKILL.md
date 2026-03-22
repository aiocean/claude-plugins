---
name: aio-tanca
description: Manage employee timekeeping, shifts, and attendance via tanca-mcp (auto-installs if missing). Triggers: "check in", "check out", "list employees", "get shift", tanca, HR timekeeping, attendance.
---

# Tanca Skill

Employee timekeeping and HR operations via [nguyenvanduocit/tanca-mcp](https://github.com/nguyenvanduocit/tanca-mcp).

## Environment

- Go: !`which go 2>/dev/null || echo "NOT INSTALLED"`
- tanca-mcp: !`which tanca-mcp 2>/dev/null || echo "NOT INSTALLED"`
- tanca-cli: !`which tanca-cli 2>/dev/null || echo "NOT INSTALLED"`
- TANCA_TOKEN: !`[ -n "$TANCA_TOKEN" ] && echo "SET" || echo "NOT SET"`
- TANCA_SHOP_ID: !`echo ${TANCA_SHOP_ID:-NOT SET}`
- TANCA_BRANCH_ID: !`echo ${TANCA_BRANCH_ID:-NOT SET}`
- MCP configured: !`cat .mcp.json 2>/dev/null | grep -q tanca && echo "YES" || echo "NO"`

## Install (skip if already installed above)

```bash
go install github.com/nguyenvanduocit/tanca-mcp@latest
go install github.com/nguyenvanduocit/tanca-mcp/cmd/tanca-cli@latest
```

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "tanca": {
      "command": "tanca-mcp",
      "env": {
        "TANCA_TOKEN": "Bearer your-token-here",
        "TANCA_SHOP_ID": "12345"
      }
    }
  }
}
```

Values needed: `TANCA_TOKEN` (format: `Bearer your-token-here`), `TANCA_SHOP_ID` (auto-fetched if omitted), `TANCA_BRANCH_ID` (optional). Restart Claude Code after configuring.

## MCP Tools (prefix: `tanca_`)

### Employee Management

| Tool | Usage |
|------|-------|
| `tanca_list_employees` | `()` — all employees |
| `tanca_list_timekeeping_employees` | `()` — employees requiring timekeeping |

### Shift Management

| Tool | Usage |
|------|-------|
| `tanca_list_shifts` | `()` — all shift assignments |
| `tanca_get_shift_summary` | `(employee_id: "123")` |
| `tanca_get_today_shift` | `(employee_id: "123")` |

### Check-in / Check-out

```
tanca_check_in(employee_id: "123")
tanca_check_out(employee_id: "123")
```

### Clock Logs

```
tanca_get_clock_logs(employee_id: "123", from: "2025-01-01", to: "2025-01-31")
```

### Shop Info

```
tanca_get_shop_info()
```

## CLI (fallback if MCP not configured)

```bash
tanca-cli list-employees --env .env
tanca-cli list-timekeeping-employees --env .env
tanca-cli list-shifts --env .env
tanca-cli get-shift-summary --employee-id 123 --env .env
tanca-cli get-today-shift --employee-id 123 --env .env
tanca-cli check-in --employee-id 123 --env .env
tanca-cli check-out --employee-id 123 --env .env
tanca-cli get-clock-logs --employee-id 123 --from 2025-01-01 --to 2025-01-31 --env .env
tanca-cli get-shop-info --env .env
```

Flag: `--env` path to .env file with credentials.

## Workflows

### Daily Attendance Check
1. `tanca_list_timekeeping_employees()` — who needs to clock in
2. `tanca_get_today_shift(employee_id: "123")` — check expected shift
3. `tanca_get_clock_logs(employee_id: "123", from: "2025-01-15", to: "2025-01-15")` — verify attendance

### Monthly Report
1. `tanca_list_employees()` — get all employees
2. For each employee: `tanca_get_clock_logs(employee_id: "...", from: "2025-01-01", to: "2025-01-31")`
3. `tanca_get_shift_summary(employee_id: "...")` — compare expected vs actual
