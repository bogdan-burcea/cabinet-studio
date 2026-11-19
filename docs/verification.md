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

# Stage 2 — concept feet and plinth (v0.5.0)

18 November 2026. Local branch `feat/stage-2-installation`. 58 tests pass; TypeScript and Vite build pass (existing Three.js chunk advisory remains). Fourteen added tests cover preservation of existing body/interiors/materials/bands, support modes and floor/origin semantics, stable foot primitives, plinth material/band geometry, 48 stock/height/return combinations without overlap, gaps, rejected dimensions/clearances/material dependencies, transaction history, dormant settings, schema 5 round trips and copied schema 4 migration. Existing 44 regressions remain passing.

Browser review on the existing 600 × 720 × 560 mm cabinet with top/rear rails, four divisions/five openings, 16 mm oak-concept interiors and existing 2 mm shelf front band: applied 120 mm feet with a 115 mm front cover and both returns. Installed height became 840 mm; body and openings stayed unchanged. Undo restored the original 11-panel/unassigned-support cabinet in one step; Redo recovered 14 panels/four feet. A 100 mm plinth setback conflicted with feet and disabled Apply; correcting to the committed 60 mm cleared the draft. Direct-floor preview showed 720 mm installed height and retained dormant settings; Cancel restored feet/covers. Cover visibility exposed feet without changing intent. Plinth material was overridden to 16 mm and its top edge banded at 1 mm through existing controls. Native save/load restored 120 mm feet after an intervening 130 mm edit; reload recovered autosave. Graphite/Linen and compact layout reviewed locally. No browser console errors were captured in the reviewed session.

Concept foot/clip attachment, drilling, real products, support capacity, cabinet stability, physical fit, measured performance and first-time-user acceptance remain unverified. No manufacturer fitting is enabled. No reference-repository edits, source push or publication. Example and JPG previews are supplied alongside the repository.

# Stage 2 — concept wall layouts (v0.6.0)

18 November 2026. Local branch `feat/stage-2-wall-mounting`. 67 tests pass and TypeScript/Vite build passes; the known Three.js chunk advisory remains. Nine added tests cover exact preservation of panels/interiors/materials/bands/feet/plinth under restraint, suspended floor references with nonzero origins, inactive support restoration, stable disjoint rail/bracket envelopes across 48 width/top/back/gap combinations, invalid numbers/fit/support combinations and dependent body shrinkage, direct-floor restraint, transaction history, strict schema 6 round trips, schema 5 copy migration and malformed/unverified hardware/ID rejection. All 58 prior regression tests remain passing.

Local server returns HTTP 200. Browser review used the furnished 600 × 720 × 560 mm cabinet with 100/60 mm top rails, 80/80 mm rear rails, four divisions/five openings, interior material/edge overrides, 120 mm feet and a 115 mm plinth with both returns. Wall restraint added a rail/two envelopes behind the body and read 780 mm mounting-centre height, preserving all 14 panels/four feet. Apply/Undo/Redo restored the complete layout. A 10 mm wall gap disabled Apply and retained the committed cabinet; correction to 30 mm cleared the no-op draft. Suspended layout at 450 mm body clearance read 1170 mm body-top/1110 mm mounting-centre height, retained all five openings and hid inactive feet/plinth. One Undo recovered restraint and active feet/plinth. Native saves of both layouts were reopened; reload recovered restraint with feet/plinth through autosave. Rail selection and Rear view worked. Graphite/Linen and a 760 × 900 compact layout were reviewed; compact selection includes all three mounting envelopes. No browser error logs were captured. Preview remains available locally with restraint and existing feet/plinth.

Native examples and JPG captures are alongside the repository. These checks validate the software spatial model, not a physical installation. No hanger/rail assembly, wall substrate/anchors, cabinet preparation, drilling, load rating or stability has been verified. No hardware pack is enabled, no reference source was edited, and nothing was pushed or published.

# Stage 2 — remaining concept software (v0.7.0)

83 tests pass; TypeScript and Vite build pass. The known Three.js chunk advisory remains. Fifteen new functional tests cover adjustable shelf/structure separation, nonzero-origin level/pad geometry, numeric/drag command equality, sibling spacing, material dependency, bands/duplicate/remove/history, parent-reference protection, resize/depth/setback rejection, conversions, strict files/IDs and schema 6 copy migration; all four presets preserve furnished intent and use atomic history. One additional catalogue test pins all six user-supplied references and confirms none is enabled. The original 67 regressions remain passing. Adjustable no-overlap coverage includes 16 stock/top/back combinations with two shelves/eight pads each.

