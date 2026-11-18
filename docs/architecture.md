# Architecture decisions

## Evaluation flow

Intent + pinned stock/finish/band records + construction policies → validation → construction bounds and compartment layout → canonical finished panels, cores, band strips, openings and issues → viewport/inspector.

- `domain/`: versioned rectangular cabinet intent; stable cabinet, compartment and feature IDs; top/back modes and independent rail dimensions; material-role bindings and per-panel edge intent. Millimetres throughout. Front layout remains separate from interior divisions.
- `catalogue/`: generic stock, finish and band records, all revision pinned. Hardware research remains disabled. No display colours or renderer dependencies.
- `rules/construction.ts`: authoritative carcass placements/root opening and rail-gap rules. `rules/interiors.ts`: recursive child bounds and division placement using resolved actual interior stock thickness. `rules/validate.ts`: product availability, role compatibility, band references and explanations. Application policies are distinct from manufacturer requirements.
- `geometry/evaluate.ts`: maps resolved placements to canonical panels, with material role/revision, finish/grain, orientation and provenance. `geometry/banding.ts`: maps each broad-face edge to its named direction, finished-envelope strips and board core. Meshes are never authoritative.
- `commands/`: immutable intent transformations; shared preview/evaluate/validate/commit/cancel and bounded Undo/Redo. Invalid previews cannot commit an earlier valid ghost. Dragging commits once. Construction and material edits are reviewed transactions. Duplicate copies edge intent to new feature identity; leaf removal clears that feature's edge data, and Undo restores both.
- `viewport/`: replaceable Three.js adapter, picking, projected constrained handles and camera. Renders canonical cores/strips, finished outlines, ghost previews and legal position guides. Ordinary edits preserve camera. All direct operations have numeric, keyboard or button alternatives.
- `ui/`: separate construction/material/interior inspectors and element list. One preview owner at a time; starting another feature's edit cancels the previous unapplied draft. Roles and inheritance are explicit. The UI consumes evaluated dimensions, not independent construction calculations.
- `design-system/`: semantic tokens, shared control styling, icon adapter, Graphite/Linen themes and finish presentation palette. Finish IDs are cabinet data; their rendered colours are presentation. Theme changes cannot change product identities or dimensions.
- `persistence/`: strict native schema 7 / evaluator `interiors-7`, tree complexity/identity validation, revision checks and copied migrations from schemas 1–6. Browser autosave v7 preserves older keys. A corrupt newest record never silently falls back to an older one.

Evaluation remains small and synchronous. Future asynchronous work must carry revision IDs and reject stale results. Native-file reading already checks the command revision before installing its result.

## Construction policy `construction-1`

X right, Y up, Z front; front is Z=body depth. Sides run full height/depth. Bottom and full top fit between sides. Two top rails may replace the full top, retaining the same top-zone height. Their front/rear depths are independent.

The full back uses its own back stock inside the carcass. Alternatively, upper/lower rear rails span the inner width, between bottom and top zone, using carcass stock. All shelves/dividers begin in front of the selected rear construction thickness. This conservative uniform reservation avoids rail/interior overlap without notching or silently deleting features. Rail-pair gaps must be at least 20 mm; sizes are 20–600 mm in 0.1 mm steps. These are modelling policies. Joinery, fastening, racking, suspension and physical load verification remain unassigned.

Panel IDs derive from cabinet identity and semantic role. Switching a full panel to rails introduces semantic rail IDs and restores the same full-panel ID when switching back. Inactive panel band settings are retained; material roles are preserved. No fitting substitutions are made.

## Compartment policy `fixed-1`

Each opening leaf stores its ID. A split retains that node ID and stores a separate feature ID, axis, absolute local centre position and two children. Divisions use resolved interior stock thickness, which either inherits all carcass material settings or is an explicit override. Changes to parent bounds regenerate descendants while stored positions remain unchanged; invalid dependencies reject the edit.

Minimum clear openings are 60 mm, precision 0.1 mm, complexity at most 63 divisions/32 nested levels. Dragging snaps to an application 5 mm grid or centre. No shelf-support hole pattern is inferred. Nested parent removal is blocked until child divisions are removed. Duplicate uses the largest descendant leaf and preserves existing identities.

## Materials and edge geometry

Carcass stock drives sides/bottom/top/rails. The full back has an independent binding; interiors inherit carcass stock/finish/grain until overridden. All stock, finish and band choices pin ID + revision. Grain intent uses broad-face axes: sides/dividers U=depth,V=height; horizontal panels U=width,V=depth; back/vertical rails U=width,V=height. Display finishes do not set material thickness.

Per-panel band intent maps stable panel IDs and edge keys (`u-min`, `u-max`, `v-min`, `v-max`) to exact band pins. Edges have stable derived IDs. Finished size includes banding. Core size subtracts opposite band thicknesses; strips occupy that envelope. For schematic corner partitioning, V strips span the full U dimension and U strips stop between them, so strips/core do not overlap. This is visual/canonical physical composition, not a machining strategy or cut-size output. Surface finish and grain do not change geometry.

Removing a leaf division explicitly removes its own edge intent; Undo restores the original ID and settings. Changing top/back mode keeps inactive full-panel/rail edge intent. Unknown/dangling panel references are rejected.

## Native migrations and release boundary

Schema 1 (`carcass-1`) and schema 2 (`interiors-2`) gain full-top/full-back defaults as copies. Schema 3 (`construction-3`) retains exact top/back settings. All gain unspecified finishes, no specified grain, inherited interiors and no bands, preserving existing stock pins and finished geometry. Original files and browser keys remain untouched; migration is disclosed. Unknown future schemas/revisions never substitute products or reset to defaults.

