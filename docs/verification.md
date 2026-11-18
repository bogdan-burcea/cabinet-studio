# Verification — Stage 0/1 prototype

18 November 2026, Node 24.15.0, local preview at `http://127.0.0.1:5173`.

## Automated checks

`npm test`: eight passing tests, including 27 width/height/depth combinations covering modelling limits. Checks assert positive panels, enclosure, no panel-volume overlap, correct opening bounds with a nonzero origin, stable identities, numeric/drag equality, one Undo step per drag, invalid edit preservation, cancellation, Redo branching, versioned native round trips and rejection of malformed or unsupported files/revisions. Native round trips reproduce the same evaluated geometry.

`npm run build`: TypeScript and Vite production build pass. Vite emits an advisory about the Three.js-containing JavaScript chunk exceeding 500 kB; this prototype has not been optimized for delivery or hosted.

## Local browser review

- Local server returns HTTP 200 and the WebGL cabinet renders.
- Reviewed both desktop (1440 × 960) and narrow side-panel layout; all elements remain accessible through a compact selector in narrow layouts.
- Numeric width changes update the model and dimensions. Undo/Redo restores the matching values.
- Invalid 20 mm height preserves the 720 mm body, resets the field and presents the valid range.
- Width handle drag from 754 to 903 mm commits one transaction. One Undo restores 754 mm and exhausts that drag's history step.
- Panel selection updates the inspector and selection presentation. Camera orbit, 3D reset, Fit and zoom respond. View presets and numerical controls are present for keyboard/button alternatives.
- Graphite/Linen change the shell, controls and viewport presentation without altering cabinet dimensions or materials.
- Native JSON saved from the UI at 800 mm width, then a 900 mm edit was made. Opening the saved file restored 800 mm. Undo restored 900 mm and Redo restored 800 mm.
- Reload restores browser-local dimensions. The reviewed starting cabinet was left at 600 × 720 × 560 mm in Graphite.

Screenshots are supplied alongside the repository as `preview-graphite.jpg` and `preview-linen.jpg`.

## Remaining validation

No claim of manufacturer-validated construction, structural capacity, physical fitting verification, measured 30 fps performance or first-time-user usability acceptance. Hardware candidates remain disabled; a complete verified starter fitting set is outstanding. No deployment was performed.

# Stage 2 increment 1 — shelves and dividers

18 November 2026. Local branch `feat/stage-2-interiors`, app version 0.2.0. No publication or hosting registration.

## Automated checks

20 tests pass: the original eight regressions plus 12 interior checks. Interior coverage includes horizontal/vertical splits over 18 representative layouts, panel thickness allocation and non-overlap; nested parent moves; dependent panel resize; rejected moves and cabinet shrinkage; one-step drag history and cancellation; numeric/drag equality; safe removal; addition and duplication; stable feature/opening identities; schema 2 round trips; copy migration from Stage 1; and malformed/unsupported tree rejection.

TypeScript and Vite build pass. The existing large JavaScript chunk advisory remains; no delivery-size optimization or 30 fps benchmark is claimed.

## Browser review

- Added a fixed shelf to the initial opening and a divider in its lower child, then another shelf inside the lower-left opening.
- Moved the divider centre from 282 to 320 mm: clear widths updated to 311/235 mm.
- Tried moving the parent shelf to 150 mm: its dependent shelf became invalid; the entire previous cabinet and 342 mm parent position were retained, with an inspectable issue. Parent removal was disabled while it contained divisions.
- Moved the parent shelf to 400 mm: child divider height updated to 391 mm.
- Duplicated a leaf shelf, removed the duplicate, then undid removal to restore its geometry and identities.
- Directly clicked the upper opening in 3D and reached its contextual Add fixed shelf/Add divider actions.
- Dragged a divider from 320 to 415 mm on the application grid. One Undo restored 320 mm and exhausted that history step.
- Dragged a shelf from 400 to 485 mm. One Undo restored 400 mm. Numeric preview at 450 mm followed by Escape restored 400 mm without a new Undo step.
- Saved a schema 2 cabinet with nine panels/five openings. Opened a Stage 1 file and saw the explicit copy-migration notice, then reopened the schema 2 file and recovered the full interior. Reload retained the interior through browser autosave.
- Reviewed Graphite/Linen at the desktop breakpoint and the compact element selector at the narrow breakpoint. Captured both themes and left the local preview available with an upper opening selected.

An example native file and screenshots are supplied alongside the repository: `stage-2-example.cabinet.json`, `preview-stage-2-graphite.jpg`, `preview-stage-2-linen.jpg`.

## Boundaries

This completes the first Stage 2 increment, not the entire stage. Fixed shelves/dividers remain conceptual construction with unassigned joinery. The 60 mm clear-space rule and 5 mm drag grid are application policies. Adjustable supports, verified hole grids, fittings/load claims, other construction variants, materials/edge treatment and installation remain future increments. Original Stage 1 autosave data remains at the v1 key. No changes were made to the reference repository.

# Stage 2 — construction and material/edge increments (v0.4.0)

18 November 2026. Local branches: construction checkpoint `feat/stage-2-construction`; current combined work `feat/stage-2-materials`. No source push, hosting registration or publication for these increments.

## Automated checks

44 tests pass. Added construction coverage across all four top/back choices and 72 furnished dimension configurations, independent rail sizes, gap boundaries, invalid dependent edits, cancellation/history and copied migration. Added material/edge coverage for role inheritance/override, actual thickness dependencies, finish/grain identity, band/core composition without overlap, dormant variant settings, duplication/removal/Undo, strict files and pins, and 192 mixed stock/construction configurations. All existing basic-cabinet/interior regression tests remain passing.

TypeScript and Vite build pass. The existing Three.js-containing chunk size advisory remains; no delivery optimization, structural verification or 30 fps benchmark is claimed.

## Local browser review

- Previewed independent 100/60 mm front/rear top rails and rear rails on the existing four-division/five-opening cabinet. Usable depth changed from 554 to 542 mm without rewriting positions or deleting contents.
- A 550 mm front rail combined with a 60 mm rear rail was rejected: the committed full-panel cabinet stayed visible and Apply was disabled until corrected. Applying the corrected construction retained all interiors.
- The preview server stopped during development. Restarted loopback Vite, verified HTTP 200, and opened a fresh visible preview tab. No deployment was used to resolve it.
- Previewed 19 mm carcass stock: openings and rear-rail gap updated. Cancel restored 18 mm without history; applying then Undo restored the previous binding.
- Turned off interior inheritance, selected 16 mm stock with pinned oak-concept finish and U grain, then assigned a 2 mm front band to the first shelf. One apply/Undo/Redo transaction restored stock, finish/grain and banding together.
- Finished shelf dimensions remained 564 × 16 × 542 mm; canonical core was 564 × 16 × 540 mm. Changing the band to 0.8 mm derived 541.2 mm core depth while preserving finished dimensions.
- Switched the top from full panel to rails after material/edge changes. The 16 mm interior override, 2 mm front band, local shelf position 400 mm, construction dimensions and all five openings remained.
- Saved native schema 4; changed the band to 0.8 mm, then reopened the saved file and recovered the 2 mm band and associated material settings. Original older files and autosave keys remain preserved.

Examples/screenshots are supplied alongside the repository. Material/finish/band catalogue records are generic concepts. Band corners are schematic, grain is stored intent, and core dimensions are not manufacturing cut sizes. Hardware, adjustable supports, feet/plinth and mounting remain unverified/deferred.
