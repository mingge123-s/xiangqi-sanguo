# Design QA

## Comparison target

- Source visual truth: `I:/ai/agent/xiangqi3d/xiangqi-sanguo/design-audit/selected/option-3.png`
- Browser-rendered implementation: `I:/ai/agent/xiangqi3d/xiangqi-sanguo/design-audit/after/gameplay-selected-final.png`
- Combined full-view evidence: `I:/ai/agent/xiangqi3d/xiangqi-sanguo/design-audit/after/compare-final.png`
- Local implementation URL: `http://127.0.0.1:5173/xiangqi-sanguo/`
- Viewport: 390 × 844 CSS px
- Source pixels: 853 × 1844, normalized to 390 × 844 with Lanczos downsampling
- Implementation pixels: 390 × 844 at browser density 1
- State: active red turn, one red piece selected, legal destination visible, bottom general selected, two skill actions visible

The source mock uses illustrative roster/qi values (关羽、赵云、吕布 and 4/20). The implementation intentionally uses the real randomized roster, live qi economy, and true skill availability. Fidelity is judged on layout, hierarchy, state treatment, art direction, and interaction rather than forcing mock-only game data.

## Findings

- No actionable P0, P1, or P2 findings remain.
- [P3] The generated command ink stroke has slightly more landscape detail than the flatter source stroke. It stays within the selected ink-wash art direction, keeps text legible, uses a real transparent raster asset, and does not affect layout or interaction.

## Required fidelity surfaces

- Fonts and typography: calligraphic display stack, larger status labels, readable 12–22 px control text, and hierarchy match the source. Dynamic long skill text remains contained without clipping.
- Spacing and layout rhythm: status manuscript, enemy portrait row, tall centered board, adjacent command strip, two wide skill actions, and selected bottom general align closely with the normalized source. No persistent control is clipped at 390 × 844 or 360 × 720.
- Colors and visual tokens: warm rice paper, cinnabar turn/selection accents, jade legal targets, aged wood, muted ink, and semantic ready/rest states map to the source palette with sufficient contrast.
- Image quality and asset fidelity: existing real general portraits are retained; Phosphor icons are used for the record book and caret; the missing command brush and distressed cinnabar skill seal were generated as transparent WebP assets rather than recreated with CSS/SVG; no PNG is shipped in the production bundle.
- Copy and content: fixed UI copy is concise and standalone. Dynamic skill, qi, turn, battle-log, and roster copy reflect actual engine state rather than decorative mock data.
- Accessibility: semantic buttons/regions and labels are present; modal/drawer close on Escape; focus indicators, reduced-motion support, 44 px primary targets, and readable modal typography were verified.

## Focused region evidence

- Top status: turn, 20-point qi track, and record control were checked at 390 × 844 and 360 × 720.
- Board interaction: selected-piece double halo, jade legal target, captured rails, and last-move/skill states were checked after real clicks.
- Command area: enabled, disabled, selected, passive/start-skill, long-press detail, and bottom general focus states were checked.
- Overlays: battle report drawer and general detail sheet were opened, read, closed by controls, and closed by Escape behavior in code.
- Generated ink asset: checked in the final browser render for transparency, layering, text contrast, and source-art-direction fit.

## Comparison history

### Pass 1 — blocked

- P2: board was about 15 px too short and command actions began about 40 px too high compared with the source.
- P2: browser focus rendered as a square jade outline around the circular selected piece.
- Fixes: introduced a 1.04 vertical board-cell ratio, recalibrated the board stage to 470 px at the target viewport, and made the piece focus ring circular/gold.
- Post-fix evidence: `design-audit/after/gameplay-390x844-v2.png`.

### Pass 2 — blocked

- P2: the command message lacked the source's deep horizontal ink stroke, weakening hierarchy and contrast.
- Fixes: generated a dedicated transparent sumi-e command asset, converted it to optimized WebP, bound it through Vite, added an isolated stacking context, and switched command text to high-contrast parchment white.
- Post-fix evidence: `design-audit/after/gameplay-selected-final.png`.

### Pass 3 — passed

- Full normalized comparison: `design-audit/after/compare-final.png`.
- Typography, layout rhythm, palette, image quality, icons, copy, selection, legal target, dynamic skill availability, and overlay interactions were rechecked.
- No actionable P0/P1/P2 differences remain.

## Primary interactions tested

- Start a match.
- Complete the opening 观星 selection flow when dealt 诸葛亮.
- Select a normal red piece, show a legal destination, make the move, and allow the AI turn to complete.
- Change the focused bottom general and open general details.
- Open and close the battle report drawer.
- Verify live ready/rest/passive skill states.
- Verify the layout at 390 × 844 and 360 × 720.
- Browser console errors/warnings checked: none.

## Follow-up polish

- P3 only: a later art pass could produce a flatter, less scenic command brush if an even stricter literal match is desired.

final result: passed