Local preview returned HTTP 200. On the existing furnished cabinet (600 × 720 × 560, 100/60 top rails, 80/80 rear rails, four divisions/five openings, material overrides/bands, 120 mm feet, three plinth panels and wall restraint):

- Added an adjustable shelf in Opening 5. Its centre started at 136 mm with 16 mm interior stock; five structural openings remained. A typed 170 mm snapped to 168 mm. Browser review caught stale typed text after snapping; the shared field now normalizes the committed displayed value.
- Previewed/applied conversion to fixed and back to adjustable, preserving selection/identity. Undo recovered the previous shelf type. Duplicated at 72 mm, removed it and undid removal; a subsequent Undo removed that duplicate step.
- Adding a structural divider to its occupied opening was rejected with the shelf identified; the entire previous cabinet remained valid.
- Reviewed open/base/wall presets and cancelled each; applied Tall with suggested 2100 mm body height. Moving the shelf to 1000 mm then proposing the smaller wall size rejected Apply rather than moving/deleting the shelf. Cancel plus two Undo steps recovered the original body and shelf placement.
- Applied a 1 mm front band: finished size 562 × 16 × 532 mm; core 562 × 16 × 531 mm. Saved native schema 7, moved down to 136 mm, reopened the saved file and reloaded: centre 168 mm and the band returned.
- In the normal 391 × 723 preview, dragged the adjustable handle from 168 to 104 mm. One Undo returned 168 and exhausted that drag's history step. Both desktop themes and 760 × 900/narrow stacked layouts were reviewed. Compact selection retains the shelf and installation elements.
- Reviewed the supplied fitting-reference section: six correct supplier links/article records, explicitly not applied. No browser error logs were captured. Existing concept geometry remained unchanged.

Screenshots and a native example are alongside the repository. These are software-model checks. Exact GTV, Häfele and Blum assemblies are not activated; official regional drawing/companion verification and physical trials remain open. No structural capacity/performance/usability acceptance is claimed. No Stage 3 work, reference edits, source push or publication.

## Interior-selection correction — 18 November 2026

Reproduced an invisible opening proxy intercepting a visible shelf-surface click and selecting Opening 5. The viewport picker now treats opening planes as interaction proxies, prioritizes visible shelf/divider/support/band geometry, and retains empty-opening selection against carcass background surfaces. Opaque foreground geometry still occludes hidden shelves; transparent back construction and its band strips pass through for picking. Canonical cabinet geometry, intent, saved revisions and history are unchanged.

89 tests pass (six added real Three.js raycasting regressions) and TypeScript/Vite build passes. Browser direct clicks selected Fixed shelf 1, Adjustable shelf 1, Opening 1 and Divider 1 correctly in the narrow preview. Structure selection also selected Fixed shelf 2 and restored the matching inspector/move handle. No browser error logs were captured. Local screenshot: `preview-shelf-selection-fixed.jpg` alongside the repository. No publication or source push.

# Stage 3 — slab doors and handles (v0.8.0)

102 tests pass; TypeScript/Vite build passes. Thirteen added regressions cover preservation of all Stage 2 features, paired slab/handle composition across 24 stock/width/back combinations, independence from interior edits, region splits and identity/band copying, valid empty-carcase inset and rejected interior conflicts, handle placement/handing/style, invalid fits and dependent resizing, per-door material inheritance/override and bands, atomic history/removal, presentation-only inspection rotations, schema 8 strict round trips and schema 7 copy migration, and nested front picking/occlusion. Existing 89 regressions pass. The known Three.js chunk-size advisory remains.

Local browser review on the existing 600 × 720 × 560 mm furnished cabinet:

