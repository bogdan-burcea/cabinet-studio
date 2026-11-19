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

Native format 17 / `cnc-17` adds optional carcass machining intent (`cnc-1`: total tolerance, cutter diameter, dogbone toggle, opposed-pilot conversion, Cabineo per-side count) and split-node finger intent (`finger-1`, target width). The original 2 mm default is superseded by the fit-allowance correction below; zero remains explicit. Fitting bores retain matched diameters/depths except user-authorized opposed receiver pilots that become through bores from the common face. Connector housings and back connector bores stay blind. Previously unsupported two-face pilot layouts can now share a machining face. Screw interference validation remains active before conversion.

`finger-interiors.ts` expands each selected shelf/divider into its actual supporting panels and derives complementary through slots. Cabineo hosts are omitted only for interiors using finger ends; returning to butt ends restores derived global fittings. Stable part/split identities and reversible transactions are retained. Generic stock pins now support canonical decimal thicknesses from 3 to 24 mm; existing catalogue pins remain readable. Exact hardware stock limits remain enforced.

`cnc.ts`, `dogbones.ts` and `cut-profiles.ts` resolve clearance and circular cutter reliefs. Relief circles use the actual cutter radius and 45° corner offset and are applied only at internal rectangular-cut corners. Both the layered 3D renderer and `part-preview.ts` consume these same profiles. All blind marks and bore unions are intersected with the finished silhouette, fixing marks protruding through puzzle notches. Profile coordinates are snapped to 0.000001 mm before polygon booleans to avoid degenerate rings at fractional finger spacing; the mixed 19 mm stock/back groove/Cabineo/dogbone case has a regression fixture.

### Local bulk editing and conflict repair

The simple editor keeps a transient set of same-axis fixed-interior selections. Shift/Cmd/Ctrl-click in Structure or 3D toggles membership; normal selection replaces the set. Shared joint commands preserve individual pitches unless a shared pitch is entered. Bulk changes and explicit nested subtree removal use one CabinetStore transaction and remain native-file compatible without schema changes.

`commands/edit-repairs.ts` evaluates rejected candidates and offers only whole-cabinet-valid alternatives for cutter/slot, back seating, fitting thickness/count and displaced-interior conflicts. Whole-mm searches select the first passing value in a stated direction. A modal retains the requested candidate, describes the additional change and presents a selector when alternatives exist. It verifies the original committed object before applying; stale proposals cannot overwrite newer work. Unsupported or malformed edits remain rejected. Geometry-only evaluation exceptions are captured by the store as rejected edits rather than escaping into the UI.


### Joint fit allowance correction — native 18 / fit-18

Default total mating clearance is 0.2 mm. At an internal mating edge each opposing cut offsets by half the allowance, so the assembled gap is the entered value. Receiving slots centred on panel thickness widen by the entered allowance (18 mm stock → 18.2 mm receiving slot). The setting never changes fitting hole diameters and is never increased to accommodate a cutter. Explicit saved settings are retained; older file revisions remain readable. Finger/corner longitudinal offsets now consistently use half-allowance rather than the previous quarter-allowance.

Oversized cutters produce a separate, non-blocking machining notice. Slots retain their designed profiles and dogbones are omitted only where that cutter cannot enter. Fit controls increment in 0.1 mm steps. Repair proposals no longer change fit allowance to satisfy tool diameter.

### Back fingers, applied pilots and adjustable shelf drilling — native 19

Back construction adds `finger` plus target `fingerPitch`; `rules/back-fingers.ts` generates complementary through-cut profiles around all four edges with corner blocks owned by the carcass. Back silhouette and carcass cuts share the existing fit/dogbone profiles and preserve outer envelope depth. Selecting an incompatible legacy back fitting follows the existing explicit conflict-repair flow.

Applied backs use optional `back-pilot-1` count-per-edge and diameter intent. `rules/applied-back.ts` centres rows on each perimeter carcass panel's stock centre, drilling through the back only. Diameter is limited to one-third of carcass stock (an app modelling policy); count is limited by available edge length, end setbacks and a spacing rule of max(stock thickness, 3×diameter). The inspector displays both calculated limits.

New simple adjustable shelves retain the existing `adjustable-1` placement and add `shelf-holes-1` with count and stable first level. `rules/shelf-drilling.ts` resolves two Ø5 mm rows per side at 32 mm pitch into the actual side or dividing panels, with blind depth ≤8 mm and at least 2 mm of outer stock. This is a geometric study, not a verified fitting assembly. Movement snaps to drilled, unoccupied levels and never moves the drilling window. Count edits preserve the active level and regenerate the window; overlapping physical holes are deduplicated. New holes feed the common flat preview, actual 3D cuts, physical-face planning and interference review through `EvaluatedCabinet.drilling`. New shelves do not receive Cabineo assemblies. Legacy conceptual shelf data remains distinct. New drilling intent is strictly parsed under native 19; versions 1–18 remain readable.

### Shelf pattern review — native 20

