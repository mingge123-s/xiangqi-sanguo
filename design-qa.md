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

## Round 2 — tall-screen art and wiki polish

- User reference: `C:/Users/CHENKA~1/AppData/Local/Temp/codex-clipboard-19092c44-8b97-4d48-968f-e280b8184ab6.png`.
- Combined gameplay comparison: `design-audit/round-2/after/compare-user-gameplay.png`.
- Combined wiki comparison: `design-audit/round-2/after/compare-wiki.png`.
- Accepted tall gameplay: `design-audit/round-2/after/gameplay-430x906.png`.
- Accepted small gameplay: `design-audit/round-2/after/gameplay-360x720.png`.
- Accepted wiki landing/card/search: `design-audit/round-2/after/wiki-top-430x906-final.png`, `wiki-shu-430x906-final.png`, and `wiki-search-430x906.png`.
- Tall-screen command cards move down 14–24 px; the 720 px breakpoint preserves the previous compact rhythm.
- New transparent mountain art was inspected in the home, roster bands, command area, drawer, modal, and wiki without obscuring primary text.
- Wiki search returned exactly one card for `观星`, announced the result count, and cleared correctly.
- Production build, TypeScript, engine tests, and layout tests passed.

final result: passed

## Round 3 — persistent dual qi and general detail hierarchy

- User reference: `C:/Users/CHENKA~1/AppData/Local/Temp/codex-clipboard-a1255e7f-7866-424c-85fa-db718017c09f.png`.
- Combined status comparison: `design-audit/round-3/after/compare-status.png`.
- Combined modal comparison: `design-audit/round-3/after/compare-detail.png`.
- Accepted large captures: `01-game-status-430x906.png` and `05-general-detail-huatuo-430x906.png`.
- Accepted compact captures: `03-game-status-360x720.png` and `04-general-detail-360x720.png`.
- Both `.qi-line` regions are present and expose independent labels for red and black qi; the live test state showed `红 1/20` and `黑 0/20` simultaneously.
- The detail dialog exposes a named icon close control, preserves Escape behavior, and fits without clipping at 360 × 720.
- Faction identity, real seal art, skill badges, qi costs, descriptions, live state, and cast actions were visually rechecked.
- Browser console warnings/errors: none. Production build, TypeScript, engine tests, and layout tests passed.

final result: passed

## Round 4 — split enemy and player qi placement

### Comparison target

- Source visual truth: `C:/Users/CHENKA~1/AppData/Local/Temp/codex-clipboard-aeac931f-720e-4aa8-b0cd-6db02a3905b6.png`.
- Normalized source: `design-audit/round-4/source-normalized-430x906.png`.
- Browser implementation: `design-audit/round-4/after/01-split-qi-430x906-v2.png`.
- Full comparison: `design-audit/round-4/after/compare-split-qi.png`.
- Focused lower-region comparison: `design-audit/round-4/after/compare-split-qi-focus.png`.
- Responsive evidence: `design-audit/round-4/after/02-split-qi-360x720-v2.png`.
- Source pixels: 442 × 855. The app-owned 381 × 802 phone region was cropped and normalized to 430 × 906 with Lanczos resampling.
- Implementation pixels and CSS viewport: 430 × 906 at browser density 1; compact check at 360 × 720.
- State: active red turn, enemy qi 0/20, player qi 1/20, two live skill cards, focused player general.

### Findings

- No actionable P0, P1, or P2 finding remains.
- Typography: the existing calligraphic stack, weight, small numerals, and 20-point tracks remain consistent with the manuscript UI; enemy/player ownership is clearer than the annotation-only source.
- Spacing and layout: enemy qi occupies the original header meter position; player qi sits between the skill row and player portraits inside the marked lower region. The board height is unchanged.
- Colors and tokens: enemy qi uses black ink and player qi uses cinnabar; both remain on the existing rice-paper palette.
- Image quality: all existing portraits, mountain art, paper texture, and seal assets are preserved without replacement or raster degradation.
- Copy: the fixed labels `敌方战气` and `我方战气` remove ownership ambiguity while values remain live engine state.

### Comparison history

- Pass 1 — blocked: at 360 × 720 the added player qi band pushed the player-general names partly below the viewport (P2).
- Fix: tightened only the compact-height command spacing, qi band, and portrait sizes while preserving the board height and 430 × 906 composition.
- Pass 2 — passed: all three portraits, names, both qi meters, skill cards, board, and record control are visible at 360 × 720; the 430 × 906 comparison aligns with the marked target region.

### Primary interactions tested

- Start a match and verify enemy qi is the only meter in the top status header.
- Verify player qi appears between the focused general's skill cards and player portraits.
- Verify accessible live labels for `敌方战气 0/20` and `我方战气 1/20`.
- Verify the 430 × 906 and 360 × 720 responsive layouts.
- Browser console errors/warnings checked: none.

### Follow-up polish

- No P3 follow-up is required for this scoped placement change.

final result: passed

## Round 5 — pending skill target visibility

