# Cabinet app — specification

Version 0.2 · 18 November 2026 · Working specification

## 1. Direction and scope

Create a new browser-based cabinet application in a separate repository. Develop and review locally in stages. Publish only when Bogdan explicitly requests publication.

The application is for a non-professional user. The main workspace is a 3D cabinet that the user can select, resize, divide and furnish directly. One universal cabinet model adapts into supported cabinet types through features and presets.

Current work focuses exclusively on cabinet-building tools. Nesting, production documents, exports, labels, costing, room/project layout and other downstream workflows are deferred. Design the data boundaries to support them later; do not build their interfaces, placeholder tabs or services now.

Wooden drawer boxes and their TANDEM runner implementation are excluded for now. Supported drawers will use a selected metal drawer system, initially a verified TANDEMBOX antaro M assembly. Its required board bottoms, backs and exterior fronts remain part of the metal drawer assembly.

## 2. Reference application

Reference: https://github.com/bogdan-burcea/cabinet-workshop

Latest main reviewed for this revision: `f34dc062824c959a4c25122b956c74e19d34d31b`, version 0.43.0. Reviewed the release documentation and current cabinet/drawer source. This is a source review, not independent verification of the running application or its manufacturing accuracy.

The reference now includes worktops and cutouts, individual construction rails, construction/mounting profiles, Tall interiors, and metal drawer arrangements. These are reference capabilities, not an obligation to implement everything at once.

| Reference capability | New application decision |
| --- | --- |
| Base, Wall, Tall, open and pantry arrangements | Presets of one universal cabinet model |
| Full top or rails; full back or structural rear rails | Cabinet-construction tools, added through supported combinations |
| Shelves, fixed divisions, independent fronts and covered interiors | Staged compartment and front tools |
| Wooden and metal drawer systems | Metal drawer system only for current scope |
| Slab, inset, Shaker, glass and GOLA fronts | Slab first; other front/grip modules in later building stages |
| Feet, plinth and suspension | Supported installation features tied to selected fittings |
| Worktops and appliance cutouts | Later cabinet-building extension after the core tools |
| Nesting, STEP, documents, labels and prices | Deferred; reserve clean integration boundaries |
| Existing Carbon appearance | Initial inspiration; appearance must be replaceable independently |
| Existing project formats and cabinet library | No launch compatibility requirement; reassess later |

Keep the existing repository unchanged. Reuse audited ideas and tests where appropriate, rather than copying its application controller or coupling the new app to its release process.

## 3. Primary experience

1. Open a local preview showing one basic cabinet and its main dimensions.
2. Click a dimension to enter a value, or drag a constrained handle.
3. Click an opening to add a shelf, divider, door or supported metal drawer.
4. Move shelves and dividers with a live preview of spacing and valid positions.
5. Select a front to change handing, placement, handles or compatible hardware.
6. Open a door or extend a drawer to inspect the interior. Use cutaway or transparency for hidden parts.
7. Inspect and resolve construction issues directly on the affected feature.
8. Save and reopen the cabinet without losing settings or product revisions.

A compact contextual inspector provides precise controls and accessible alternatives. Everyday editing must not require understanding hinge offsets, runner deductions or drilling coordinates. Technical detail is available progressively.

No production, nesting, costing or document steps appear in this journey yet.

## 4. Universal cabinet model

Start with rectangular cabinets. Corner, curved and other geometry requires explicit future extensions. “Any cabinet type” means any supported combination of the universal model's capabilities.

| Element | Owns |
| --- | --- |
| Envelope | Width, body height, depth and coordinates |
| Carcass | Sides, bottom, top/full top/rails, back/rear rails and joinery |
| Compartment tree | Horizontal and vertical divisions; usable openings |
| Contents | Fixed/adjustable shelves, metal drawers, inner trays and reserved spaces |
| Front layout | Doors and drawer fronts covering one or multiple openings |
| Installation | Floor support, feet, plinth, wall mounting and floor references |
| Material bindings | Panel roles, actual thickness, finish, grain and banding |
| Hardware assemblies | Exact products, companion parts, fasteners and rule revisions |

