# Staged backlog

## Stage 0 — foundation

- [x] Separate local repository and feature branch; specification, README and runtime pin.
- [x] TypeScript/React prototype and dedicated Three.js adapter.
- [x] Domain, catalogue, rules, geometry, commands, UI, design system and persistence boundaries.
- [x] Graphite and Linen themes change shell, controls and viewport without domain changes.
- [x] Exact initial research candidates recorded with explicit disabled status.
- [ ] Complete official assembly verification, companion lists, revisions and fixtures before enabling hardware. Shelf support, foot/clip, handle and suspension still need exact regional selections.
- [x] Create/connect the separate private `cabinet-studio` GitHub source repository. Source sync is separate from publication.

## Stage 1 — basic cabinet

- [x] Five-panel rectangular carcass and evaluated opening.
- [x] Numeric dimensions and constrained drag handles route through the same command path.
- [x] Selection, contextual inspector and accessible element list.
- [x] Orbit/pan/zoom, front/side/top/isometric and Fit; camera retained through ordinary edits.
- [x] Undo/Redo; one step per drag; Escape cancellation; invalid edits preserve prior cabinet.
- [x] Browser-local autosave and portable native JSON save/load; strict versions and pins.
- [x] Panel/opening identity and evaluated geometry survive native file round trips.
- [ ] User feedback on direct editing, layout, theme direction and scale.
- [ ] Agree reference Mac and measure the proposed 30 fps target; no performance claim yet.

## Later stages — do not begin automatically

2. Construction and interiors: supported top/back variants, structural/adjustable shelves and divisions, material roles, edge treatment and verified installation packs.
3. Slab fronts and handles: independent front layout, exact hinge/plate combinations, handing and illustrative motion.
4. One verified TANDEMBOX antaro M pack, matched board components and companions. No wooden drawer boxes.
5. Refinement and individually agreed extensions, following feedback.

Physical fitting verification and non-professional usability trials remain required. No downstream workflow is in this backlog's implementation scope.

## Stage 2 — increment 1: fixed shelves and dividers

- [x] Recursive opening tree with stable node/feature identities; 18 mm fixed shelves and vertical dividers.
- [x] Add within an opening, nest in child openings, move numerically or by constrained 3D handle, centre, duplicate and remove.
- [x] Live clear spacing, ghost preview and min/centre/max guides; shared evaluation for all edits.
- [x] Dependent panels/openings regenerate together; invalid dependent edits preserve the entire committed model.
- [x] Parent deletion blocked until child divisions are removed; no silent loss of nested interiors.
- [x] Undo/Redo covers interior transactions; dragging is a single step; Escape cancels.
- [x] Schema 2 save/load and browser autosave; disclosed Stage 1 copy migration, original data retained.
- [x] Regression coverage for nested layouts, identity, no-overlap geometry, edits, deletion, file validation and migration.
- [ ] User review of this first interior-building interaction.
- [ ] Adjustable shelves after an exact shelf-support assembly is verified. No generic hole grid or support capacity is enabled now.
- [ ] Remaining Stage 2 work in later increments: top/rails, back/rear rails, material bindings/edge treatment, feet/plinth and verified mounting.

Stage 2 remains in progress. Work is local on `feat/stage-2-interiors`; this increment does not authorize publication.

## Stage 2 — increments 2 and 3: construction, material bindings and banding

- [x] Full top or independent front/rear top rails; full inset back or independent upper/lower rear rails.
- [x] Canonical construction bounds and conservative rear clearance; existing compartment IDs/positions preserved.
- [x] Review ghost geometry/usable depth before applying; reject invalid rail combinations; Undo/Redo.
- [x] Versioned material roles: carcass/construction rails, full back and inherited or overridden interiors.
- [x] Actual declared stock thickness, finish identity and grain intent, with presentation colours kept in the design system.
- [x] Per-panel, per-edge generic band pins; canonical core/strip geometry inside the finished envelope.
- [x] Retain edge intent for inactive construction variants; duplicate/remove/Undo preserve feature identity and edge data together.
- [x] Native schema 4 and copied migrations from schemas 1–3; preserve original autosave keys and files.
- [x] Regression tests and browser review for combinations, dependencies, transactions and persistence.
- [ ] User review of construction and materials/banding interactions.
- [ ] Remaining Stage 2: exact adjustable shelf supports, feet/plinth and verified wall mounting. No unverified fittings are enabled.