No nesting, CAM/export, production documents, labels, costs, project/room layout, legacy Cabinet Workshop importer or placeholder services. No hosting manifest, site registration or automatic deployment. Development remains local, on `feat/stage-2-completion`; publication requires explicit user instruction.

## Installation policy `support-1`

`domain` stores support mode, pinned concept geometry, height/setbacks, cover gaps/returns and an optional plinth material override. `catalogue/installation.ts` declares provisional geometry with no manufacturer/article claim. `rules/installation.ts` owns foot primitives, floor/installed height, plinth placements and clearance rejection. `commands/installation.ts` edits intent through the shared transaction path. `InstallationInspector` presents reviewed edits; the viewport consumes canonical feet/panels and has no layout rules. Theme support colour and cover visibility remain presentation.

The body origin and every existing body/interior panel remain fixed. Feet extend below the body; floor Y is body-origin Y minus foot height. Four semantic foot IDs each own plate/post/base primitives. Front/rear rows and left/right columns must have disjoint 60 mm envelopes. Front/side plinth covers retain at least 5 mm from foot envelopes. Front cover spans the width; returns stop at its inner face. Foot height is 70–200 mm; gaps 0–20 mm; cover height is derived. These are concept policies, not verified hardware assembly or structural rules. No clips or drilling are invented.

Plinth material inherits carcass stock/finish/grain unless overridden. Its panels pass through the existing band/core evaluator, preserving dormant edge intent. Unassigned/direct-floor modes retain settings but produce no feet or covers. Schema 5 copy migrations add default unassigned installation to schemas 1–4, preserving all prior materials, banding, tree and construction settings; previous files/keys remain untouched.

## Mounting policy `mounting-1`

`domain/Installation.mounting` retains independent none/restraint/suspended intent, exact concept geometry pin, wall gap, centre from top, shared side setbacks and floor clearance. `catalogue/mounting.ts` declares application geometry without purchased articles. `rules/mounting.ts` produces one wall rail and two bracket envelopes, semantic IDs, wall Z, mounting height and fit errors. It does not alter construction bounds, reserve interior space, cut a back or claim a cabinet attachment. All geometry is behind the body rear; the bracket/rail volumes meet at a face without overlap. UI and renderer consume this result; colours remain design-system tokens. A Rear perspective is presentation state.

`commands/mounting.ts` releases floor support to unassigned when suspension is reviewed/applied, retaining feet/plinth and all material/band settings. Wall restraint requires active floor/feet; suspension rejects active floor/feet. Support mode edits also use this shared validation. Suspended floor Y is body-origin Y minus body clearance, while body geometry stays fixed. Installed height means body top above that floor, not the body alone. Ordinary edits preserve camera; explicit Fit includes the floor clearance and wall gap.

Mounting is a provisional spatial concept with no verified hanger/rail pair, cabinet preparation, wall anchors, fasteners, structural capacity or physical trial. It is not an enabled fitting pack; `hardware` remains empty. No real-product deductions are invented. Schema 6 copies schema 5 installation unchanged and adds disabled mounting. Schemas 1–4 retain their previous migration behavior plus disabled mounting. Original files and browser keys remain untouched.

## Adjustable contents and reviewed presets

Adjustable shelves live in `Cabinet.contents`, reference a leaf opening and retain a support-level integer, front setback and concept support/policy revisions. They do not split the compartment tree. `catalogue/shelves.ts` owns application concept data. `rules/adjustable.ts` owns shelf/pad placements, legal positions, snapping, clearances and issues. Underside height is first level + index × pitch, so material thickness changes the centre/top while retaining the selected support level. Shelf panels pass through the existing material/edge evaluator. Four pads have stable derived IDs and select their owning shelf; they do not model a purchased fitting or drill holes. Fixed divisions and adjustable contents share a viewport move affordance while using their own snap rules through the command path.

Commands cover add/move/front setback/duplicate/remove and reviewed fixed/adjustable conversion. Duplication carries band intent; removal clears it and Undo restores it. Conversion preserves the feature/panel ID and bands, and requires empty child openings/no sibling adjustable shelves before a structural split is changed. Disappearing parent references and invalid spacing/stock/depth edits fail atomically. Tree and content identities, including pad IDs and construction/installation reservations, share strict native validation.

`catalogue/presets.ts` declares four application arrangements; `commands/presets.ts` changes existing envelope/construction/installation intent without a second cabinet generator or saved cabinet-type flag. Suggested sizes are opt-in. Trees, contents, bindings, edge pins and dormant settings are never deleted/reset. Review, invalidation, Apply/Cancel and Undo use the existing store. Each preset's concrete resulting intent is saved; presets cannot silently update a saved cabinet later.

Schema 7 / `interiors-7` permits only known adjustable contents and strict pins. Schemas 1–6 continue copied migration with empty contents and unchanged prior geometry. Autosave v7 preserves all older keys. `catalogue/stage2-fittings.ts` records the six user-supplied article references and source/verification state separately from executable geometry. The read-only reference inspector clearly says NOT APPLIED. These records do not enter cabinet intent, substitute a concept profile or enable a hardware assembly.

## Viewport selection policy

`viewport/picking.ts` separates virtual opening targets from visible physical parts. The nearest visible solid surface controls occlusion. Interior shelf/divider faces and their strips/support pads can be selected behind an opening plane; carcass surfaces behind the plane remain opening background. Foreground carcass/back parts retain normal picking; back-cutaway meshes/strips explicitly pass through. This policy only affects selection and never modifies domain/geometry or persisted intent. Real Three.js raycasting fixtures cover the proxy/occlusion cases.