Front layout and internal divisions are distinct. One full-height door may cover several compartments. Lower metal drawers may coexist with upper shelves. Fixed shelves are structural panels; adjustable shelves use selected supports.

Presets configure this same model. Applying a preset previews changes and cannot silently delete custom contents or substitute hardware.

Store user intent; derive openings, panel geometry, fitting positions and required components. Derived dimensions must have one authoritative calculation. Give cabinets, compartments, panels and features stable identifiers independent of display names and list order.

Use millimetres internally. Distinguish body height from installed height, body depth from overall depth, and finished panel size from later cutting size. Proposed convention: body depth excludes applied fronts and handles. Show overall depth when useful.

## 5. Hardware and construction rules

Hardware-dependent rules use exact selected assemblies and documented specifications. A hinge plus plate, drawer runner plus sides/brackets, or hanger plus rail must be validated together.

Each hardware record includes:

- Manufacturer, article numbers, variant, region and handedness.
- Required companions, accessories and fasteners.
- Official source/drawing, revision, page and verification date.
- Supported thicknesses, dimensions, application limits and clearances.
- Parameterized deductions, fixing features and reference faces.
- Geometry quality: schematic envelope, approximate model or verified model.
- Verification status and representative calculation fixtures.
- Known preparation requirements retained as data for later manufacturing integration.

Separate manufacturer requirements, material/process requirements, application construction policies and unverified assumptions. Hardware does not determine every joinery choice or panel span. A fitting load rating is not a rating for the entire cabinet or wall installation.

Allow provisional conceptual design with a visible status. Do not present unverified layouts or approximate motion as manufacturer-validated construction. Changing a product previews the affected geometry and required changes; invalid edits preserve the previous valid cabinet. No silent hardware substitutions, drawer-count changes or automatic material changes.

### Starter fitting list

| Assembly | Initial candidate | Verification needed |
| --- | --- | --- |
| Slab door | One exact overlay hinge and matched plate | Article numbers, thickness range, drilling, overlay and quantity policy |
| Metal drawer | Blum TANDEMBOX antaro M | Exact matched runner, sides, brackets, board components, lengths and clearances |
| Carcass connector | One Lamello Cabineo variant | Housing, mating feature, stock, access and layout policy |
| Adjustable shelf | One exact shelf support | Bore, engagement and supported application |
| Feet/plinth | One foot and compatible clip | Footprint, fixings, adjustment and plinth clearance |
| Handle | One pull or knob | Pitch, mounting area and appropriate screws |
| Wall suspension | One matched hanger/rail assembly | Full combination and cabinet preparation |

These are candidates from the reference, not newly verified product selections. Implement a small verified set first and expand through product packs without changing the cabinet UI. Wooden drawer boxes and their runner packs are not included.

## 6. Direct 3D editing

| Selection | Available building actions |
| --- | --- |
| Cabinet dimension | Enter value; drag along its meaningful axis |
| Empty opening | Add shelf, divider, door or metal drawer |
| Shelf | Move, duplicate, remove; choose fixed/adjustable |
| Divider | Reposition; edit spacing; preview dependent changes |
| Door | Open, reverse handing; edit placement, style, handle and fitting |
| Metal drawer | Extend; resize allocation; choose supported length/assembly |
| Panel | Inspect material, banding, construction and generated features |
| Fitting | Inspect product and compatibility |
| Issue marker | Explain the limiting feature and offer valid corrections |

Show ghost geometry, live dimensions and legal snap positions while dragging. Adjustable shelves snap to supported hole positions. Escape cancels; releasing the pointer commits one Undo step. Invalid positions must be explained without destroying the prior configuration.

Keep navigation and editing gestures distinct. Preserve the camera during ordinary edits. Provide front, side, top, isometric and Fit views. Hidden elements remain reachable through a compact element list or cutaway.

Every canvas operation needs a numerical, keyboard or button alternative. Use visible focus, accessible control names and text alongside validity colors. Opening animations remain illustrative unless verified kinematics exist; they cannot prove hinge/tray clearance.