Current work is local on `feat/stage-2-materials`, including the `feat/stage-2-construction` checkpoint. The older increment notes above are historical; the current schema/evaluator are 4 / `materials-4`. Nothing is published.

## Stage 2 — increment 4: concept feet and plinth (v0.5.0)

- [x] Unassigned/direct-floor/four-concept-foot support; body and installed heights kept distinct without moving the body.
- [x] Foot height and centre setbacks; canonical plate/post/base geometry with stable identities.
- [x] Front plinth, independent side returns, setback and top/floor gaps; explicit cover visibility for inspection.
- [x] Inherited/overridden plinth materials and per-panel edges use the existing evaluator.
- [x] Clearance rejection, reviewed transactions, Undo/Redo and dormant settings retained.
- [x] Schema 5 native/autosave and copied migrations from schemas 1–4; all prior features preserved.
- [x] 58 regression tests, build and local browser review.
- [ ] Exact verified foot/clip pack, companion fixings, attachment rules, physical fixtures and support/load/stability checks. Concept geometry does not complete hardware verification.
- [ ] Adjustable shelf fittings, verified wall mounting and user review remain open.

This section supersedes earlier deferred feet/plinth and schema notes. Current branch is `feat/stage-2-installation`; schema/evaluator 5 / `installation-5`. No source push, hosting registration or publication.

## Stage 2 — increment 5: concept wall layouts (v0.6.0)

- [x] Independent disabled/wall-restraint/suspended layouts with pinned provisional geometry and policies.
- [x] Wall gap, mounting centre/top/side offsets, suspended body clearance and floor-relative readouts.
- [x] Canonical rail/bracket envelopes, stable selection identities and Rear inspection view.
- [x] Preserve construction, interiors, material/edge intent; restraint retains active feet/plinth. Suspension stores feet/plinth settings inactive and Undo restores the complete support transaction.
- [x] Reject unsupported support combinations and envelope conflicts; preview, Apply/Cancel, Undo/Redo.
- [x] Native schema 6/autosave v6 with copied migrations from schemas 1–5 and original keys/files preserved.
- [x] 67 tests, TypeScript/Vite build, local browser review of both layouts, files, themes and compact view.
- [ ] Matched real hanger/rail, regional articles/companions, official preparation drawings and fixtures, wall substrate/anchors and physical/structural verification. No installable suspension pack is enabled.
- [ ] Verified feet/clips, adjustable shelf support fittings and user acceptance remain open.

This section supersedes earlier deferred mounting and current-version notes. Stage 2 remains in progress. Current local branch `feat/stage-2-wall-mounting`; schema/evaluator 6 / `mounting-6`. No source push, hosting registration or publication.

## Stage 2 — remaining concept software (v0.7.0)

- [x] Adjustable contents independent of structural splits: stable identities, concept support levels/pads, side clearance and front setback.
- [x] Numeric/button/selector/drag movement, legal-level guides, duplication/removal, minimum spacing, invalid dependency rejection and Undo/Redo.
- [x] Interior material/edge evaluator shared by fixed and adjustable shelves; material thickness retains support levels.
- [x] Reviewed fixed/adjustable conversions with identity/band preservation and no silent child/sibling loss.
- [x] Reviewed open/base/wall-style/tall presets using the same model, suggested sizes opt-in, custom contents/settings retained.
- [x] Schema 7 native/autosave, strict content/pad/tree identity validation and copied schemas 1–6 migration.
- [x] Six supplied fitting references recorded with exact articles, sources and explicit NOT APPLIED status.
- [x] 83 automated tests and TypeScript/Vite build; local browser checks of drag/numeric snapping, conversions, contents protection, presets, dependent rejection, native/autosave, themes and narrow view.
- [ ] Full Stage 2 sign-off: matched hardware assembly drawings, regional companion selections, representative official-drawing fixtures, physical trials and structural acceptance remain incomplete. Product links alone do not verify those requirements.

