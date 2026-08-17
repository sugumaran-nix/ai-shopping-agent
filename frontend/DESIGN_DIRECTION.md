# Frontend redesign direction

## References reviewed
- Awwwards Typography in Web Design: https://www.awwwards.com/awwwards/collections/typography-in-web-design/
- Recent / Godly referral gallery: https://recent.design/?ref=godly

## Patterns to adapt
- Use a restrained editorial composition: oversized headline, strong hierarchy, generous whitespace, and short supporting copy.
- Use dark ink tones with a warm off-white canvas and a singular electric accent instead of a generic blue-on-gray dashboard.
- Make the primary action visually dominant, with clear state changes for loading, invalid input, and completed search.
- Introduce thin rules, compact uppercase metadata, pill filters, and card surfaces with deliberate borders rather than heavy shadows.
- Use subtle motion cues only: ambient gradient/mesh, hover lift, shimmer loading, and micro-interactions that respect prefers-reduced-motion.
- Keep navigation and controls quiet, consistent, and accessible; the visual drama should serve the search and comparison task.
- Results should feel like an editorial product catalogue: source identity, live/cached status, price emphasis, and external link affordance are easy to scan.

## Product-specific design decision
The redesign will preserve the existing API contracts and callbacks. It will restyle the shell, hero/search, onboarding/key modal, loading/error states, recommendation card, source sections, product rows, and footer. No backend files or data-fetching behavior will be changed.
