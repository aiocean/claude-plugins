# Gestalt Principles in UI Design

Gestalt psychology describes how humans perceive visual elements as unified wholes rather than collections of parts. The brain actively organizes sensory information into meaningful patterns. For UI designers, Gestalt principles are the grammar of visual perception — master them and you control how users see your interface.

---

## 1. Proximity

**Definition:** Elements placed near each other are perceived as belonging to the same group, regardless of shape or color.

**UI Application:**
- Group related form fields together (name + email in one cluster, address fields in another)
- Place labels directly adjacent to their inputs — not floating in ambiguous space
- Use gaps between navigation sections to signal categorical boundaries
- Card padding creates internal proximity (content belongs to the card) while card margin creates external separation

**CSS Example:**
```css
/* Form field grouping via proximity */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;        /* tight: label belongs to input */
  margin-bottom: 24px;  /* loose: separates groups */
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;       /* medium: fields within a section */
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 40px; /* large: separates sections */
}
```

**Anti-pattern:** Equal spacing between all elements. When label-to-input gap equals input-to-input gap, users can't tell which label belongs to which field. The form reads as a flat list rather than grouped pairs.

---

## 2. Similarity

**Definition:** Elements sharing visual characteristics (color, shape, size, texture, orientation) are perceived as related.

**UI Application:**
- All interactive elements share one color (blue links, blue buttons)
- All destructive actions share a danger color (red delete, red cancel)
- Navigation items use consistent sizing/weight — active state breaks similarity to signal current location
- Data table rows alternate background only when rows span multiple lines (when similarity would hurt scannability)
- Icon families must share the same stroke weight, corner radius, and visual style

**CSS Example:**
```css
/* Similarity through consistent interactive affordance */
.btn-primary,
.link-primary,
.tab-active {
  color: #2563eb;  /* all interactive = blue */
}

/* Breaking similarity for state */
.nav-item {
  color: #6b7280;
  font-weight: 400;
}
.nav-item--active {
  color: #111827;
  font-weight: 600;  /* broken similarity = selected */
}

/* Icon consistency */
.icon {
  width: 20px;
  height: 20px;
  stroke-width: 1.5;  /* all icons same weight */
}
```

**Anti-pattern:** Using color inconsistently — some headings blue for "accent", some blue text as links. Users build a mental model: blue = clickable. Violating this creates confusion and missed interactions.

---

## 3. Continuity (Continuation)

**Definition:** The eye follows the smoothest path. Elements arranged on a line or curve are perceived as related and belonging together.

**UI Application:**
- Horizontal navigation bars — the eye scans left to right along the implied line
- Progress steps use a connecting line to show sequence
- Carousels rely on partially visible cards to imply continuation (peek pattern)
- Timeline components use vertical lines connecting events
- Breadcrumbs use separators (`/` or `>`) to create directional flow

**CSS Example:**
```css
/* Progress stepper with continuation line */
.stepper {
  display: flex;
  align-items: center;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 16px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
}

.step--complete:not(:last-child)::after {
  background: #2563eb; /* continuation shows progress */
}

/* Carousel peek — implies continuation */
.carousel-track {
  display: flex;
  gap: 16px;
  overflow: hidden;
  padding-right: 40px; /* partial card visible at edge */
}
```

**Anti-pattern:** Abrupt endings without visual continuation cues. A carousel where cards are perfectly clipped at the edge gives no hint that more content exists.

---

## 4. Closure

**Definition:** The mind fills in missing information to perceive a complete, familiar shape. Incomplete shapes are "closed" mentally.

**UI Application:**
- Loading spinners use incomplete circles — the brain completes them and perceives rotation
- Icons can use negative space within bounding shapes (a trash icon outlined, not filled)
- Search bars with partial borders still read as containers
- Progress rings only need to show the arc — the full circle is implied
- Hamburger menus (three lines) imply a complete menu object

**CSS Example:**
```css
/* Loading spinner using closure */
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb; /* broken circle implies rotation */
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Circular progress — closure fills the gap */
.progress-ring {
  transform: rotate(-90deg);
}
.progress-ring__track {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 4;
}
.progress-ring__fill {
  fill: none;
  stroke: #2563eb;
  stroke-width: 4;
  stroke-linecap: round;
  /* stroke-dasharray and stroke-dashoffset set via JS */
  transition: stroke-dashoffset 0.3s ease;
}
```

**Anti-pattern:** Using closure when completeness is required for comprehension. Navigation labels should be fully visible — relying on the user to "mentally complete" truncated text creates cognitive load.

