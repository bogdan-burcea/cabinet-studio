# Architecture decisions

## Evaluation flow

Intent + pinned stock/finish/band records + construction policies → validation → construction bounds and compartment layout → canonical finished panels, cores, band strips, openings and issues → viewport/inspector.

- `domain/`: versioned rectangular cabinet intent; stable cabinet, compartment and feature IDs; top/back modes and independent rail dimensions; material-role bindings and per-panel edge intent. Millimetres throughout. Front layout remains a separate model with optional explicit links from its boundaries to interior divisions.
- `catalogue/`: generic stock, finish and band records, all revision pinned. Hardware research remains disabled. No display colours or renderer dependencies.
- `rules/construction.ts`: authoritative carcass placements/root opening and rail-gap rules. `rules/interiors.ts`: recursive child bounds and division placement using resolved actual interior stock thickness. `rules/validate.ts`: product availability, role compatibility, band references and explanations. Application policies are distinct from manufacturer requirements.
- `geometry/evaluate.ts`: maps resolved placements to canonical panels, with material role/revision, finish/grain, orientation and provenance. `geometry/banding.ts`: maps each broad-face edge to its named direction, finished-envelope strips and board core. Meshes are never authoritative.
- `commands/`: immutable intent transformations; shared preview/evaluate/validate/commit/cancel and bounded Undo/Redo. Invalid previews cannot commit an earlier valid ghost. Dragging commits once. Discrete edits commit directly; invalid changes leave the prior cabinet intact. Duplicate copies edge intent to new feature identity; leaf removal clears that feature's edge data, and Undo restores both.
- `viewport/`: replaceable Three.js adapter, picking, projected constrained handles and camera. Renders canonical cores/strips, finished outlines and legal position guides. Ordinary edits preserve camera. All direct operations have numeric, keyboard or button alternatives.
- `ui/`: focused construction/interior/front/band editors and element lists. Settings commit directly, with one transient owner for a constrained drag. The UI consumes evaluated dimensions, not independent construction calculations.
- `design-system/`: semantic tokens, shared control styling, icon adapter, Graphite/Linen themes and finish presentation palette. Finish IDs are cabinet data; their rendered colours are presentation. Theme changes cannot change product identities or dimensions.
- `persistence/`: strict native schema 11 / evaluator `constraints-11`, tree complexity/identity validation, revision checks and copied migrations from schemas 1–10. Browser autosave v11 preserves older keys. A corrupt newest record never silently falls back to an older one.

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

No nesting, CAM/export, production documents, labels, costs, project/room layout, legacy Cabinet Workshop importer or placeholder services. No hosting manifest, site registration or automatic deployment. Development remains local, on `feat/stage-3-fronts`; publication requires explicit user instruction.

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

## Stage 3 — independent slab fronts and handles

`Cabinet.fronts` stores slab IDs, normalized independent coverage rectangles, overlay/inset placement, handing, reveal/clearance, optional material binding and concept handle intent. Front regions are not compartment IDs. Creating a cover captures a region; aligned boundaries may link to a division so dependent dimensions follow that division without deleting either feature. One cover may span several compartments. Splitting preserves the first ID and copies binding, handle and band intent to a new ID. Removal clears that door's bands; Undo restores both.

`catalogue/fronts.ts` owns declared concept defaults/handle geometry. `rules/fronts.ts` derives closed slabs, edge pivots, handle primitives, depth and compatibility issues. It checks coverage bounds/overlap, model-size policies, handle envelopes and inset collisions against canonical construction/interior bodies. Existing contents are never trimmed to accept a door. Exact fitting rules are deferred by user instruction; no hinge, screw, bore or load claim is invented.

The existing material/band pipeline accepts role `front` with a panel ID. Each door may inherit carcass material/finish/grain or override it. Material changes can target the selected door or all fronts, without extending/changing the existing material-role storage. Closed dimensions, core/strips, handle pins and all previous intent survive native round trips. Schema 8 / `fronts-8` validates exact door/region/handle shapes and identities against fronts, handle parts, contents, structural tree and installation IDs. Schemas 1–7 upgrade as copies with empty fronts and unchanged geometry; older keys/files remain untouched.