- Previewed/applied a pair of 297 × 716 × 18 mm overlay slabs over all five openings. One Undo removed the pair and exhausted that step; Redo restored it. WebGL canvas click selected Slab door 2 through the new transformed picking path.
- Inset placement conflicted with the existing interiors: Apply disabled and the committed layout remained intact. Cancel restored the overlay settings. Knob/handing changes applied atomically and Undo restored the original right-hand pull layout.
- Overrode only door 2 to 16 mm white-concept stock and a 1 mm right-edge band. Door 1 kept its inherited 18 mm material; original shelf/divider/plinth materials and bands remained. A bottom/top front split preview created a third slab; Apply/Undo restored the pair without changing the interior tree.
- Opened both doors to 90° using keyboard-accessible sliders. Their panels/bands/handles moved together and the original interiors were visible. Hiding fronts allowed the canvas to select Divider 1; re-showing retained inspection state. Fit included opened geometry.
- Saved native schema 8 while doors were open, changed a handle to None, reopened the file and reloaded. Pull intent returned; inspection angle reset to 0° because pose is presentation-only. Prior materials/banding, feet/plinth, mounting and interiors were retained.
- Reviewed closed Graphite and open Linen views and compact 760 × 900 controls. No browser error logs were captured. JPG captures and a native example are alongside the repository.

This is concept design under the user's explicit deferral of exact fittings. No hinge/plate/handle products, fixings, drilling, physical installation or swept/adjacent-door collision verification is claimed. No reference edits, Stage 4 work, source push or publication.

## Focused workspace review — 0.9.0

105 tests pass; TypeScript and Vite build pass. Existing Three.js bundle-size advisory remains. Regression coverage verifies creation of fixed shelves, adjustable shelves and dividers behind inset doors, invalid-preview preservation, child-depth preservation, explicit setback policy, schema 8 copied migration/schema 9 round trips, reversible selection deletion and nested-content protection.

Local browser verification: contextual creation first suggested 21 mm setback behind an inset slab; changing to zero disabled creation while keeping the field accessible; restoring 21 created the fixed shelf. Editing its input with Backspace preserved the shelf; Backspace outside the editor deleted it; Undo restored it. The original furnished cabinet was restored with its construction, interiors, materials, bands, installation and doors intact. Side-header Open/Save worked; collapse of the opening list retained selection. Door inspection actions worked from the viewport toolbar. Graphite/Linen desktop and 391 × 723 compact layouts and modal access were reviewed. No application errors appeared in the inspected browser logs. Review screenshots are alongside the repository; local preview remains on port 5173. No publishing or source push.

## Door and interface polish — 0.10.0

113 tests and TypeScript/Vite build pass. The existing Three.js bundle-size advisory remains. Added regressions cover connected placement changes, nested splits, outer handing, missing/short/setback mounting panels, dependent body/divider edits, inset faces around dividers at nonzero origins, atomic repairs, fitting handle suggestions, distinct band/handle picking, deletion and schema 9 copied migration.

Local browser review verified:

- Insetting either furnished split leaf offered a concrete setback repair for the five affected interiors; choosing it insets both doors as one transaction. Undo restored the original layout.
- On a door pair without a middle panel, selecting the unsupported hinge side failed without changing the cabinet, and offered supported handing or adding a divider. Adding the divider produced a supported hinge edge and left other contents intact.
- Handle-only editing changed pitch directly; its dialog contained only handle fields. A selected band exposed only that edge's thickness, changed 2 mm to 1 mm directly, and remained independently selectable. Bands use contrasting 3D strips and stable edge identities; handles have independent selection identities.
- Transparent, clean edge-wireframe and adjustable exploded views rendered correctly. Explosion retained attached bands, handles and support pads and disabled geometry drag handles. Graphite desktop and Linen 391 × 723 handle editing remained usable. The selection dropdown, hide controls and material/finish/grain UI are absent.
- Restored the original furnished cabinet and saved native schema 10 while transparent/exploded view was active. The downloaded file deserialized exactly equal to the original cabinet intent, including old bindings and every existing construction/interior/installation/front/banding field. A review copy and `polished-view-modes.jpg` are alongside the repository. Reset display to solid, assembled and left the local preview available at 127.0.0.1:5173. Browser error logs were empty.

Hinge support checks are conceptual spatial rules, not verified hinge/plate assemblies or drilling/collision certification. Exact fittings remain deferred. No Stage 4, reference repository edits, source push or publishing.

## Kumo, double-click and linked layout — 0.11.0

