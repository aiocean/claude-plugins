# Alerting & Sustainable On-Call

## The Actionability Principle

Google SRE philosophy: **every time the pager goes off, you should be able to react with urgency**.

The ultimate test: **Would I wake someone up for this?**

### Alert Validation Questions
- Can I take action in response?
- Is that action urgent, or could it wait until morning?
- Could the action be safely automated?
- Will that action be a long-term fix or just a workaround?
- Are others getting paged for the same issue?

If you can't answer yes to urgency and no to automation, the alert shouldn't page.

## Symptom vs Cause-Based Alerting

**Cause-based alerting:**
- Monitors specific technical conditions: CPU > 90%, disk > 85%
- Attempts to enumerate all possible failure causes
- Creates alert debt as systems evolve

**Symptom-based alerting:**
- Monitors user-visible impact: errors, latency, availability
- Focuses on what users experience regardless of cause

**Why symptoms win:** Cause-based alerts are "snapshots of our mental models about system failure"—you cannot enumerate every cause, but you can monitor the symptoms of any cause.

**Strategy:**
- Alert on symptoms for paging
- Monitor causes for diagnostics

## SLO-Based Alerting with Burn Rates

**Burn rate** = How fast you're consuming error budget relative to SLO window.

| Burn Rate | Meaning | Example Action |
|-----------|---------|----------------|
| 1.0× | Budget depletes exactly at window end | Normal operation |
| 6× | Budget depletes in 1/6 the time | Ticket, investigate today |
| 14.4× | Budget depletes in 1/14.4 the time | Page immediately |

### Multi-Window Alerting

Combine:
- **Fast alerts** (short window, high burn rate): Catch major incidents quickly
- **Slow alerts** (long window, lower burn rate): Catch persistent issues that accumulate

Example:
- Page: 5% budget consumed in 1 hour (14.4× burn rate)
- Ticket: 10% budget consumed in 6 hours (6× burn rate)

### Calculating Burn Rate Thresholds

For 30-day window with 99.9% SLO (0.1% error budget = 43.2 min):

| Alert | Budget Consumed | Time Window | Burn Rate |
|-------|-----------------|-------------|-----------|
| Page | 2% | 1 hour | 14.4× |
| Page | 5% | 6 hours | 6× |
| Ticket | 10% | 3 days | 1× |

## Alert Fatigue: The Silent Killer

Alert fatigue occurs when volume, false positives, or repetition desensitizes responders.

Hospital study: Systems generating alerts for ~50% of all prescriptions led staff to ignore a 3800% medication overdose alert.

### Warning Signs
- Increasing mean time to acknowledge
- High false positive rates
- Delayed acknowledgments
- Engineers reporting on-call stress

### Prevention Strategies
- **Aviation model**: Only ~10% of flights generate any alerts
- **Tier priorities**: A 0.1% issue shouldn't look like a 3800% issue
- **Clear action paths**: Every alert needs documentation links
- **Consolidation**: Deduplicate across systems
- **Regular audits**: Prune alerts that aren't actionable

## Runbook Design

Runbooks bridge alerts to resolution.

### Key Characteristics
- **Actionability first**: Trigger → Verify → Remediate → Validate
- **Minimalism**: Engineers at 2 AM need fast results, not lectures
- **Clear escalation**: When, to whom, after what duration
- **Living documents**: Update after each incident reveals gaps

### Runbook Template

```markdown
# Alert: [Alert Name]

## Summary
[One-line description of what this alert means]

## Severity
[Page/Ticket/Informational]

## Prerequisites
- Required permissions
- Required tools/access

## Verification
1. [How to confirm this is a real problem]
2. [Commands to run]
3. [What output indicates the problem]

## Remediation
1. [Step one]
2. [Step two]
3. [Step three]

## Validation
- [How to confirm the fix worked]
- [What metrics/logs to check]

## Rollback
- [If remediation makes things worse]

## Escalation
- After [X minutes], escalate to [team/person]
- Contact: [slack channel/phone]

## Related
- [Link to dashboard]
- [Link to related docs]
- [Previous incident postmortems]
```

## Alert Hygiene

### Regular Review Process
- Weekly: Review all alerts that fired
- Monthly: Audit alert-to-incident ratio
- Quarterly: Full alert inventory review

### Questions for Each Alert
- Did this alert lead to action?
- Was the action urgent?
- Could we have automated the response?
- Did multiple alerts fire for the same issue?
- Was the runbook helpful?

### Pruning Criteria
Delete alerts that:
- Have >50% false positive rate
- Never lead to action
- Duplicate other alerts
- Monitor things no one owns
- Haven't fired in 6+ months (review if still needed)

## On-Call Best Practices

### Rotation Health
- Maximum 1 week shifts
- Minimum 2 people per rotation
- Handoff documentation required
- Follow-the-sun if possible

### During Incidents
- One person commands, others support
- Communicate in incident channel
- Regular status updates
- Don't blame, gather facts

### After Incidents
- Blameless postmortems
- Action items with owners
- Update runbooks
- Review alert effectiveness
- Track patterns across incidents

## Anti-Patterns

- **Crying wolf**: Alerts that page for non-urgent issues
- **Alert storms**: Cascading alerts from single root cause
- **Ghost alerts**: No one knows why they exist
- **Heroics**: Relying on individual knowledge instead of runbooks
- **Adding alerts after every incident**: Without pruning existing ones
- **Alerting on everything**: "Just in case" alerts
- **No owner**: Alerts that page teams who can't act
