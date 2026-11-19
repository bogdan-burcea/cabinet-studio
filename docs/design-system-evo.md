# eBay Evo integration

The user explicitly requested a complete application of eBay Playbook to the current simple editor. Implemented locally on 18 November 2026 using the official `@ebay/skin` package, pinned to 19.39.0. No cabinet feature, canonical geometry, native schema or autosave key changes are part of this integration.

## Primary sources studied

- [eBay Playbook](https://playbook.ebay.com/) and [design tokens](https://playbook.ebay.com/design-system/tokens): core, semantic and component tokens; paired foreground/background colours; theme mappings.
- [Typography in digital](https://playbook.ebay.com/foundations/typography/using-type-in-digital): Market Sans; title hierarchy; 14 px body, 12 px captions and signal treatment.
- [Object styles](https://playbook.ebay.com/foundations/object-styles-in-product): component borders, 8/16/24 px radii, round buttons, circular icon buttons and shadow roles.
- [Icon buttons](https://playbook.ebay.com/design-system/components/icon-button), [dropdown](https://playbook.ebay.com/design-system/components/dropdown), [accordion](https://playbook.ebay.com/design-system/components/accordion) and [segmented buttons](https://playbook.ebay.com/design-system/components/segmented-button).
- [Official Evo CSS](https://opensource.ebay.com/evo-web/evo-css-components) and its component markup/source: Skin is framework-independent CSS and supports native semantic controls. React wrapper packages are not required to use the official components.

## Implementation boundary

`main.tsx` imports official core/light tokens, global/typography, buttons, icon buttons, textboxes, native select, details, fields, segmented buttons, tooltips and section notices. The original `styles.css` and `simple.css` are retained as historical source but are not imported by the current entry point. `evo.css` owns only application layout/composition and CAD-specific UI; control internals come from Skin. Current scope remains one cabinet with fixed shelves and vertical dividers.

`ui/components.tsx` is the replaceable adapter for native Skin buttons, icon-button tooltips, inspector sections and semantic notices. Numeric fields use `textbox`/`textbox__control`, the preset select follows Skin markup and its official 12 px trailing chevron, and the camera presets use the official segmented-button structure. Collapsible groups retain their accessible native details/summary behaviour and use Skin's disclosure classes. Openings remains collapsed initially. Backspace, Undo, save/load and contextual selection are preserved.

`evo-dark.generated.css` is generated from the installed official dark token declarations. The only change is selector scoping to the app's explicit dark toggle, because Skin's original dark bundle follows the OS media query. Primitive/light tokens remain direct package imports. No separate hand-picked dark palette is maintained.

Market Sans Regular/Bold are self-hosted from the exact official URLs in Skin's `marketsans.css`, so runtime external requests are unnecessary. Font weights match that upstream font-face declaration. Font assets remain eBay intellectual property; the open-source code license is not relabelled as a font license.

`public/assets/evo-icons.svg` contains unmodified official icon paths. Application actions map to those icons (including download for local Save); Redo mirrors Undo. `scripts/sync-ebay-design.mjs` regenerates the icon subset and dark token mapping after a deliberate package upgrade. Upstream code attribution/license is retained in `public/assets/Ebay-Evo-LICENSE.txt`.

The 3D canvas is an application-specific extension: it reads Evo's resolved semantic background, foreground, selection and border tokens through `evo-viewport.ts`. CAD geometry, picking references, units and finish identity remain independent of theme. Standard cabinet editing is not replaced with marketplace flows or eBay branding.

## Verification

136 regression tests and TypeScript/Vite build pass. Font files have valid WOFF2 signatures; every mapped interface icon reference resolves. Local browser inspection confirms both Market Sans faces registered/loaded, 40 px icon controls and 8 px field corners. Numeric size changes, native preset selection and Undo restored the original cabinet. Invalid dimensions preserve intent and show the official section-notice treatment. Light/dark and 391 px narrow/1280 px desktop presentation are reviewed locally. The build retains its existing large-bundle advisory. No source push, hosting action or publication.

The horizontal/vertical move icons are explicit CAD extensions, not relabelled official assets. They follow [Evo icon construction](https://playbook.ebay.com/foundations/iconography/our-icons): native 16/24 px grids, centred 2 px strokes, rounded terminals and safe space. The compact Move pill is one 32 px button, including its values; tap/Enter edits and pointer drag moves. Dark 3D edge opacity is 0.975 instead of 0.65, a 50% increase, with the same semantic edge colour.

Numeric fields now use official Skin `number-input` composition ([Evo number input](https://opensource.ebay.com/evo-web/components/number-input/css)): a labelled input with separate horizontal decrement/increment paddles and official remove/add icons. The former custom stacked chevrons are removed. Input labels use explicit `for`/`id` association; paddles follow upstream tabindex/aria-hidden guidance while arrow keys remain supported. Shared 16 px form spacing separates selects, fields and contextual end-joint controls.

Element icons extend the established CAD treatment: separate side, back, top, bottom, fixed shelf, adjustable shelf, divider and opening glyphs, each on native 16/24 px grids with 2 px rounded strokes. They appear consistently in Structure and the selected-element inspector header, use semantic currentColor, and remain decorative beside text labels. Stroke width is explicit because Skin's standard fill icons default to stroke-width 0.


The latest review applies the small grey label variant uniformly to native number inputs and selects. Alert layout follows [Evo alert notices](https://playbook.ebay.com/design-system/components/alert-notice): scoped machining warnings remain with affected sections, details expand on request and field/action messages use information or attention semantics. [Tooltip guidance](https://playbook.ebay.com/design-system/components/tooltip) supplies delayed hover/focus, single-tip presentation and default-below/open-space placement. Portal rendering prevents clipping by panel/header scroll containers.


Latest UI uses [Evo radio buttons](https://playbook.ebay.com/design-system/components/radio-button) for repair choices: native labelled single-selection inputs, the large 24 px treatment, top-aligned labels and official checked/unchecked glyphs. [Evo snackbars](https://playbook.ebay.com/design-system/components/snackbar) replace alert-notice styling for transient feedback: inverse surface, optional attention icon, short message and link action, maximum 448 px width and 16 px clearance above the persistent camera bar. Field types remain unchanged apart from the explicitly requested disabled calculated total.

Inspector accordions follow [eBay Playbook](https://playbook.ebay.com/design-system/components/accordion) and [official CSS markup](https://opensource.ebay.com/evo-web/components/accordion/css): independent full-row disclosure, semantic summary headings, chevrons, separators, and no nested support accordions. Import the pinned Skin accordion CSS. Cabinet type stays visible. Element glyphs adapt the supplied dotted selection-grid concept onto 16/24 px Evo grids with 2 px solid member strokes; they are application CAD extensions, not claimed unmodified library assets. Shared choice labels use the same 8 px control gap as stacked numeric fields; adjacent groups use 16 px spacing.