122 tests pass and TypeScript/Vite build passes. Added regression coverage for bidirectional linked dimensions, shared neighbor sizing, inset leaves, persistent centering through body and nested-parent changes, native round trips, copied schema 10 migration, malformed anchors/links, free-boundary unlinking and protected hinge-bearing removal. Coplanar band targets beat their own panel but do not pierce nearer occluders. Existing construction, interiors, material compatibility, banding and installation tests remain.

Local browser verification:

- A linked divider moved from 282 to 312 mm without rejecting its attached door; that door widened from 297 to 327 mm. Editing the door width to 347 mm moved the divider to 332 mm. Both changes used direct commands.
- Keep centred restored the constraint; increasing cabinet width to 800 mm yielded 373 mm clear on both sides and resized both door leaves. The constraint and boundary links survived a browser restart and native schema 11 export; the downloaded review copy was deserialized and checked separately.
- Native canvas double-click opened the handle-only editor at the visible pull, the slab editor on the door face, and the left-band-only editor on the thin band. The band target was enlarged for interaction without changing its canonical dimensions.
- The bottom camera bar contains View modes; the selected-element toolbar does not. Kumo view controls, checkbox/separation control and close behavior worked at 391 × 723.
- Cabinet dimensions includes recommended type and width selectors. Choosing 800 × 720 × 560 changed width to 800; one Undo restored 600. Kumo selects opened above their task dialog and selected options correctly. Kumo menus and light/dark presentation were reviewed.
- Restored the original furnished cabinet, saved it through the updated UI, and verified its deserialized intent equals the pre-task native example exactly. The current review copy is `kumo-workspace-example.cabinet.json`; `linked-layout-saved-review.cabinet.json` preserves the linked-centred QA case. `kumo-dimensions.jpg` shows the Kumo dimensions/recommendations dialog. Browser error logs were empty. The Vite 7.3.8 preview is running in a retained local terminal on 127.0.0.1:5173.

The actual Cloudflare Kumo 2.19.0 package and official standalone CSS are installed; adapters use its controls rather than imitating the appearance. Vite 7 was updated during dependency review. The build retains its large-bundle advisory and ignores Kumo's React-server `use client` directives in this client-only app. `npm audit` still reports the existing dev-tool glob chain (picomatch/fdir/tinyglobby/Vite); compatible fixes did not resolve the all-version picomatch advisory. No forced downgrade was applied. Exact fitting verification remains deferred. No source push, reference edits or publication.

## Restored interface and Stage 4 — 0.12.0

User-directed rollback restored the Stage 3 shell, original themes, header/footer and contextual inspector. Kumo/Carbon layers and modal workspace UI were removed; earlier browser evidence above is historical. The later cabinet rule corrections and schema compatibility were retained.

126 tests and TypeScript/Vite build pass. Drawer regression fixtures cover official 16 mm deductions (LW564 / NL500 → 489×476 bottom and 477×84 back), exact pack article/quantity pins, full-back/rear-rail 503 mm depth boundaries, 98.5 mm allocation minimum, stacking/overlap, continuous divider support, dependent board resizing/identity, slab-door and adjustable-shelf rejection, missing opening protection, full prior-feature preservation, Undo/Redo, strict schema 12 and copied schema 11 migration. The build retains its bundle-size advisory.

Local browser review used the original interface. Main 127.0.0.1 origin retained the user's furnished cabinet and successfully copied its schema 11 autosave. Separate localhost origin created a new drawer: preview, Apply, 65% illustrative extension and Fit; Undo removed it, Redo restored it and a browser reload restored the committed drawer. Exact articles/evidence are available in the drawer inspector. Steel solids and inspection travel are schematic; no physical, machining, supplier-stock or cabinet load verification is claimed. No publishing, source push or reference-repository changes.

The generated three-drawer schema 12 example reopened through the app's native Open control in the isolated localhost review. All three drawer owners restored in Structure; the middle drawer was selected, extended to 55% and fitted in view. `stage-4-antaro-example.cabinet.json` and `stage-4-antaro-preview.jpg` are alongside the repository. The main 127.0.0.1 preview still retains the furnished pre-Stage-4 cabinet.

## Simple cabinet UX baseline

Default editor reduced to five-panel geometry, dimensions, panel inspection, camera, name, New/Open/Save and history. Source-only `AdvancedApp` and all advanced modules are preserved. Dedicated simple storage does not read or overwrite advanced drafts; advanced-file inputs fail intact. Four new tests cover storage-key isolation, simple native identity/geometry round trips, advanced-file rejection and size/New/Open history with invalid-edit preservation.

