# Round 2 Combined UX and Visual Audit

## Audit scope

- Home screen, 430 × 906.
- Active match, 430 × 906 and 360 × 720.
- General detail modal and battle report drawer.
- Wiki landing, rules, general cards, search, and mobile navigation.

## User goal and accessibility target

Refine the selected command-manuscript direction, move the tall-screen skill row slightly lower, add more cohesive art, and make the wiki easier to navigate without harming the compact 360 × 720 match layout. Interactive controls should retain clear labels, visible keyboard focus, readable contrast, and 44 px-class primary targets.

## Strengths retained

- The board remains the dominant gameplay surface.
- Live roster, qi, skill readiness, and reveal states remain driven by the game engine.
- Existing portraits and semantic faction colors stay consistent across the game and wiki.
- Status, general detail, and battle report controls keep semantic labels and Escape behavior.

## UX and visual risks found

- On 430 × 906, the skill cards sat too close to the board message and left a visually empty band before the portraits.
- The original enemy and player bands used an abstract ink patch that could obscure the middle portrait.
- Disabled skill cards were visually too faint.
- The battle report header and entries had weak hierarchy at low event counts.
- The wiki had no direct return-to-game affordance, no search, no result feedback, and a dense rules-first opening.
- The original wiki used production-only absolute portrait URLs and had no compact mobile route back to the match.

## Accessibility risks found

- Wiki discovery relied only on long-page scrolling and anchor links.
- Search result state was not available because search did not exist.
- The original wiki mobile page required a long scroll to return to the game.

## Implemented opportunities

- Tall screens now shift the skill row down by 14–24 px while the 720 px breakpoint stays unchanged.
- A generated transparent ink-mountain panorama unifies home, roster bands, command area, result, modal, drawer, and wiki cards.
- Disabled skill labels gained contrast; ready skills gained a stronger raised state.
- Battle report entries now expose a numbered sequence, side label, total count, and clearer manuscript heading.
- Wiki now includes return navigation, 13/4/26 overview metrics, a searchable/filterable roster, live result count, clear action, rules summary, sticky faction navigation, and a mobile return dock.
- Wiki portrait URLs are now deployment-relative.

## Evidence limits and verification gaps

- Randomized rosters and start skills produce different names and splash messages across captures; layout and state treatment were compared rather than fixed mock data.
- Full WCAG conformance was not claimed; this pass verifies visible focus, semantic labels, target sizing, responsive reflow, and basic contrast by inspection.

## Accepted evidence

- User-reference/game comparison: `after/compare-user-gameplay.png`.
- Wiki before/after comparison: `after/compare-wiki.png`.
- Tall gameplay: `after/gameplay-430x906.png`.
- Small gameplay: `after/gameplay-360x720.png`.
- Battle report: `after/battle-log-430x906.png`.
- Wiki landing: `after/wiki-top-430x906-final.png`.
- Wiki general cards: `after/wiki-shu-430x906-final.png`.
- Wiki search: `after/wiki-search-430x906.png`.

## Result

No actionable P0, P1, or P2 issue remains in the audited surfaces.
