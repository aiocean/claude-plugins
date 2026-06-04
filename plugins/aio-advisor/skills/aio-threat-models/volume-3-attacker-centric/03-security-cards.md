# Security Cards

> "Structured serendipity — random card draws force consideration of threat angles you'd never spontaneously generate."
> — Security Cards design philosophy

## Core Concept

A **42-card deck** for threat brainstorming — not a standalone methodology but a **creativity-stimulating elicitation tool**. Security Cards combat **cognitive fixation**: practitioners anchor on familiar threat categories and miss novel threats. Cards introduce randomness (or directed selection) across four dimensions to generate unexpected threat combinations.

## Origin

**Tamara Denning, Batya Friedman, Tadayoshi Kohno**, University of Washington, 2013.

Website: http://securitycards.cs.washington.edu/
Info sheet: https://securitycards.cs.washington.edu/assets/security-cards-information-sheet.pdf
IEEE S&P 2014 poster: https://www.ieee-security.org/TC/SP2014/posters/DENNI.pdf

The deck emerges from **value-sensitive design** and HCI traditions — taking threat modeling beyond pure engineering into sociotechnical reasoning.

## The 42 Cards — Four Dimensions

| Dimension | Card Count | Example Cards |
|---|---|---|
| **Adversary's Motivations** | 13 | Money, Ideology, Revenge, Curiosity, Protection, Malice |
| **Adversary's Resources** | 11 | Technical expertise, Insider access, Physical access, Funding, Time |
| **Adversary's Methods** | 9 | Technical exploit, Social engineering, Physical, Supply chain |
| **Human Impact** | 9 | Privacy, Physical safety, Emotional wellbeing, Financial, Societal |

## Usage Pattern

1. **Team gathers** — diverse stakeholders (users, engineers, security, product)
2. **Draw cards** — random, or selective for known concerns
3. **Provocation** — each card poses a threat prompt (e.g., "Revenge" → disgruntled insider scenario)
4. **Combine cards** — ask how combinations apply to the system
5. **Document threats** — structured output from free-form brainstorm

## The Unique Human Impact Dimension

Most security frameworks ignore **human harm**. Security Cards' Human Impact dimension surfaces:
- Privacy violations
- Physical safety (IoT / medical devices)
- Emotional / psychological harm (stalkerware, doxxing enablers)
- Economic harm to individuals (not just orgs)
- Societal disruption (disinformation, democratic systems)

This makes Security Cards one of the few frameworks natively addressing **sociotechnical threats** — directly relevant to AI ethics, platform governance, and responsible design.

## When to Use

- **Kickstarting threat modeling** for teams unfamiliar with the practice
- **Creative breadth** needed — when STRIDE's 6 categories feel constraining
- **Sociotechnical systems** — AI, social platforms, civic tech
- **Diverse stakeholder workshops** — cards equalize contribution from non-experts
- Inside **hTMM Step 2** (threat generation)
- **Design-phase** reviews (before architecture locks)

## Strengths

- **Stimulates creativity** beyond practitioner's existing knowledge
- **Human Impact dimension is unique** — surfaces harms other frameworks miss
- **Low barrier** for non-expert participants
- **Short setup time** — minutes, not hours
- **Physical artifact** — tangible, shuffleable, memorable

## Limitations

- **No completeness guarantee** — random selection is probabilistic
- **Output needs structure** — free-form threats require a subsequent method to organize
- **Effectiveness scales with diversity** — homogeneous team reduces benefit
- **42 cards can't enumerate everything** — particularly novel technical TTPs
- **Physical deck friction** — digital workflows need scanned versions

## Relation to Other Frameworks

- **hTMM** — uses Security Cards as Step 2 threat generation engine
- **PnG** — complementary; Cards expand the attacker archetype space
- **LINDDUN** — Human Impact dimension overlaps privacy harms
- **Ethics canvases (ethicscanvas.org, MoralIT)** — philosophical cousins
- **Value Sensitive Design (Friedman)** — Denning's advisor; methodological parent

## References

- Denning, T., Friedman, B., Kohno, T. (2013). *Security Cards*. University of Washington. http://securitycards.cs.washington.edu/
- Information sheet: https://securitycards.cs.washington.edu/assets/security-cards-information-sheet.pdf
- IEEE S&P 2014 poster: https://www.ieee-security.org/TC/SP2014/posters/DENNI.pdf
- Shevchenko, N. (2018). *Threat Modeling: 12 Available Methods*. CMU/SEI blog.