130 tests and TypeScript/Vite build pass. Browser check: main preview starts a new simple draft despite its existing advanced autosave; width changed from 600 to 800, selected Left side showed its generated dimensions, and Undo restored 600. `simple-cabinet-preview.jpg` is alongside the repository. No publication or reference-repository changes. Feature expansion paused for UX feedback.

Cabineo/part inspection local verification: 151 tests pass and production build passes (existing bundle-size advisory). Browser checked Cabineo 8 → 12, Undo/Redo, side and fixed shelf face previews, no generic Interior block for selected parts, Move without tooltip, matching header separators and light/dark rendering. Preview stays local; no publication. Physical fitting trial remains deferred; 3D housing display is simplified and does not cut canonical board solids.

Back-panel/inspection verification: 155 tests and production build pass. Coverage adds all 24 thickness/seating combinations, overall envelope and interior depth, pocket volume, stable shelves/dividers, joinery adaptation, invalid edits, Undo/Redo, save/load and version 13 migration. Browser checked selected-back controls, grooved/applied sizing, expanded thumbnail with Escape/focus return at desktop and narrow sizes, receiving-seat thumbnail, and complete bore inspection in light transparent/dark wireframe. Removed LOCAL, cabinet-row icon and empty Interior guidance. Local preview server was restarted with refreshed dependencies after detecting an obsolete Kumo optimizer entry; it is running on 127.0.0.1:5173. Nothing published.

Back-fastener/Move iteration: 158 tests and production build pass. Added Workshop-matched RPC holes/prerequisites, side counts, pitch/edge/stock rejection, native round trips, version 14 migration and one-step setup Undo/Redo. Browser confirmed compatible 3 mm/11 mm inset adoption, Undo back to 9 mm/10 mm, camera preservation via identical projected dimension anchors, full-pill value-area dragging and tap-to-edit focus. All manufacturing/physical trial limits remain unchanged; only holes are visualized. No publication.

Hole-only/back-fastener iteration: 158 tests and TypeScript/Vite build pass, with the existing bundle-size advisory. Browser checked compatible Ixconnect selection (3 mm captured back, inset 11), one-step Undo/Redo, unchanged projected dimension positions/camera during that edit, 32 px entire-pill dragging from its text area, tap-to-edit focus and Undo, directional icon strokes, removed labels, and stronger dark-mode outlines. 3D accessory bodies are removed; only drilling locations/depth contours remain. Tests cover Ixconnect geometry, counts, spacing/stock/seating validation, round trips and version 14 migration. Local only; no publication or physical fitting verification.

Stock/puzzle/machining verification: 163 tests and production build pass (existing bundle-size advisory). Regression coverage compares analytic overlapping triple-hole cut volume and assembled puzzle volume at all seven stock thicknesses; verifies common-face divider placement, opposed-face warnings, third-panel interference review, stock dependencies, stable identities, reversible changes, native round trips and version 15 migration. Browser confirmed immediate numeric increments and Undo, 19 mm stock, interlocking profiles in 3D/flat views, clean dark wireframe and exploded views, and a visible one-side warning when adding an opposing divider. Undo removed that trial divider and its warning. The local example retains the original seven parts with puzzle corners and 19 mm stock. Tool-radius reliefs, production output and physical trials remain pending; nothing published.

CNC/interior-joint verification: 171 tests and production build pass (existing bundle-size advisory). New coverage exercises 3–24 mm decimal stock, default/zero/decimal clearance, tool-radius dogbones, opposed pilot through conversion with fixed housing depths, custom Cabineo quantities and invalid spacing, both shelf/divider finger ends, reversible edits and strict native round trips. Mixed stock 18/19/24 + captured back + Cabineo + dogbones + interior fingers renders in both 3D and flat profiles; this includes the fractional-ring failure found and corrected during browser review. Browser verified official Evo plus/minus controls, 3.5 mm input (then Undo back to working cabinet), 4 mm tool/dogbones, 4 Cabineos per side, both contextual finger options, enlarged clipped part preview, and light/dark rendering. The local working model retains its seven part identities with shelf/divider fingers. No CNC output, physical trial, publishing or source push was performed.