`commands/fronts.ts` owns immutable add/update/split/remove transactions. `FrontInspector` exposes only the selected door, handle or split task, commits directly and offers validated corrections after invalid edits. `viewport/front-pose.ts` defines clamped illustrative opening. The Three.js adapter groups a door's core, bands and handles about its conceptual edge pivot; pose/render mode/explosion stay in React presentation state. Canonical geometry remains closed and is never reconstructed from meshes. Recursive picking handles transformed front groups while retaining opening/interior picking semantics. Fit uses displayed bounds including posed doors and floor reference; ordinary edits preserve camera.

## Focused workspace

The viewport owns the main workspace. `ui/workspace-actions.ts` maps selection to contextual actions; task editors open in `EditorDialog`, reusing independent feature inspectors. Side headers hold file/history commands and a secondary menu. Structure groups collapse independently. `commands/selection.ts` routes recoverable deletion through the existing transaction path and protects generated parts and occupied parents. Keyboard deletion ignores editable targets and modal editors.

`commands/interior-creation.ts` builds stable-identity candidates with position and setback available before creation. Inset-door geometry suggests clearance without mutating existing fronts. Fixed/divider `fixed-2` stores explicit front setback, shortens only its panel depth and preserves child opening depth. Legacy `fixed-1` intent remains unchanged. Schema 9 copies older files and autosaves; no source file is overwritten. Workspace styling remains in the replaceable design system.

## Direct editing and door constraints — 0.10.0

Fields commit on Enter/blur and discrete choices commit immediately through CabinetStore. Creation has one Add action; constrained drag state remains internal and commits on release. Feature editors no longer expose preview/apply controls. Material/finish/grain editing and role terminology are deferred; prior native values remain dormant for lossless compatibility and dimensional preservation. Viewport colours are neutral theme presentation. `BandingInspector` edits the selected edge or a selected panel's four named edges, without a material-role selector.

`connectedDoors` derives a front layout from regions sharing an edge with positive overlap, including saved split layouts; placement changes the entire connected layout, while handle/handing edits stay per leaf. Vertical splitting assigns outside left/right hinge edges. `supportedHingeSides` checks side panels or vertical dividers at two conceptual mounting positions and within a 40 mm front zone. These are modelling constraints, not manufacturer hinge/plate or drilling rules. Moving a mounting divider, resizing the body or changing setbacks revalidates dependent fronts. Inset boundaries reserve the faces of internal dividers/shelves only at aligned region edges; other interiors must clear the slab depth.

`commands/corrections.ts` prepares complete, validated candidates for inset setbacks, supported handing, new mounting dividers, nearby divider alignment and handle fit. The UI names the changes and executes the chosen repair plus the original request as one Undo step. No speculative invalid candidate is offered, and unrelated contents are retained.

`viewport/display.ts` owns presentation offsets for exploded geometry. Render mode and explosion never enter Cabinet intent or native files. Each band and handle has a distinct semantic picking identity; bands move with their panel and handles with their door. Exploded views disable geometry drag handles. Schema 10/evaluator doors-10 pin revised door validation and inset evaluation; migrations copy older files, and invalid old layouts are rejected with their source preserved.

## Kumo and linked layout — 0.11.0

`rules/front-links.ts` resolves optional stable `boundaryLinks` against the interior layout. Matching edges are pinned before divider movement, centering, door dimension edits and UI cabinet resizing; existing links are not retargeted. `commands/fronts.resizeDoor` moves the linked boundary's division (or a free front seam), resizing adjacent leaves together. Hinge support, clearances, nested contents and handle fit still validate the complete transaction. Removing a division snapshots free door regions and detaches its links; a hinge-bearing removal is still rejected. Body-size commands and recommended dimensions preserve all non-size intent.

`SplitNode.anchor = centre` resolves position to half the current parent span on each evaluation, including nested parent changes. The stored numeric position is retained as a fallback. Explicit movement releases centering; the Keep centred action and constrained-drag centre snap persist it. Old files without this field keep absolute positions. Native schema 11/evaluator constraints-11 strictly validate new fields and preserve older source copies.

The Three.js adapter owns the double-click listener and uses the same semantic picking as selection. `editorForElement` chooses the selected task without importing the renderer into UI rules. Bands have small invisible interaction targets, so thin strips are usable; nearest real occluders retain priority. Targets never alter canonical geometry. View modes live in the camera bar.

