# Habit Formation

> "The products that we find most engaging are those that form habits." — Nir Eyal

## The Hook Model

Nir Eyal's four-phase loop that creates product habits:

### 1. Trigger
What prompts the user to act.

**External triggers:**
- Push notifications ("Sarah liked your post")
- Email reminders ("Your weekly report is ready")
- Visual cues (notification badge, red dot)
- Environmental cues (location, time of day)

**Internal triggers:**
- Boredom → open social media
- Uncertainty → search Google
- Loneliness → check messages
- Anxiety → check email

**Design principle:** Start with external triggers, build toward internal triggers over time.

### 2. Action
The simplest behavior in anticipation of a reward.

**Fogg Behavior Model:** Behavior = Motivation × Ability × Prompt

**Reduce friction:**
- Fewer clicks to core action
- Pre-filled fields
- One-tap actions
- Smart defaults
- Save state across sessions

**Increase ability:**
- Progressive onboarding (not upfront)
- Contextual help
- Undo over confirmation
- Familiar patterns (Jakob's Law)

### 3. Variable Reward
Unpredictable positive outcomes that create anticipation.

**Three types:**
- **Rewards of the tribe** (social validation): likes, comments, followers
- **Rewards of the hunt** (resources): new content, deals, information
- **Rewards of the self** (mastery): completion, achievement, skill growth

**Why variable:** Fixed rewards (same every time) stop being motivating. Variable rewards trigger dopamine through anticipation. Social media feeds are powerful because content is always different.

### 4. Investment
User puts something in that improves the next cycle.

**Examples:**
- Adding data (profile, preferences, bookmarks)
- Building reputation (reviews, followers, karma)
- Learning the system (keyboard shortcuts, workflows)
- Creating content (posts, documents, playlists)
- Inviting others (social investment)

**Why it works:** More investment → higher switching cost → stronger habit

## Activation Energy

The effort required to start a behavior. Lower it for desired actions, raise it for undesired ones.

### Reducing Activation Energy (Desired Actions)
```
Make defaults do the right thing
Pre-populate forms with intelligent guesses
Show "Quick start" for common paths
One-click purchase (saved payment)
Auto-save so users never lose progress
```

### Increasing Activation Energy (Undesired Actions)
```
Multi-step delete confirmation for destructive actions
"Are you sure?" only for irreversible actions
Cooling-off period before account deletion
Require explicit opt-in for risky settings
```

## Goal-Gradient Effect

People accelerate behavior as they approach a goal.

**The coffee card experiment:** A 12-stamp card with 2 pre-stamped is completed faster than a blank 10-stamp card, despite same effort required.

### Application in UI

**Progress bars:**
```css
.progress-bar {
  height: 8px;
  border-radius: 4px;
  background: var(--color-neutral-200);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 4px;
  transition: width 0.4s ease-out;
}
```

**Design tactics:**
- Start progress at 10-20% (not zero) — "profile 20% complete"
- Show clear milestones ("3 of 5 steps done")
- Celebrate each milestone, not just completion
- Make remaining effort visible and decreasing
- Use step indicators in multi-step flows

## Variable Ratio Reinforcement

The most addictive reinforcement schedule: rewards come after an unpredictable number of actions.

**How it appears in products:**
- Social media feeds (sometimes great content, sometimes not)
- Email (sometimes important, sometimes not)
- Slot machines (most direct example)
- Pull-to-refresh (what's new?)

**Ethical boundaries:**
- Enhance genuine value, don't manufacture empty engagement
- Let users control notification frequency
- Provide predictable core value alongside variable extras
- Never hide essential information behind engagement loops

## Onboarding for Habit Formation

### Progressive Onboarding
Don't front-load — teach at the moment of need.

**Day 1:** Core action only (the one thing that delivers value)
**Day 2-7:** Secondary features introduced via tooltips
**Week 2-4:** Power features revealed as user demonstrates readiness
**Month 2+:** Advanced workflows, keyboard shortcuts

### Activation Milestones
Identify the behaviors that predict retention:

| Product Type | Activation Milestone |
|---|---|
| Social network | Add 7 friends in 10 days |
| Task manager | Create 3 tasks and complete 1 |
| Analytics | Connect data source |
| Communication | Send first message and get reply |

Focus onboarding on reaching these milestones, not touring features.

## Streaks and Consistency

Streaks leverage loss aversion (fear of breaking the chain).

**Effective streak design:**
- Visual representation (calendar, flame icon)
- Grace period for missed days (freeze, makeup)
- Escalating rewards for longer streaks
- Easy to maintain (low daily minimum)
- Not punitive when broken (easy to restart)

**Anti-pattern:** Making streaks so aggressive that breaking one causes abandonment.

## Notification Design

Notifications are the primary external trigger mechanism.

### Notification Hierarchy
1. **Urgent, actionable:** "Your ride is arriving" — push notification
2. **Important, not urgent:** "Weekly report ready" — badge + email digest
3. **Nice to know:** "Someone liked your post" — in-app only
4. **Marketing:** "Check out new features" — email only, easy unsubscribe

### Notification Principles
- Each notification should provide clear value to the user
- Batch non-urgent notifications (don't interrupt for each)
- Respect Do Not Disturb
- Make all notification types individually controllable
- Decrease frequency as engagement increases (user already comes)
- Use rich notifications (preview content, quick actions)

## Ethical Considerations

### Engagement vs Addiction
| Healthy Engagement | Addiction Pattern |
|---|---|
| User achieves their goal | User loses track of time |
| User feels accomplished after | User feels guilty after |
| Product saves user time | Product consumes all free time |
| User can easily stop | User struggles to stop |
| Clear session boundaries | Infinite scroll, autoplay |

### Ethical Design Practices
- Include usage dashboards ("Your screen time this week")
- Support natural stopping points (end of list, not infinite)
- Allow notification customization
- Don't penalize absence excessively
- Provide value in each session, not just over time
- Make it easy to export data and leave

## Habit Design Checklist

- [ ] Core action is as frictionless as possible (< 3 taps)
- [ ] External triggers are valuable, not annoying
- [ ] Variable rewards exist but enhance genuine value
- [ ] Users invest data/effort that improves future experience
- [ ] Onboarding focuses on activation milestones
- [ ] Progress is visible and celebrated
- [ ] Streaks encourage but don't punish
- [ ] Notifications are controllable and valuable
- [ ] Ethical boundaries are established and respected