### Local bulk edits and repair actions (2026-11-19)

Added regression coverage for same-kind bulk shelf/divider joints, identity and native round trips, reversible subtree removal, minimally widened slots/smaller cutters, preserving requested cutter/stock changes, resize repairs and rejected geometry transactions. Local interaction checks cover multi-selection with mixed joint values, shared edits, removal through button/Backspace, cancellation and one-step Undo, and cutter conflict resolution through the Evo selector. Development remains local; main is not pushed because it deploys Pages.


Joint-fit correction: focused coverage measures 0.2 mm assembled corner clearance, 18.2 mm shelf/divider receiving slots, cutter-independent back-slot width, unchanged fitting bore sizes, and version 17/18 native loading. Tool width is non-blocking and cannot trigger allowance-inflation repairs.

### Back and adjustable drilling (local)

Coverage includes zero-allowance back-joint volume partition with thin/thick backs and existing puzzle corners, shared clipped profiles, translated edge-centred applied pilots, stock-based diameter/count rejection and explicit repair, shelf rows on carcass/dividers, stable drilling during shelf movement, count limits/deduplication, nested removal, Undo and strict current/legacy native files. Local interaction review covers incompatible-back-fitting correction, pilot count edits, adding an adjustable shelf in a nested opening, contextual hole-count controls and Backspace. No deployment is performed. Fitting capacity, physical joinery trials and manufacturing export remain outside this change.

Shelf review coverage: centred Cabineo counts including 2; unique back corner pilots; opposed through-hole pairing and offset row separation; ≥4 mm blind depths and under-5 mm through/staggered drilling; paired centre/count edits and centred resize; fixed/adjustable conversion with stable IDs; strict native 20 and older-file loading. Existing tests retain genuine invalid-count rejection and matched fitting limits. Full checks run once after final functional changes, with focused tests used during iteration.

Interior UX checks cover all three bulk interior kinds, one-step Undo/Redo and native round trips, default/edited front insets, shared thin-divider drilling with unequal shelf insets, automatic pilot spacing and unique corners, concave-only union-aware dogbones, collision-free exploded bounding boxes and migration of retired drilling controls. Local review confirms multi-opening Shift selection, bulk creation/inset, exploded separation, expiring banners, element icons and the automatic pilot controls. No source push or deployment.


Local door/layout verification: focused regression coverage checks single/pair and multi-opening creation, linked divider sizing, inset corrections on both leaves, unsupported hinge-support repairs, overlapping-cover replacement, stable IDs, Undo/native migration and compact collision-free exploded packing. Exact hinges and manufacturing output remain outside acceptance.


Door hardware local verification: 220 tests pass and production build passes. Focused coverage includes overlay/inset article and support drilling, thin-stock/crowding rejection, Undo/native round trips and native-22 migration, 24 handle type/orientation/anchor combinations, outward inset/overlay sweep checks with obstruction stopping, and divider order/collision-free explosion. Browser review covers paired inset conversion with interior-clearance repair, correct 71B3750 display, generic pulls/finger holes, opening and draft restoration. Manufacturer linkage motion, load suitability and physical assembly remain unverified.


Review regression: 225 tests and production build pass. The supplied native-23 fixture reproduces a real 6 mm cutter / 3.2 mm back-groove mismatch; validated alternatives are a 3 mm cutter or 6 mm back stock, preserving 0.2 mm fit allowance. Tests cover complete paired adjustable candidates, inset-clearance correction, symmetry, Undo/native round trip, continuous 5.5 mm back stock, all finger-joint entry points and cap-bridge filtering across four hinge setbacks. The two zero-relief stock-volume tests now explicitly disable dogbones to isolate the volume invariant after the new auto-enable behavior. Browser verification loads the supplied file, applies the tooling repair, adds both adjustable shelves with one inset repair, rejects Ø100 with a range explanation, accepts 5.5 mm back stock, toggles visibility, exercises header deletion and restores the original draft.