---

## 5. Figure-Ground

**Definition:** The visual field is divided into a figure (the subject, in focus) and a ground (the background, receding). The brain alternates between them but focuses on one at a time.

**UI Application:**
- Modals use a darkened overlay (ground) to make the dialog box (figure) pop
- Tooltips float above the page — drop shadows push them forward as figure
- Sticky headers maintain figure status through shadow/border on scroll
- Input focus states (outline/ring) bring the active field forward as figure
- Cards on white backgrounds use shadow or border to establish figure status
- Dark mode: carefully chosen foreground/background prevents figure-ground reversal

**CSS Example:**
```css
/* Modal — classic figure-ground */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5); /* ground: recedes */
  backdrop-filter: blur(4px);
  z-index: 100;
}

.modal-dialog {
  position: relative;
  background: white;            /* figure: advances */
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 101;
  padding: 32px;
}

/* Input focus establishing figure */
.input {
  border: 1.5px solid #d1d5db;
  background: #f9fafb;          /* slightly recessed ground */
  border-radius: 6px;
  padding: 8px 12px;
  transition: all 0.15s;
}

.input:focus {
  border-color: #2563eb;
  background: white;            /* becomes figure */
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  outline: none;
}
```

**Anti-pattern:** Insufficient contrast between figure and ground. A white modal on a white background with only a subtle shadow reads as flat — the figure-ground separation breaks down. Users struggle to perceive modal boundaries.

---

## 6. Common Fate

**Definition:** Elements moving in the same direction are perceived as a group. Shared motion implies relationship.

**UI Application:**
- Accordion sections: only the active section expands — its children (title + content) move together
- Dropdown menus: all items slide in together from the same origin
- Parallax scrolling: layers moving at different speeds imply depth separation
- Drag handles: the element and its shadow move in sync, reinforcing unity
- Toast notifications: stacked toasts shift together when one is dismissed

**CSS Example:**
```css
/* Accordion — content moves with header (common fate) */
.accordion-item {
  overflow: hidden;
}

.accordion-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.accordion-item--open .accordion-content {
  grid-template-rows: 1fr; /* header triggers content to expand together */
}

.accordion-content > div {
  overflow: hidden;
}

/* Toast stack shifting together */
.toast-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.3s ease;
}

.toast {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.toast--dismissed {
  transform: translateX(110%);
  opacity: 0;
}
```

**Anti-pattern:** Animating elements that should be perceived as separate with the same motion. If success and error states animate identically, common fate suggests they are related — users may not distinguish them.

---

## 7. Symmetry

**Definition:** The mind perceives symmetrical compositions as stable, organized, and belonging together. Symmetrical regions are perceived as figures.

**UI Application:**
- Dialog boxes are centered (bilateral symmetry) — conveys stability and importance
- Price comparison tables use symmetric column widths — each option feels equal weight
- Form layouts often mirror left-right for multi-column forms
- Marketing hero sections use centered content for gravitas
- However: asymmetric layouts create dynamism and visual interest for content-heavy pages

**CSS Example:**
```css
/* Centered dialog — bilateral symmetry conveys importance */
.dialog {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
}

.dialog-box {
  width: min(480px, calc(100vw - 48px));
  text-align: center;        /* internal symmetry */
  padding: 40px;
}

/* Symmetric feature comparison */
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* equal columns = equal visual weight */
  gap: 24px;
}

/* Asymmetric layout for dynamism */
.content-layout {
  display: grid;
  grid-template-columns: 2fr 1fr; /* intentional asymmetry = hierarchy */
  gap: 48px;
}
```

**Anti-pattern:** Accidental asymmetry from lazy layout — a form where labels vary in length creates unintentional asymmetry that reads as disorder, not dynamism. Use CSS Grid alignment to create intentional alignment even with variable content.

---

## 8. Common Region

**Definition:** Elements enclosed within the same boundary are perceived as belonging to the same group.

**UI Application:**
- Cards — the most fundamental common region pattern in modern UI
- Panels, sections, and sidebars use borders or backgrounds to create regions
- Data table rows with alternating backgrounds use region to group row data
- Tag/chip collections use pill shapes to create individual regions around each tag
- Modal dialogs, tooltips, and popovers are explicit common regions
- Breadcrumb items can each be wrapped in a region (pill style)

