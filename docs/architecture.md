# Architecture decisions

## Evaluation flow

Cabinet intent + pinned material revisions + construction policy → validation → evaluated panels/opening → Three.js adapter and contextual inspector.

- `domain/`: serializable universal intent, stable cabinet/opening identities and millimetre units. Rectangular model only. Later compartments, contents, fronts and installation extend this model, rather than introducing cabinet subclasses.
- `catalogue/`: immutable material revisions and disabled hardware research candidates. Display finish colours do not live here.
- `rules/`: application limits and explanations. Manufacturer requirements must be separately sourced and tested when fitting packs are enabled.
- `geometry/`: the only source of panel dimensions and opening bounds. Returns identity, material, orientation and provenance. Neither rendering meshes nor UI calculations define construction geometry.
- `commands/`: preview/evaluate/validate/commit/cancel and bounded Undo/Redo. One committed transaction per drag or field edit; invalid previews cannot commit an earlier valid ghost. New edits after Undo clear Redo; no-op edits do not.
- `viewport/`: a replaceable Three.js adapter; rendering, picking, screen-projected constrained handle motion and camera. It accepts evaluated geometry and sends edit intent through callbacks. It never modifies canonical geometry. Millimetres, X right, Y up, Z front. Origins are stored in domain data.
- `ui/`: component UI, inspector, selection, file interaction and command routing. All dimension operations have numeric alternatives. Panel/opening selection has a button alternative. Canvas navigation has keyboard and button alternatives.
- `design-system/`: semantic CSS tokens, reusable control styles, icon adapter, two development themes and theme-aware viewport palettes. Appearance does not alter material records or rules.
- `persistence/`: strict versioned portable files and browser-local autosave. Future or unknown formats are rejected intact. Material and construction revisions are retained; geometry regenerates with the pinned evaluator. Schema 1 migrates to schema 2 as a disclosed copy with unchanged carcass geometry; the browser v1 key is preserved. No other migrations are supported.

Current evaluation is a small synchronous five-panel calculation. No worker is needed for this stage. Any future async evaluator must carry request revision IDs and reject stale results before installing a preview.

## Construction policy `concept-1`

Envelope includes the five panels. Body depth excludes all applied fronts and handles. Sides are full height/depth, top/bottom fit between sides, back fits inside at rear. Panels touch but do not overlap. Back fastening and all joinery remain unassigned. Installation type `unassigned` conveys no floor or wall support rating.

Panel IDs derive from cabinet identity and semantic role, not list indices or names. Opening identity is stored in intent. Future hardware pins have ID/revision boundaries; this schema rejects nonempty hardware until a supported pack exists. Persisted evaluator revision prevents silent geometric updates. Native format version changes are required when capabilities broaden.

## Scope and release

No nesting, CAM, production documents, costs, labels, project/room layout, legacy importer, placeholder service or menu. Future consumers may read a versioned evaluated cabinet boundary; they are not implemented now.

No GitHub Actions, hosting manifest, deployment hook or site registration. A local build is always local. Source sync to an agreed private GitHub repository is separate from a future explicitly requested publication.

## Stage 2 increment — fixed interiors

`domain/` owns a recursive compartment tree. A leaf stores its opening ID; a split stores that same node ID, a separate stable feature ID, horizontal/vertical axis, local centre position, `fixed-1` policy and exactly two child nodes. Positions are millimetres from the parent opening's bottom/left and remain absolute during resizing. Fronts remain a separate, currently empty layout.

`rules/interiors.ts` is the authoritative opening layout resolver: it reserves actual material thickness, derives each child bound and division placement, and explains invalid dependencies. It enforces a conceptual 60 mm minimum clear space on each side, 0.1 mm precision, 63 divisions and 32 nested levels. These are application policies, not manufacturer requirements. `geometry/evaluate.ts` maps the resolved placements to canonical panels. Resizing, panel geometry, inspector spacing and picking planes all consume these outputs.

`commands/interiors.ts` transforms tree intent without mutating it. Every move/add/remove routes through the command store. Nested parent deletion is rejected; removing a leaf division restores the original parent opening identity. Duplication inserts a new split in the largest leaf inside the selected division, allocating new IDs while preserving existing nodes. Labels and list order are presentation only.

`ui/InteriorInspector.tsx` and `ui/Structure.tsx` keep interior interactions out of construction rules. The 3D adapter renders leaf picking planes and a selected-division move handle. Pointer motion projects along the division's axis, snaps to a 5 mm application grid or centre, and uses the same validation path as numeric edits. Ghost geometry, dashed min/centre/max guides and clear-space readouts accompany the preview. Escape cancels and release commits one Undo step. Accessible numerical and button alternatives are provided.

The native format is now schema 2 / evaluator `interiors-2`. The parser validates tree shape, IDs, policy revision, complexity and dependent geometry before commit. Stage 1 files with schema 1 / evaluator `carcass-1` upgrade as copies with unchanged intent and panel geometry. Autosave writes to `cabinet-studio.autosave.v2`; the v1 key remains untouched. A future format never silently falls back to older data.

Fixed divisions have unassigned joinery. Adjustable supports, hole grids, installation fittings and load claims are not inferred. Other Stage 2 construction variants are still deferred.