## 7. Easily changeable design language

Separate appearance from both cabinet rules and interaction logic. Carbon may inform the first theme but must not be hard-wired into the application.

- Central semantic tokens for colors, typography, spacing, sizing, radii, borders, shadows, density and motion.
- Reusable themed components for fields, buttons, selectors, panels, dialogs, notices and contextual actions.
- One icon adapter so the icon family can change without editing business logic.
- Theme-aware 3D presentation tokens for background, selection, outlines, dimensions, handles, ghost previews and issue markers.
- Keep display finish colors separate from actual material identity and hardware data.
- Theme configuration and component styles live in dedicated modules; avoid scattered raw style values in feature code.
- Maintain consistent label spacing, row spacing, info-icon placement and disabled states through shared components.
- Theme changes preserve accessibility, target sizes and interaction meaning.

Acceptance: switching between two visibly different development themes changes the app shell, controls and viewport overlays without modifying domain, geometry or hardware modules. A broad visual redesign may still require component-layout changes, localized to the presentation layer.

## 8. Modular implementation

| Module | Current responsibility |
| --- | --- |
| Domain | Universal cabinet schema, compartments and stable identities |
| Product catalogue | Versioned hardware/material records |
| Rules | Compatibility, dimensions, dependencies and explanations |
| Geometry/features | Canonical panels, profiles, fitting features and references |
| Commands | Preview, validation, transactions and Undo/Redo |
| 3D adapter | Rendering, picking, constrained handles and camera |
| UI components | Contextual inspector and accessible controls |
| Design system | Themes, semantic tokens, component styling and icon adapter |
| Persistence | Local autosave, portable cabinet files and migrations |

Evaluation: intent + pinned products + construction policies → evaluated cabinet → canonical geometry/components/issues → 3D and inspector.

Keep heavy evaluation off the interaction thread as needed. Ignore stale asynchronous results through revision identifiers. Rendering meshes must not become the authoritative construction geometry.

Proposed technical direction: TypeScript, a component-based UI and a dedicated 3D adapter. Validate the stack with a small local prototype before expanding implementation.

### Boundaries reserved for later

Future nesting, CAM/export, drawings, BOM reports, labels, costs, cabinet libraries and project layout will consume versioned evaluated cabinet data. Preserve identities, units, material roles, feature provenance, orientations and hardware references now. Do not implement these deferred modules or their menus until their stage is requested. Native cabinet save/load is current scope, not a manufacturing export.

## 9. State and persistence

Every edit follows preview → evaluate → validate → commit → Undo record. Save the selected hardware and rule revisions so later catalogue updates do not silently change old cabinets.

Local autosave and portable cabinet JSON are part of the building tool. Explain browser-local persistence and provide backup. Unsupported future formats fail clearly and preserve the original file. Migrations use copies and disclose geometry changes.

Where shared defaults are introduced, make inheritance explicit and local overrides visible. A default change must preview its impact. Do not build multi-cabinet global settings before the corresponding project scope is introduced.

## 10. New repository and local development workflow

Create a separate repository for the new app at implementation kickoff. Repository name and visibility remain to be selected; this specification revision does not create or publish it. The existing cabinet-workshop repository remains the reference.

1. Initialize the new local project with the specification, README, development instructions and staged backlog.
2. Implement a small stage on a feature branch and run the appropriate checks.
3. Provide a local browser preview and explain the stage's completed behavior and remaining limits.
4. Incorporate feedback and keep the local app usable as stages progress.
5. Connect/sync the separate GitHub repository as agreed. Source synchronization and public deployment are distinct operations.
6. Publish only after an explicit user instruction, against the reviewed revision, after checks pass.

The user should be able to work through the development app by giving instructions, without manually entering terminal commands. Pin the development runtime and document a repeatable preview command for maintenance.

Do not inherit automatic production deployment on every main-branch update. Prefer a manual release workflow or a deployment gate that requires explicit publication. Routine builds, tests, commits or source pushes must not accidentally publish a site.

## 11. Staged development plan