**CSS Example:**
```css
/* Card as common region */
.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  /* The boundary creates the group — all content inside belongs together */
}

/* Subtle region via background */
.sidebar {
  background: #f9fafb;  /* different background = different region */
  padding: 24px;
  /* No border needed — background difference creates region */
}

/* Tag as minimal common region */
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  background: #eff6ff;
  border-radius: 999px;  /* pill = strong region boundary */
  font-size: 0.75rem;
  color: #1d4ed8;
}

/* Nested regions — region within region */
.dashboard-section {
  background: #f3f4f6;  /* outer region */
  padding: 32px;
  border-radius: 16px;
}

.dashboard-section .card {
  background: white;    /* inner region — clearly nested */
}
```

**Anti-pattern:** Regions without clear boundaries — a "section" differentiated only by a heading with no background, border, or padding. Users may not perceive the section boundary and mistake elements above or below as part of it.

---

## 9. Connectedness

**Definition:** Elements that are physically connected are perceived as more strongly related than elements that are merely proximate. A literal visual link (line, shared border) creates the strongest grouping signal.

**UI Application:**
- Flowchart arrows connecting process steps
- Tree/org chart lines connecting nodes to parents
- Step indicators connected by lines (stronger than proximity alone)
- Range sliders: the track connecting the handle to origin
- Linked breadcrumb items separated by connectors
- Network graph edges between nodes

**CSS Example:**
```css
/* Connected timeline */
.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;  /* the connecting line */
}

.timeline-item {
  position: relative;
  padding-bottom: 32px;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -28px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #2563eb;
  border: 2px solid white;
  box-shadow: 0 0 0 2px #2563eb;
}

/* Range slider connectedness */
.range-track {
  position: relative;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
}

.range-fill {
  position: absolute;
  height: 100%;
  background: #2563eb;  /* fill connects thumb to origin */
  border-radius: 2px;
}
```

**Anti-pattern:** Using proximity when connectedness is needed. A "related articles" section placed below content with only a heading to signal relationship is weaker than connecting arrows or linking lines. When relationship is critical to comprehension (e.g., parent-child in a tree), use explicit connectors.

---

## 10. Focal Point

**Definition:** Elements with a point of interest, difference, or emphasis will capture and hold the viewer's attention first.

**UI Application:**
- Primary CTA buttons use a contrasting color in a sea of neutral tones
- Error messages use red to create an immediate focal point
- The hero headline is the largest text on the page — first focal point
- Notification badges (red dot) immediately capture attention
- Empty states use illustration as focal point to draw the eye before text
- Pricing tables highlight the recommended plan with visual distinction

**CSS Example:**
```css
/* CTA as focal point in a neutral header */
.header {
  display: flex;
  align-items: center;
  gap: 32px;
  background: white;
  padding: 0 24px;
}

.nav-link {
  color: #6b7280;   /* neutral — recedes */
  font-weight: 400;
}

.btn-cta {
  background: #2563eb;  /* focal point — advances */
  color: white;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 600;
  /* Only this is saturated — everything else is neutral */
}

/* Highlighted pricing tier */
.pricing-card--featured {
  background: #1e3a8a;
  color: white;
  transform: scale(1.05);  /* size + color + position = maximum focal point */
  box-shadow: 0 20px 40px rgba(30, 58, 138, 0.3);
  position: relative;
  z-index: 1;
}

/* Notification badge — minimal focal point */
.icon-wrapper {
  position: relative;
  display: inline-flex;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 8px;
  height: 8px;
  background: #ef4444;  /* red dot captures eye immediately */
  border-radius: 50%;
  border: 2px solid white;
}
```

**Anti-pattern:** Multiple competing focal points. When a page has five elements all using the same bold color, high contrast, and large size, none of them wins — the eye has nowhere to land. Visual hierarchy requires that focal points are rare and earned through restraint everywhere else.

---

## Applying Gestalt in Practice

**Hierarchy of grouping strength** (strongest to weakest):
1. Connectedness (explicit link)
2. Common region (enclosed boundary)
3. Proximity (closeness)
4. Similarity (shared properties)
5. Continuity (implied line)

**Audit questions:**
- Can you identify what groups together by looking at the layout for 3 seconds?
- Does every element clearly belong to exactly one group?
- Is there one focal point per section/viewport?
- Does your figure clearly separate from its ground at a glance?
- Are interactive elements visually similar to each other and dissimilar from non-interactive elements?

**The override rule:** Connectedness and common region override proximity. Two elements far apart but connected by a line or enclosed in the same card will group before two elements nearby but in separate cards.
