# Round 5 Pending Skill Target Audit

## Audit scope

- Piece-targeted skills that remain active after selection and before later resolution.
- Existing corner seals, board prompt, visual salience, color semantics, responsive fit, and assistive labels.

## User goal and accessibility target

When a skill such as 离间 is armed, the affected piece must be immediately discoverable on the board without matching a sentence to a tiny corner mark. The state must remain understandable without relying on color alone.

## Accepted evidence

1. User-provided live 离间 state: `01-user-lijian-before.png`.
2. Deterministic board preview covering all ten piece-target effects: `02-all-skill-highlights-430x906.png`.
3. Real-match compact regression: `03-game-regression-360x720.png`.

## Strengths retained

- Skill prompts already explain the consequence of 离间、反间、鬼才、青囊、啖睛 and 奇袭.
- Gold target rings already make the pre-cast selection stage discoverable.
- Corner seals already encode abbreviated skill identity and do not reveal hidden piece identities.
- Reduced-motion handling is already present globally.

## UX risks found

- The original `离` seal occupied only a small part of the piece corner and used the same black treatment as every other mark.
- The prompt explained the rule but did not establish a strong visual link to the affected piece.
- 咆哮 and 无双 had gameplay restrictions but no dedicated skill seal in the board status system.
- Helpful and harmful effects shared nearly identical treatment, increasing recognition time on a dense board.

## Accessibility risks found

- The original distinction depended on reading a very small glyph.
- Piece buttons did not expose the full active-effect description in their accessible name.
- The prompt-to-target relationship could not be inferred from color or position alone.

## Implemented opportunities

- Every active piece effect now combines a larger skill-character seal with a high-contrast breathing outer ring.
- Harmful, control, guard, command, intelligence, and support effects use separate semantic colors while retaining the unique character seal.
- Added missing 咆哮 and 无双 piece markers.
- Added full accessible labels such as `离间标记：改走其他棋将随机失去一子` to the affected piece button.
- Centralized the priority rules so overlapping effects consistently show the most urgent status.

## Effect coverage

- Threat: 离间、反间、啖睛.
- Control: 鬼才.
- Guard: 空城、武圣、无双.
- Command: 咆哮.
- Intelligence: 鹰视.
- Support: 青囊.
- Global or immediate effects such as 奇袭、刚烈、龙魂 and 归心 remain represented by their existing board banner, dice animation, or immediate resolution because they do not leave one persistent target piece.

## Evidence limits and verification gaps

- The full matrix is a deterministic rendering of the production Board and Piece components, used to avoid waiting for randomized general deals and eight-point qi setup for every skill.
- Engine tests verify each pending-effect mapping; the audit does not claim full screen-reader or WCAG conformance.

## Result

No actionable P0, P1, or P2 issue remains in the scoped piece-target feedback.