This is completion of the remaining concept-design software, not full specification acceptance or physical verification. Current local branch `feat/stage-2-completion`, native schema/evaluator 7 / `interiors-7`. Earlier deferred adjustable/preset notes are historical. Stage 3 is not started. No source push, hosting registration or publication.

## Stage 3 — slab doors and handles (v0.8.0)

- [x] Independent front coverage regions: full-height cover, pairs, cover over an opening area and proportional horizontal/vertical splits.
- [x] Reviewed left/right handing, concept overlay/inset placement, reveal/clearance and explicit inset/coverage dependency rejection.
- [x] Per-door inherited/overridden stock, finish/grain and four-edge banding through the existing pipeline.
- [x] None/knob/pull concepts, pinned geometry, pitch, direction, height and edge offsets with face-envelope checks.
- [x] Illustrative 0–110° opening, close-all and front visibility; canonical intent and inspection state kept separate.
- [x] Stable picking in posed groups, Structure/compact selection and Fit including displayed bounds; preserve Stage 2 selection fixes.
- [x] Atomic preview/Apply/Cancel, Undo/Redo, strict schema 8/autosave and copied schemas 1–7 migration.
- [x] 102 automated tests, TypeScript/Vite build and targeted local browser review of dependencies, history, files, poses, themes and compact controls.
- [ ] Exact hinges/plates, handles, screws, drilling and verified motion/clearance are deferred to a later stage by explicit user instruction. Earlier Stage 2 fitting-verification items remain deferred, not blockers for this concept increment.

Stage 3 concept slab-door/handle work is locally reviewable on `feat/stage-3-fronts`; exact fittings are not activated or claimed verified. Stage 4 is not started. No source push, hosting registration or publication.

## Historical interface work — reverted

The interface-only checkboxes below describe earlier work. The user reverted these layouts and controls to the original Stage 3 interface before Stage 4. Their completion marks are historical, not current UI availability. Later cabinet rules and native compatibility were preserved.

### Workspace usability

- [x] Full-height 3D focus, compact side summaries and collapsible element groups.
- [x] Contextual icon actions, tooltips and focused modal editors for existing features.
- [x] Side-header file/history commands and secondary command menu.
- [x] Recoverable Backspace deletion with editable-field and nested-content protection.
- [x] Configure shelf/divider position and setback before creation; suggest clearance behind inset slabs.

### Workspace polish and door review — 0.10.0

- [x] Immediate settings changes with Undo; no separate preview/apply stage.
- [x] Focused door, handle, split and band editors; selected top/back and foot/plinth editors restrict their fields.
- [x] Remove selection dropdown and hide controls; defer all material/finish/grain controls.
- [x] Connected split-door placement changes both leaves; hinge edges require mounting panels at both concept positions.
- [x] Correct inset bounds at internal divider/shelf faces; reject unsupported or ill-fitting splits and dependent changes.
- [x] Offer validated combined repairs for inset clearance, hinge support/alignment and oversized handles.
- [x] Solid/transparent/wireframe display, adjustable exploded view; contrasting, individually selectable edge strips and handles.

### Kumo and linked layout — 0.11.0

- [x] Double-click any picked element to open its specific editor, including handles and edge bands.
- [x] Pin matching door boundaries to supporting divisions; moving either updates dependent dimensions.
- [x] Persistent Keep centred constraint follows cabinet/parent resizing and saves in native files.
- [x] View modes available from the bottom camera bar.
- [x] Recommended cabinet type/width/size controls inside Cabinet dimensions; size-only, one Undo step.
- [x] Actual Cloudflare Kumo buttons, inputs, selects, dialogs, tooltips, dropdowns, checkboxes/switches and theme tokens behind replaceable controls.

## Stage 4 — first exact-article TANDEMBOX pack (0.12.0)

