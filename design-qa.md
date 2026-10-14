# Reaction picker visual verification

Scope: the reaction-selection window in `ReactionRow`, using the existing
configurable reaction catalog. The screenshot supplies the layout reference;
production artwork continues to come from `reaction_appearances`.

## Evidence

- Source: `/var/folders/zr/h4kxlfwj00sgt053kx4gz3wm0000gn/T/TemporaryItems/NSIRD_screencaptureui_EAnNHN/Screenshot 2026-10-14 at 15.21.42.png`.
- Preview: http://localhost:6006/iframe.html?id=features-react-reactionrow--picker&viewMode=story&globals=theme:light
- Evidence directory: `/Users/tereshin/.codex/visualizations/2026/10/14/01a13a94-3e37-7201-902e-3b516e9fd5d4/reaction-picker/`.
- Implementation screenshot: `picker-light.jpg` in the evidence directory.
- Full-view side-by-side evidence: `comparison.png`; focused window comparison:
  `comparison-detail.png`, both opened and visually reviewed together.
- Source: 564 × 490 pixels, normalized to 282 × 245 for comparison. The reference
  60-pixel reaction pill corresponds to the existing 30 CSS-pixel pill.
- Implementation: 282 × 245 pixels and CSS viewport, devicePixelRatio 1.
- State: light theme, open picker, 20 active reactions, first scroll position.

## Findings

No remaining P0/P1/P2 findings in the requested window layout.

- Typography: no visible labels for loaded glyphs; 32px emoji and 32 × 32px image
  slots. Accessible labels and text search remain available. Failed images show
  their names in the constrained tile.
- Layout: 252px window, five 50px columns and 50px rows, 176px scroll viewport,
  12px corners, 8px spacing above the trigger. The fourth row is partially visible
  and reachable through scrolling or keyboard navigation. The popup stays inside
  the 282px viewport.
- Colors: the white overlay, subtle border and shadow match the reference window;
  theme tokens also support the dark palette.
- Images: existing emoji/image presentations are preserved. The Storybook fixture
  uses standard emoji; the screenshot's custom artwork and embedded diamond
  badges differ from this fixture. These belong to the configurable artwork,
  rather than picker layout. Image rendering was separately checked at 32 × 32px.
- Content: active catalog order is preserved; retired reactions remain excluded.
  The production reaction catalog is not replaced with the demonstration fixture.

## Comparison history and interactions

1. Initial comparison established the matching five-column geometry. Interaction
   review found that a nonempty ListBox selection prevented Enter from invoking
   the action. The picker now uses `selectionMode="none"`, appropriate for its
   action controls; reaction selection remains controlled by the existing row.
2. The final Storybook scenario passed choosing an item, choosing the same item
   again to remove it, and End/Enter activation of the final item. Final captures
   were compared again after this fix.
3. Arrow navigation and End scrolled the last row into view (scrollTop 24).
   Escape closed the popup and returned focus to the add button. Dark-theme image
   sizing and failed-image labels were also checked in the browser.
4. The initial animation-sensitive Storybook visibility assertion was repaired
   with `waitFor`; no further scenario errors appeared on the final run.

## Implementation checklist

- [x] Replace the text menu with a scrollable five-column picker.
- [x] Keep configured artwork, catalog ordering, guest behavior and pending guards.
- [x] Verify mouse activation, repeated removal, keyboard activation and scrolling.
- [x] Compare final full-view and focused window captures against the source.

final result: passed