Alerts/names verification: 229 tests and production build pass. New coverage reproduces back-fixing/divider and puzzle-notch conflicts, verifies nearest valid offsets in both directions and unchanged interiors/fronts/fitting counts, native round trips, two thin-back tooling choices including explicit incompatible-Ixconnect removal, stable geometry while renaming, Undo/save/load and legacy soft-close migration. Browser checks exercise inline click-away renaming, muted hidden rows, affected-part warning cues, compact scoped notices, full-width Resolve, both collision choices and both cutter choices, door-operation icons and absence of soft-close controls. Tooltip edge placement is verified at x1249–1432 within a 1440 px viewport, below the icon; outside focus dismisses it. Original local draft restored.


Base-support verification: 233 tests and production build pass. New regressions cover preserving interiors/fronts/Cabineo IDs with feet and plinth, independent base style selection, installed height and cover height, Undo/native round trips, exterior bottom housing/back bores, foot/plinth collision repair and exploded support clearance. The legacy advanced-file fixture now uses valid floor/restraint installation, because floor and foot supports are explicitly admitted in the simple editor. Browser review verifies native radio selection, the disabled adjacent total, one toolbar door button, feet/plinth and return creation, contextual foot editing, invalid-height snackbar with correct action styling, combined doors/supports, light/dark appearance and the narrow toolbar. Original local draft restored.

Support/clearance regression: 240 tests pass; production build passes. Seven new regressions cover bottom access on both Cabineo and Ixconnect, evaluated two-face repairs, two-foot patterns and bore directions/depth, 5 mm feet, 40 mm plinths, relative movement, wall exclusions, Undo/native 27 round trips and malformed settings, plinth explosion clearance, hinge-zone/shelf corrections, and the supplied native-26 collision fixture. That file is blocked by door/divider clearance near 5°, and a 3 mm edge gap passes the full 110° study without changing handles. Browser checks confirm foot and plinth drag/Undo, disabled wall support, plinth/returns explosion, part-specific opening correction, inside face selection and explicit through-foot-pilot repair, disappearance of the bottom face warning, and light/dark rendering. The original draft was restored. No publication. Hinge zones and front-edge opening remain geometric studies rather than verified manufacturer body/linkage simulation.

Inspector/hole review: 244 tests and production build pass. Four new regressions exercise parallel/perpendicular finite-cylinder intersections and near misses, intentional Cabineo/shared-shelf exclusions, affected part/operation identities, a real foot/Cabineo conflict with evaluated minimum placement correction, and legacy blind-foot migration to through stock. Browser checks confirm bottom-only flat support fields, no support move controls, label spacing, dotted member icons, dimension-line endpoint handles, dimension-field reveal from a collapsed accordion, combined shelf/divider/door creation, clear-foot-placement repair and warning removal, light/dark appearance, and restoration of the original draft. Native 28 preserves prior files. No publication.

Panel polish / inset review: 246 tests and production build pass. Focused regressions cover inset leaves meeting over divider centres with the requested gap, linked resizing/movement, unchanged identities and Undo, valid setback corrections and native round trips, half-overlay versus outer-inset hinge application, and 4 mm foot-hole clearance against parallel/perpendicular bores and panel boundaries. Prior divider-face assertions now check the requested covering geometry after clearance repair. Browser review verifies aligned main accordion titles/content, units in the heading, restored main supports and Interior opening selection, selected-item static controls, calculated connector count without paddles, and a front-view inspection of the supplied tall-cabinet fixture. Original draft restored; no publication. Native 29 migrates old inset interiors to a clear setback while retaining IDs.

Zero-divider-inset correction: 248 tests and production build pass. New coverage accepts 0 after an explicit 30 mm inset, preserves native intent and one-step Undo/Redo, follows linked divider movement and front stock changes, restores full depth for overlay fronts, and preserves larger explicit insets/uncovered dividers. Browser verification loads the supplied inset-door cabinet, changes the divider field from 30 to 0 successfully, confirms automatic clearance and closed door coverage, then restores the original draft. Native 30; no publication.

Protruding-divider correction supersedes the previous automatic-shortening interpretation. 248 tests and build pass. Coverage now verifies full-depth divider geometry at inset 0, disjoint adjacent leaves beside its faces across stock sizes and linked movement, native/Undo preservation, explicit recessed-divider coverage, and corresponding hinge applications. The real tall-cabinet fixture retains its legitimate divider/opening collision and tested reveal repair. Browser inspection shows a full-height exposed divider strip between closed inset doors with Front inset 0; the original draft is restored. Native 31, local only.