- User evidence: `design-audit/round-5/01-user-lijian-before.png`.
- Unified effect preview: `design-audit/round-5/02-all-skill-highlights-430x906.png`.
- Compact real-match regression: `design-audit/round-5/03-game-regression-360x720.png`.
- Ten persistent piece effects render a character seal plus semantic-color outer halo: 离、反、啖、鬼、空、武、双、咆、鹰、青.
- 咆哮 and 无双 were added to the board marker system; global and immediate skills retain banners, dice, or immediate resolution.
- Each affected Piece button now exposes the complete effect description instead of the one-character seal alone.
- Deterministic mapping tests: 32 checks passed. Browser console warnings/errors: none.

final result: passed

## Round 6 — command-strip typography alignment

- User reference: `C:/Users/CHENKA~1/AppData/Local/Temp/codex-clipboard-432d4127-86a9-4b08-9e55-13d4025ccae2.png`.
- Accepted preview: `design-audit/round-6/01-command-text-centered-430x720.png`.
- Single-line prompts, wrapped battle logs, and inline prompts with an action button were checked.
- Computed styles confirmed `font-weight: 700`, horizontal centering, and vertical centering for all three cases.
- Production build, engine/layout tests, and browser console checks passed.

final result: passed

## Round 8 — animated ink command broadcast and target trace

### Comparison target

- Selected combined mock: `design-audit/round-8/01-selected-final-target.png` (864 × 1821).
- Normalized target: `design-audit/round-8/13-target-normalized-430x906.png`.
- User-authoritative ink reference: `design-audit/round-8/18-broadcast-ink-reference.png`.
- Final browser implementation: `design-audit/round-8/21-implementation-430x906-final.png` at 430 × 906, density 1.
- Compact layout evidence: `design-audit/round-8/11-implementation-360x720-ink-final.png` at 360 × 720, density 1.
- Full comparison: `design-audit/round-8/23-compare-full-final.png`.
- Focused ink comparison: `design-audit/round-8/24-compare-broadcast-final.png`.
- State: red active turn, 离间 resolved against one dark enemy piece, command scroll expanded, target trace visible, active skill card raised.

### Findings

- No actionable P0, P1, or P2 finding remains.
- Typography: the broadcast uses the existing Chinese serif/display stacks, a large cinnabar skill name, bold two-line rules copy, and centered vertical alignment without truncation.
- Spacing and layout: the command scroll paints through the existing 44 px board slot, so the board, two skill cards, player qi, and all three generals keep their established positions.
- Colors and tokens: the new art maps to pine-soot black, cinnabar, muted jade, and antique gold; skill-card and target accents reuse the game tokens.
- Image quality: the command background, target streak, and tassel are dedicated transparent WebP assets with clean alpha. Existing portraits, paper, mountain, seal, and board assets remain unchanged.
- Copy/content: live engine skill names determine the title; the existing skill hints are condensed into at most two broadcast lines. No decorative mock data enters gameplay.
- Interaction: Framer Motion expands the scroll, blur-reveals its copy, draws the target path, springs the target token, and raises the active skill card. `useReducedMotion` preserves a fully readable static state.

### Comparison history

- Pass 1 — blocked: the original compact splash appeared near the status bar and did not connect the broadcast to its target (P1).
- Fix: moved the resolved-skill broadcast into the board command slot, added target-piece preview, persistent selected-card state, and a generated gold/ink trace.
- Pass 2 — blocked: the first background looked like a light ink cloud and the short trail did not match the selected references (P2).
- Fix: generated a dense dry-brush broadcast plate from the user crop and changed the trace to connect the bottom-center command origin to the marked piece.
- Pass 3 — blocked: the raster brush head overshot the target ring at edge-board positions (P2).
- Fix: calibrated the path geometry to 95.7% of the center-to-center distance while keeping the target ring authoritative.
- Pass 4 — passed: full-view and focused comparisons show the dense horizontal ink scroll, target token/tassel, long gold/ink trace, and raised skill card without clipping persistent controls.

### Primary interactions tested

- Start a real randomized match and verify opening skill broadcasts render inside the board command slot.
- Render a deterministic 离间 state with one target, trace, expanded scroll, and selected skill card.
- Verify 430 × 906 full layout and 360 × 720 compact panel/card layout.
- Verify reduced-motion branches exist for the scroll, copy, target, trace, and card lift.
- Browser console checked after the final production-component render; no current code warning or error remains.

### Follow-up polish

- P3: target-path curvature comes from one raster brush texture, so different board vectors vary by rotation/stretch rather than true Bézier curvature. This is acceptable for the restrained one-shot accent and avoids a heavier canvas/WebGL layer.

final result: passed

## Round 9 — unified command-strip ink background

- User references: `C:/Users/CHENKA~1/AppData/Local/Temp/codex-clipboard-34cd5bba-2cc7-46dc-9e48-a178968c81b1.png` and `codex-clipboard-d90d633f-d41f-4de6-a3b1-c3026ae5b716.png`.
- Accepted comparison preview: `design-audit/round-9/01-unified-ink-background-430x720.png`.
- Normal battle logs, wrapped status copy, inline prompts with a cancel action, turn splashes, and expanded skill broadcasts now share `skill-broadcast-ink.webp`.
- The previous radial paper wash and `ink-command.webp` prompt background are disabled for command masks.
- Computed pseudo-element styles confirmed one background asset, opacity 1, and no legacy `::before` layer. Browser console warnings/errors: none.
- Production build, engine tests, target-state tests, and layout tests passed.

final result: passed
