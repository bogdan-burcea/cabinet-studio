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
- `persistence/`: strict native schema 4 / evaluator `materials-4`, tree complexity/identity validation, revision checks and copied migrations from schemas 1–3. Browser autosave v4 preserves older keys. A corrupt newest record never silently falls back to an older one.

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

No nesting, CAM/export, production documents, labels, costs, project/room layout, legacy Cabinet Workshop importer or placeholder services. No hosting manifest, site registration or automatic deployment. Development remains local, on `feat/stage-2-materials`; publication requires explicit user instruction.
