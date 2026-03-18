---
name: aio-tanca
description: This skill should be used when the user asks to check in, check out, list employees, get shift, view clock logs, timekeeping, attendance, or mentions tanca, employee schedule, shift management, HR timekeeping. Auto-installs tanca-mcp if missing.
---

# Tanca Skill

Employee timekeeping and HR operations via [nguyenvanduocit/tanca-mcp](https://github.com/nguyenvanduocit/tanca-mcp).

## Step 1: Check Availability

1. Use `ToolSearch("tanca")` to look for tools prefixed with `tanca_`
2. If tanca tools are found → skip to **Step 3: Use Tools**
3. If no tools found → check: `which tanca-cli`
4. If CLI exists → skip to **Step 4: Use CLI**
5. If neither → proceed to **Step 2: Install**

## Step 2: Install

### 2a. Install via Go

```bash
go install github.com/nguyenvanduocit/tanca-mcp@latest
go install github.com/nguyenvanduocit/tanca-mcp/cmd/tanca-cli@latest
```

### 2b. Environment Variables

**Ask the user for:**

- `TANCA_TOKEN` — Bearer token for Tanca API (format: `Bearer your-token-here`)
- `TANCA_SHOP_ID` — Shop ID (optional, auto-fetched if not provided)
- `TANCA_BRANCH_ID` — Branch ID (optional)

```bash
export TANCA_TOKEN="Bearer your-token-here"
export TANCA_SHOP_ID="12345"
export TANCA_BRANCH_ID="67890"
```

### 2c. Configure as MCP Server (optional)

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

## Step 3: Use MCP Tools

### Employee Management

```
# List all employees
tanca_list_employees()

# List employees requiring timekeeping
tanca_list_timekeeping_employees()
```

### Shift Management

```
# List all shift assignments
tanca_list_shifts()

# Get shift summary for an employee
tanca_get_shift_summary(employee_id: "123")

# Get today's shift for an employee
tanca_get_today_shift(employee_id: "123")
```

### Check-in / Check-out

```
# Record check-in
tanca_check_in(employee_id: "123")

# Record check-out
tanca_check_out(employee_id: "123")
```

### Clock Logs

```
# Get clock logs for an employee
tanca_get_clock_logs(employee_id: "123", from: "2025-01-01", to: "2025-01-31")
```

### Shop Info

```
# Get shop information
tanca_get_shop_info()
```

## Step 4: Use CLI

```bash
# List employees
tanca-cli list-employees --env .env

# List timekeeping employees
tanca-cli list-timekeeping-employees --env .env

# List shifts
tanca-cli list-shifts --env .env

# Get shift summary
tanca-cli get-shift-summary --employee-id 123 --env .env

# Get today's shift
tanca-cli get-today-shift --employee-id 123 --env .env

# Check in
tanca-cli check-in --employee-id 123 --env .env

# Check out
tanca-cli check-out --employee-id 123 --env .env

# Get clock logs
tanca-cli get-clock-logs --employee-id 123 --from 2025-01-01 --to 2025-01-31 --env .env

# Get shop info
tanca-cli get-shop-info --env .env
```

### CLI Flags

| Flag | Description |
|------|-------------|
| `--env` | Path to .env file with credentials |

## Common Workflows

### Daily Attendance Check

1. `tanca_list_timekeeping_employees()` — who needs to clock in
2. `tanca_get_today_shift(employee_id: "123")` — check expected shift
3. `tanca_get_clock_logs(employee_id: "123", from: "2025-01-15", to: "2025-01-15")` — verify attendance

### Monthly Report

1. `tanca_list_employees()` — get all employees
2. For each employee: `tanca_get_clock_logs(employee_id: "...", from: "2025-01-01", to: "2025-01-31")`
3. `tanca_get_shift_summary(employee_id: "...")` — compare expected vs actual