`rules/shelf-pattern.ts` separates hole-set centre/anchor from shelf position. Optional hole anchor, centre height, opposing-row mode and front/rear insets extend strictly parsed drilling intent under format 20; versions 1–19 remain readable. The inspector expresses centre height from the cabinet's inside floor, while stored manual offsets remain local to their opening. Centred anchors recompute with opening height. Matching patterns across a shared divider link centre/count/layout edits in one transaction, and new opposing shelves inherit the existing matching pattern. Shelf movement selects an existing hole without moving the pattern.

`rules/shelf-drilling.ts` retains both faces until pairing is resolved. Matching opposing coordinates become a single through cut, fixing the previous face-insensitive deduplication. Offset mode deterministically staggers one side's rows by the smallest usable multiple of 6 mm, with symmetric front/rear shifts. Below 5 mm receiving stock, all support bores go through and opposing rows always stagger. Otherwise blind support bores are 4–8 mm deep (at least 1 mm outer stock). These are geometric planning rules, not fitting capacity claims.

Cabineo custom counts now use a centred span capped at 300 mm per interval, rather than forcing every count to the maximum span. Minimum 50 mm end setback, minimum 20 mm spacing, hole sizes and actual fitting interference checks remain in effect. Applied-back pilots now include exactly one hole per corner in vertical rows; horizontal rows distribute symmetrically inside the corner locations. Pilot counts start at two per edge; old explicit count-one intent migrates to two to include corners.

### Local interior UX review — native 21

Current drilling always shares opposing rows. Matching coordinates merge into through holes, and sub-5 mm supports drill through without staggering. Per-support rows use the common usable depth so a front-inset shelf retains alignment across a shared divider. Format 21 removes retired opposing/row-offset fields while migrating formats 1–20. Applied-back pilots now persist `spacing` (minimum, default 200 mm) plus diameter; old manual counts migrate to automatic spacing. Vertical rows retain one hole at every corner on short edges; horizontal rows distribute symmetrically inside those corners.

`commands/simple-interiors.ts` performs bulk creation in selected leaf openings and bulk front-inset edits through the existing transaction path. Creation returns stable feature IDs for joint selection. Inset defaults to 0 and is measured from the cabinet front; the simple native-file gate now admits fixed-2 inset intent. Adjustable supports retain at least 60 mm usable depth, adapting row locations to that depth.

`viewport/display.ts` packs exploded shelves in front of the body and dividers into separate side lanes, then separates any residual bounding-box collision for optional panel roles. Offsets remain presentation-only and Fit uses displayed bounds. Opening selection overlays are omitted in exploded view. Dogbone generation samples the remaining profile at each corner across all cuts on the same physical face: only a three-solid-quadrant concave corner receives relief. Straight edges, convex tips and already-open corners no longer acquire redundant circles.

Shared notices expire after 6 seconds (9 for errors), pause on interaction and clean up timers on unmount/message changes. Dismissing info does not cancel a valid geometry preview. Distinct element icons in Structure and the inspector header are Evo-style CAD extensions, with native 16/24 px paths and explicit 2 px strokes to override Skin's fill-icon default.


### Simple slab doors — native 22

`commands/simple-doors.ts` adapts the existing front layout and support rules to simple slab doors without handles or material controls. Single/pair creation works on the cabinet or selected openings; connected leaves share placement and gaps, and existing boundaries keep door/divider sizes linked. Conflict repairs can set interiors back, add a hinge support or replace overlapping covers after a validated user choice. Native 22 admits these fronts without stripping advanced documents. Door angles remain view state; exploded mode closes doors for collision-free packing. Shelves now use a compact forward gap instead of a full-depth translation. Paired inspector fields use shared Evo number inputs with short visible labels and explicit accessible names.


### Door hardware — native 23

`rules/door-hardware.ts` resolves Blum 110° application articles and door/support drilling independently of rendering. `DoorHardwareInspector` edits hinge and generic handle settings through one transaction path. Optional native 23 fields preserve old slab intent. `rules/door-motion.ts` supplies a front-edge clearance transform and oriented-envelope sweep checks; manufacturer four-bar motion remains unverified. See `door-hardware.md` for dimensional sources and limits. Exploded interiors use radial centre separation to retain the divider order; polygon depth offsets separate mesh surfaces from coplanar outlines.


### Review controls and repair flow — native 24

Continuous `generic-back-N` pins use the same 3–24 mm / 0.1 mm range as small-box stock. Earlier native files retain explicit choices. Finger-joint commands for corners, back and interior ends enable dogbones atomically. `commands/tooling-repairs.ts` offers only complete, evaluated configurations that remove the cutter-width notice without changing the joint fit allowance.

Bulk interior creation builds a door-free geometry candidate, completes shelf hole-set anchors and front insets, then restores the unchanged fronts for final validation. Inset conflicts therefore reach the regular repair dialog instead of throwing during partial creation. The original fronts and stable feature IDs survive the transaction.

`panelDisplayEdges` rejects cap-triangulation bridges using orthogonal/circular machining-profile provenance. It preserves real hole/relief arcs and does not change solids. Visibility is independent App view state: hidden panels, front accessories and opening proxies are omitted from the viewport and picking, but remain in canonical geometry, validation and saved documents. Numeric fields publish a scoped feedback event for rejected range/non-finite input and legal-position snapping. Inspector title removal uses the official Evo delete icon.