All stages below remain focused on the cabinet builder. At each stage: implement, verify, provide a local preview, collect feedback and update the backlog. Passing a stage does not authorize publication.

| Stage | Deliverable | Completion criteria |
| --- | --- | --- |
| 0 — foundation | New project/repository setup; schemas, module boundaries, theme tokens; exact initial hardware shortlist | Local app starts; responsibilities are separated; no automatic public deployment |
| 1 — basic cabinet | Rectangular carcass, editable width/height/depth, selection, contextual inspector, camera, Undo/Redo and save/load | Drag and numeric edits agree; invalid edits preserve prior cabinet; saved cabinet reopens identically |
| 2 — construction and interiors | Full top/rails, back/rear rails, fixed/adjustable shelves, horizontal/vertical divisions, materials, banding, feet/plinth and supported mounting | One model supports open, base, wall-style and tall arrangements; fitting constraints update together |
| 3 — doors and handles | Slab doors, handing, supported overlay/inset assemblies, front divisions, handles and inspection motion | Independent fronts and full-height covers fit the interior; hardware compatibility is explained |
| 4 — metal drawers | One verified TANDEMBOX antaro M pack, external drawers, front allocations and inner trays where verified | Lengths, board pieces, fittings and clearances follow the exact assembly; wooden drawer-box tools are absent |
| 5 — builder refinement | Usability polish, additional verified fittings; selected Shaker/glass/GOLA or worktop/cutout extensions in small increments | Complete first-time-user journey; each added feature has explicit limits and regression coverage |

Do not automatically include every Stage 5 extension. Prioritize them with the user after the core builder is reviewable. Nesting, production outputs, costs, room/project layout and old-project import require a separate future scope and stage plan.

## 12. Acceptance criteria

1. Cabinet types use the same model and generator, with presets acting as reviewed transformations.
2. 3D dimensions and inspector values produce identical results.
3. Shelves/dividers update usable openings and associated fitting features together.
4. Supported hinge/plate/material and metal-drawer combinations use exact product rules; unsupported combinations explain why they fail.
5. A full-height door can cover a divided interior without duplicate geometry or misplaced fittings.
6. Undo/Redo covers dimension, interior, front and hardware edits; dragging creates a single step.
7. Save/load preserves intent, identity, hardware revisions and evaluated geometry.
8. All building actions have accessible alternatives to direct manipulation.
9. Two development themes demonstrate appearance changes across controls and viewport overlays without domain changes.
10. Wooden drawer-box options and deferred workflow tabs are absent.
11. Local preview remains available throughout development; deployment requires an explicit publication instruction.
12. Proposed usability target: four of five first-time non-professional testers can size a cabinet, add a shelf and door, configure a metal drawer arrangement and save within ten minutes without coaching.
13. Proposed interaction target: at least 30 fps during standard-cabinet dragging on an agreed reference Mac; expensive work shows progress and cannot overwrite newer edits.

Verify construction calculations with official-drawing fixtures and representative physical fittings. Use integration checks for dependent edits and UI review for direct manipulation. Existing app outputs are comparison material, not sole proof of correctness.

## 13. Next implementation decisions

Select the new repository name/visibility and exact starter hardware. Start with Stage 0 and Stage 1, then use local feedback to refine the interaction before expanding the tools. No manufacturing-export or legacy-import decision is required now.

## 14. Reviewed source references

- [Version 0.43.0 release and current limitations](https://github.com/bogdan-burcea/cabinet-workshop/blob/f34dc062824c959a4c25122b956c74e19d34d31b/README.md)
- [Current cabinet composition and construction settings](https://github.com/bogdan-burcea/cabinet-workshop/blob/f34dc062824c959a4c25122b956c74e19d34d31b/src/workbench/cabinet.js)
- [Current TANDEMBOX antaro M implementation](https://github.com/bogdan-burcea/cabinet-workshop/blob/f34dc062824c959a4c25122b956c74e19d34d31b/src/workbench/tandembox.js)

Hardware candidates require independent official-document verification before being enabled as verified building assemblies in the new app.