- [x] Pinned 500 mm BLUMOTION / M / SW principal fittings with official catalogue evidence and source revision.
- [x] External drawers in leaf openings, stacked front allocations, continuous runner supports and dependency/collision rejection.
- [x] Exact 16 mm bottom/back deductions; distinct purchased metal envelopes and board components.
- [x] Original inspector, Structure/3D selection, Preview/Apply/Cancel, inspection extension, Undo/Redo and schema 12 native/autosave.
- [x] 126 tests, build and local browser creation/history/autosave review; old furnished cabinet retained on the main origin.
- [ ] Complete regional front/back/base fastener articles and quantities, assembly-template preparation and physical fitting trial.
- [ ] Verified inner-tray pack, other lengths/heights and additional motion systems remain later increments.

This is the first Stage 4 implementation, not full production/physical acceptance. See `stage-4-antaro.md`. No reference edits, source push or publication.

## Official Blum source integration — requested 18 November 2026

Use official Cabinet Configurator information in this existing standalone project. First validation target is a drawer cabinet with a Blum box system, starting with the existing antaro M 500 mm pack. See [source and validation plan](blum-source-plan.md).

- [x] Record observed official report/CAD/BXF2 export surfaces and evidence boundaries.
- [ ] Capture a matching configured-drawer reference and original exports with source metadata/fingerprints.
- [ ] Inspect available formats and compare articles, board deductions and evidenced fitting/preparation geometry with the pinned pack.
- [ ] Add focused reference fixtures and explicit pack revisions for validated changes.
- [ ] Establish the permitted asset distribution scope before bundling official files for distribution.

No runtime changes, new manufacturer verification claim, manufacturing output or publication in this documentation increment.

## Current priority — simple cabinet UX baseline

Feature expansion is paused by user request. Default app now exposes only a five-panel cabinet, dimensions/drag resize, selection/panel inspection, camera, name, New/Open/Save and Undo/Redo. Retain the existing design while iterating on the fundamental experience. Do not reintroduce advanced controls until requested.

Previous Stage 4 interface is preserved as `AdvancedApp.tsx`; its implementation and tests remain intact. The simple editor has a separate autosave and rejects advanced files without removing features. Next: collect feedback and refine one interaction at a time, then agree which capability to add back.

## Simple editor — Cabineo and part inspection

Added Cabineo 8/12 from the Workshop reference behind independent catalogue, rule, command and flat-face modules. Full panels and fixed interiors only; preserve None for existing cabinets. Added face-up part thumbnails, optional opposite-face inspection, and matched fitting positions in 3D. Removed generic Interior guidance for selected parts and the move tooltip; header separators share one style. Physical trial and manufacturing geometry remain deferred; see `cabineo.md`.

## Back seating and expanded inspection

Added selected-back thickness, inset/applied/grooves-or-dados/rebate seating, rear inset and seat depth. Geometry, receiving pockets, interior depth, Cabineo layout and native file intent update together. Existing defaults and identities survive. Added thumbnail expansion (Escape/focus return), removed LOCAL and the cabinet-row icon, and removed empty Interior guidance. All Cabineo bores now appear in 3D inspection; simplified fittings have stronger outlines. Manufacturing booleans for circular bores, back fixing articles/holes and physical assembly checks remain outside this iteration.

## One-face planning, true holes, stock and puzzle corners

Implemented reversible stock thickness and interlocking corner intent, matched interior fastener preservation, common-face Cabineo placement where possible, opposed-face/interference notices, numeric increment/decrement controls, actual merged blind-hole cutouts, and puzzle profiles in the 3D/flat previews. Native 15 migrates unchanged; current format is 16. Corner profiles use a target finger width and even divisions. Physical assembly, tool-radius reliefs and production exports remain outside this local preview iteration.

## CNC controls and interior finger joints

Added numeric 3–24 mm stock; total clearance defaults to 2 mm for wooden connection cuts; explicit cutter-sized dogbones; opposed receiver-pilot through conversion; per-side Cabineo count with spacing checks; contextual finger end joints for fixed shelves and dividers. Official Evo horizontal number-input controls replace custom split arrows. Shared clipped cut profiles repair preview overdraw and keep 3D dogbones consistent. Native 17 and strict parsing preserve earlier identities and intent; machining defaults apply to regenerated wood cuts. Physical trial, CNC export and load verification remain outside this local preview.

