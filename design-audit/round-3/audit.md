# Round 3 Dual-Qi and General Detail Audit

## Audit scope

- Active-match status header at 430 × 906 and 360 × 720.
- General detail dialog at 430 × 906 and 360 × 720.
- Live red/black qi values, current-side emphasis, modal controls, skill metadata, costs, live state, and cast action.

## User goal

Keep both sides' qi visible at all times and improve the visual hierarchy of the general detail panel without weakening the existing command-manuscript art direction or reducing the board area on compact screens.

## Risks found

- The original header displayed only red qi, so the opponent economy was invisible even during the black turn.
- The original modal treated portrait, identity, badges, cost, description, and state with nearly equal weight.
- The text-only close control was visually disconnected from the portrait header.
- Skill cards had no strong visual anchor and were harder to scan quickly.

## Implemented opportunities

- Added persistent red and black qi rows with separate values, 20-point tracks, faction-appropriate ink colors, and current-turn emphasis.
- Kept the status header at the existing 64 px height (54 px at the compact-height breakpoint), preserving the board layout.
- Rebuilt the detail header as a faction-colored 武将志 identity block with a larger portrait and an icon-based close target.
- Added a compact skill count/state summary, real distressed seal art for each skill, grouped badges, a dedicated qi-cost strip, and clearer live/cast states.
- Preserved semantic dialog labeling, Escape close behavior, accessible close naming, and explicit red/black qi labels.

## Accepted evidence

- Header comparison: `after/compare-status.png`.
- General detail comparison: `after/compare-detail.png`.
- Accepted 430 × 906 gameplay and detail: `after/01-game-status-430x906.png`, `after/05-general-detail-huatuo-430x906.png`.
- Accepted 360 × 720 gameplay and detail: `after/03-game-status-360x720.png`, `after/04-general-detail-360x720.png`.

## Evidence limits

- Randomized rosters and opening skills differ between captures; the same 华佗 detail content was used for the modal comparison, while surrounding roster state differs.
- Full WCAG conformance is not claimed; semantic labels, visible focus, small-screen fit, contrast, and control behavior were checked in this pass.

## Result

No actionable P0, P1, or P2 issue remains in the audited surfaces.