`design-system/controls.tsx` adapts installed @cloudflare/kumo 2.19.0 controls, native editor values and local icons. The official standalone CSS is imported once; `design-system/kumo.css` maps the existing shell to Kumo tokens and handles the cabinet workspace layout. Kumo Dialog owns modality/focus, Kumo Select owns popups and keyboard options, and Kumo DropdownMenu/Tooltip own secondary commands and help. The app root is isolated so portals layer above it. Data/rules/geometry remain independent of Kumo. Recommended dimensions use the existing conceptual open/base/wall/tall size catalogue and change size only.

## Current presentation and Stage 4 — 0.12.0

The user reverted interface redesigns to the original Stage 3 shell/inspector. Earlier modal/Kumo/workspace notes are historical. Cabinet rule improvements and native compatibility remain independent of presentation.

`catalogue/drawers.ts` pins the first exact-article TANDEMBOX antaro M 500/SW/BLUMOTION assembly and primary-source evidence. Optional `Cabinet.drawers` preserves old empty cabinet shapes. Each drawer stores a pack revision, leaf-opening identity, allocation offset and height. `rules/drawers.ts` derives board dimensions, simplified metal envelopes and issues, independently of rendering and React. The existing validator and evaluator reject dependent invalid changes atomically. No manufacturer CAD or machining is inferred.

`commands/drawers.ts` adds, updates and removes complete drawer intent through the existing store. `DrawerInspector` uses the restored preview/apply interaction; Structure and the Three adapter select stable drawer-owner IDs. Inspection extension translates moving components only; runner envelopes remain fixed and native intent is unchanged. Fit includes displayed moving solids.

Schema 12 / `drawers-12` validates exact drawer keys, pins and generated identities, preserves old schema revisions and copies previous autosave keys. Named principal articles and board deductions are drawing-checked; regional fastening completion and physical trial fitting remain explicit outstanding gates in `stage-4-antaro.md`.

## Simple UX entry point

The default `App` now assembles only basic cabinet controls around the existing evaluator, command store and viewport. `AdvancedApp.tsx` retains the previous feature-rich UI as source without being imported by the default entry. Shared components and canonical geometry remain reusable.

`domain/simple-cabinet.ts` defines the basic feature boundary. `persistence/simple.ts` validates a native file against that boundary and owns an independent simple autosave key. Neither advanced autosave keys nor advanced files are modified or stripped. All size, new and load operations retain the existing transaction/Undo model.

## eBay Evo presentation boundary

The current entry imports pinned official Skin component CSS and Evo tokens. UI adapters supply the documented semantic markup; `evo.css` supplies cabinet-editor layout and CAD overlays. Market Sans and icon assets are local. Generated dark declarations preserve upstream values while supporting the explicit app theme toggle. The Three adapter receives resolved semantic presentation colours through `evo-viewport.ts`; no design-library dependency enters domain, rules, persistence or canonical geometry. See `design-system-evo.md` for the source/verification record.

Cabineo joinery is a separate derived rule module (`rules/cabineo.ts`), pinned by a cabinet hardware product/revision. The simple editor allows None, Cabineo 8 or Cabineo 12. `geometry/part-face.ts` maps a selected physical face to a flat thumbnail, keeping opposite-face operations separate. Schema 13 / `joinery-13` preserves older cabinets and migrates version 12 without enabling joinery. The simple autosave key remains isolated.

Back seating is resolved by `rules/back-panel.ts` and changed by `commands/back-panel.ts`. Optional `carcass.back.joint` uses revision `back-1`; absent intent preserves the original inset back. Schema 14 / `back-14` migrates earlier files without assigning a new construction. Back stock supports 3/6/9/12/16/18 mm. Applied backs occupy overall envelope depth, shortening the carcass from the rear rather than growing the cabinet. Grooves/dados and rear-open rebates add receiving pockets and sheet engagement, with explicit clearance and remaining-stock checks. Interior depth and Cabineo placement follow the resolved back front face.

`viewport/part-mesh.ts` creates display geometry for rectangular receiving cuts independently of canonical panel bounds. All Cabineo bore circles/depth contours are represented; normal boards occlude buried bores, while transparent/wireframe inspect the complete arrangement. Accessory outlines stay legible in these modes. `PartThumbnail` shares its face geometry with an accessible native dialog; closed/expanded views do not alter cabinet intent.