Completed locally: shared joint editing for multiple shelves or multiple dividers; explicit nested-interior Remove all; validated repair choices for common machining, fitting, back-seat and layout conflicts. Automatic repair is bounded to known constraints; no unsafe geometry or malformed input is accepted to force an edit through.

Completed locally: four-edge back finger joints; applied-back through-pilots with editable per-edge count/diameter and visible stock-based limits; adjustable shelves with editable two-row side drilling counts, stable drilled levels, Backspace and bulk hole-count edits. Physical fitting and joint verification remains deferred.

Completed locally: unified shelf type selection/conversion; centred short Cabineo sets; shared-through or staggered opposing shelf rows, configurable front/rear insets; stock-sensitive support-hole depth; linked/centred adjustment-hole sets; single-corner applied-back pilot pattern.

Completed locally: shared-only opposing holes; multi-opening interior creation; front insets; expiring info banners; collision-free exploded part packing; automatic back pilots from minimum 200 mm spacing; union-aware dogbones; distinct Evo-style element icons.


Completed locally: compact two-column inspector fields, smaller camera-toolbar radius, reduced shelf explosion distance, and simple slab doors/pairs with supported hinge boundaries, direct edits, linked resizing, reversible removal and native round trips. Exact door fittings, drilling and manufacturing outputs remain deferred.


Completed locally: Blum 110° application-specific hinge selection and editable drilling layout; vertical/horizontal pulls, knobs and finger holes with detailed placement; divider order in exploded view; coplanar edge depth separation. Opening has smooth 0–110° clearance motion and swept envelope checks. Exact Blum four-bar kinematics remains outstanding and requires manufacturer linkage data or a measured fixture.


Completed locally: maximum-angle opening action; cup/finger-hole range notes; continuous back thickness; explicit invalid-number feedback; unified stacked number inputs; per-item visibility eyes; title delete icons; full-width hole-set centring; automatic dogbones on finger-joint selection; real-file tooling diagnosis with validated repairs; atomic multi-opening adjustable creation; cap-bridge outline filtering. Exact Blum linkage simulation remains outside this clearance study.


Completed locally: scoped Evo alert notices with expandable detail; affected-item cues; nearest-position back-fixing collision repairs; two explicit thin-back tooling choices; full-width Resolve; muted hidden rows; stable inline item renaming; fixed hinge soft-close capability; small grey labels; contextual door-operation icons; delayed, viewport-safe tooltips.


Completed locally: toolbar-only door control; paired editable/calculated Cabineo fields; native Evo radio choices; transient snackbar feedback; matching rebate seat-depth layout; exterior bottom fastener access; contextual base feet/plinth controls with placement, side returns and evaluated clearance repairs. Exact support articles and verified hinge linkage motion remain pending.

Completed locally: selectable bottom machining face and evaluated two-face repairs; front-pair/four feet with editable pilot drilling; holes-only support display and direct positioning; foot-relative plinth gap; wall support exclusion; 5 mm foot / 40 mm plinth limits; corrected plinth explosion; hinge-zone/shelf repair and part-specific door opening feedback. Exact foot fittings, physical trials, mounting-plate body CAD and proprietary Blum motion remain deferred.

Local costs completion:
- [x] Modal tables, contextual clickable product names, separate sheet/net-area rates, labour/profit and category/grand totals.
- [x] Browser-local price/source defaults and accurate CSV, including profit and sub-cent unit rates.
- [x] Store homepage search, confirmed product matching, public RON quote retrieval, explicit pack conversion and left/right purchase options.
- [x] Six-hour open-modal refresh, manual override, stale-response protection and last-price retention.
- [ ] Hosted price service/closed-app scheduling (not requested for publication).
- [ ] Additional store-specific adapters as real shop links reveal unsupported search/metadata formats.

Completed locally: full/open/rail-pair top and back controls; independent rail widths; optional upper/lower front reinforcement; rail-aware joinery, usable openings, native 42 and downstream cut/label/export integration. Rail strength and load capacity are not manufacturer-verified.