### Scoped alerts, labels and connection repairs — native 25

Machining review now reports affected part IDs and bore operation IDs. `MachiningChecks` uses Evo warning section notices, a summary with expandable details, and a full-width repair action. The inspector shows issues for the selected parts; the cabinet scope shows all issues. The left tree keeps a persistent warning cue for each affected part, avoiding repeated global banners. User-action notifications use information/attention section notices.

`commands/machining-repairs.ts` searches whole-mm offsets for the matched top/bottom back-fixing pair. Each offered left/right alternative passes geometry and back-fixing collision review, and is the nearest valid point in that direction. The optional pinned back-fastener offset persists in native 25. Tooling repair offers thicker back stock even with Ixconnect, explicitly including removal of that incompatible fitting. Joint clearance remains unchanged.

`StructureItem` supports double-click inline naming and click-away save. Names are optional ID-keyed metadata; geometry labels and inspector titles resolve them without changing identities or dimensions. Native 25 strictly validates these labels and migrates legacy hinge soft-close switches away; BLUMOTION soft close comes from the product catalogue. Tooltip overlays render through a portal, default below, flip when space is insufficient and clamp to the viewport. Hover/focus delay is 2 seconds, leave delay 1 second, with outside focus/click/scroll dismissal and only one active tip.


### Base supports and toolbar controls — native 26

`commands/simple-supports.ts` exposes the existing support-1 geometry through contextual base-cabinet controls. Four feet have editable height and placement; plinth covers have optional side returns, front setback and floor/top gaps. Installation validation and evaluated repair candidates keep body/foot/plinth clearances explicit. Simple files now admit these supports alongside Cabineo and all existing interior/front features. Optional `cabinetType` intent retains the base style when body dimensions change; choosing a size preset still does not turn support features on.

Bottom Cabineo housing faces are pinned to the exterior (-Y), and bottom Ixconnect bores enter from that same outside face. Matched receiver coordinates remain derived from the selected housing face. Back seats may still require the inside face; machining review continues to report true multi-face work. Foot display parts move down with the exploded bottom, preserving their relative gap. Their IDs support selection, visibility and renaming.

Door opening is now one global inspection action at the end of the camera toolbar, after a separator; it is disabled during exploded inspection. The count total shares the official number-input adapter in disabled state. Repair dialogs use native large Evo radios and official checked/unchecked icon assets. The shared Notice adapter now uses Evo inverse snackbars, 448 px maximum, centered above the persistent toolbar, one message at a time, a 6-second timeout, attention glyph for issues and a link-style action. Detailed machining review remains available after the snackbar expires.

Support drilling / clearance review (native 27): `foot-drilling` generates canonical underside pilots from optional layout/pattern settings; feet remain conceptual envelopes for placement while the viewport draws only holes and flat selectable footprints. Plinth relative gap derives from the front foot envelope; absent gap preserves legacy setback intent. `simple-supports` commands feed the same transaction path for fields and 3D drag. Exploded plinth and bottom share their vertical translation. CNC `bottomFace` drives both bottom housing and back-connector access. `hinge-plate-review` compares a conservative mounting zone against adjoining parts, with optional individual hinge offsets. `clearance-repairs` evaluates face alternatives, minimum whole-mm hinge shifts and full-sweep reveal corrections; repair actions never suppress machining notices. Motion collision metadata identifies the moving and obstructing parts. Native 26 continues to load through its original revision mapping.

Native 28 / inspector simplification: `InspectorSections` scopes official Skin accordion/details markup to the simple editor; the advanced interface retains static sections. Cabinet type is a static row. Bottom selection owns support settings and nested support disclosures are removed. Door creation is composed into Interior alongside shelf/divider actions. Foot drilling always traverses bottom stock; loading earlier foot patterns normalizes the retired blind/through switch. Support drag callbacks, proxies and commands are removed. `hole-collisions` analytically tests finite parallel/perpendicular drill cylinders; review exempts the pinned Cabineo compound pattern and identical shared shelf through bores. Related foot IDs and both operation IDs feed warning cues and tested nearest whole-mm placement alternatives.

Native 29: accordion context is enabled only for the cabinet selection; selected items reuse the original static Section composition. Shared header and content insets are 24 px, with units alongside headings rather than in a separate content row. Inset fronts subtract outer carcass thickness only; internal boundaries meet over division centres. Existing clearance corrections move affected interiors behind the doors; older native layouts migrate through that correction. Foot-hole review expands the foot drilling radius by 4 mm when checking nearby bores and connection pockets, while direct panel-edge checks retain the same margin. Placement repairs test those expanded clearances.

Native 31 removes automatic divider shortening. Vertical divider depth comes solely from its saved front inset. Inset leaf boundaries at an intersecting divider use its half-thickness to stop at the physical side faces; a divider already behind the door rear allows the leaves to meet over its centre. Clearance corrections skip separators already accommodated by those door edges. The hinge article follows whether the mounting face is exposed or recessed. Saved IDs, explicit insets and existing opening collision studies remain intact.