Back fasteners are derived separately in `rules/back-fasteners.ts`, adapted from read-only Workshop `workbench/back-connectors.js`. Optional `back.joint.fastener` pins `hafele-26009765@rpc-1` and per-side count; native schema 15 / `back-fixings-15` preserves version 14 and earlier intent. Matched requirements are stock ≥15 mm, captured 3 mm back, seat depth ≤6 mm and bore centre ≥12 mm from the rear edge. Selecting the fitting uses `setBackFastener` to adopt compatible back settings in one reversible command; disabling retains seating. Default two bores on each side plus one top/bottom, Ø15 ×12.5; no holes in the back. Count/layout uses Workshop’s 50 mm end setbacks and ≥30 mm pitch, with unsupported wall hardware rejected. See [Häfele FF 2.56](https://hafelethailand.com/wp-content/uploads/2025/12/02-connector-technology-shelf-supports.pdf#page=56), the source recorded in Workshop; this is not a physical/load verification claim.

3D inspection now renders fastener bores only, including Cabineo and back connector bores, without accessory body meshes. The same back bores are available to selected physical-face thumbnails. Camera fits no longer run on exploded-mode changes; ordinary selection/editing already retains camera state. The whole compact Move pill owns pointer interaction, with drag versus tap handled by the viewport adapter and edits remaining on the command path.

Schema 16 / `machining-16` adds optional `carcass.corner` (`puzzle-1`, target pitch). `rules/puzzle.ts` partitions all four horizontal/side corners into alternating through-cut fingers with even spacing capped by the target width. Horizontal panel bounds extend across the side thickness; complementary notches partition the original assembled volume. Full top required. `commands/stock.ts` changes declared carcass thickness (12/15/16/18/19/22/25 mm); inherited interiors follow it. Back stock stays separate. Puzzle corners suppress only top/bottom corner Cabineos, retaining fixed-interior fittings and their product pins.

Cabineo host housing faces now follow a common machining face fixed by incoming receiver bores and blind back seats. Genuine opposed blind features remain intact and generate a visible machining warning, following Workshop's one-side review principle. `rules/machining-review.ts` also checks cylindrical drilling volumes against third elements and receiving-seat/puzzle cuts, excluding intended joint partners. Existing matched-fitting overlap validation remains transactional; review warnings do not delete user geometry. Warnings appear in the inspector and a dismissible notice.

`viewport/part-mesh.ts` uses pinned `polygon-clipping@0.15.7` to subtract merged circular and rectangular profiles in thickness layers, builds actual cavity floors/walls, and omits internal layer caps. No hole-overlay cylinders/discs remain. Smooth wireframe outlines suppress cylinder facets. A bounded clone cache avoids repeating profile booleans during selection/theme changes. Tests compare analytic merged-hole volume and assembled puzzle volume. These are inspected model cuts; tool-radius reliefs, fit tolerance validation, CNC outputs and physical/structural trials are not introduced.

Native format 17 / `cnc-17` adds optional carcass machining intent (`cnc-1`: total tolerance, cutter diameter, dogbone toggle, opposed-pilot conversion, Cabineo per-side count) and split-node finger intent (`finger-1`, target width). Default total wood-connection clearance is 2 mm; zero is explicit. Fitting bores retain matched diameters/depths except user-authorized opposed receiver pilots that become through bores from the common face. Connector housings and back connector bores stay blind. Previously unsupported two-face pilot layouts can now share a machining face. Screw interference validation remains active before conversion.

`finger-interiors.ts` expands each selected shelf/divider into its actual supporting panels and derives complementary through slots. Cabineo hosts are omitted only for interiors using finger ends; returning to butt ends restores derived global fittings. Stable part/split identities and reversible transactions are retained. Generic stock pins now support canonical decimal thicknesses from 3 to 24 mm; existing catalogue pins remain readable. Exact hardware stock limits remain enforced.

`cnc.ts`, `dogbones.ts` and `cut-profiles.ts` resolve clearance and circular cutter reliefs. Relief circles use the actual cutter radius and 45° corner offset and are applied only at internal rectangular-cut corners. Both the layered 3D renderer and `part-preview.ts` consume these same profiles. All blind marks and bore unions are intersected with the finished silhouette, fixing marks protruding through puzzle notches. Profile coordinates are snapped to 0.000001 mm before polygon booleans to avoid degenerate rings at fractional finger spacing; the mixed 19 mm stock/back groove/Cabineo/dogbone case has a regression fixture.
