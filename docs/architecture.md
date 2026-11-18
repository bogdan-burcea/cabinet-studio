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
- `persistence/`: strict versioned portable files and browser-local autosave. Future or unknown formats are rejected intact. Material and construction revisions are retained; geometry regenerates with the pinned evaluator. There are no migrations yet.

Current evaluation is a small synchronous five-panel calculation. No worker is needed for this stage. Any future async evaluator must carry request revision IDs and reject stale results before installing a preview.

## Construction policy `concept-1`

Envelope includes the five panels. Body depth excludes all applied fronts and handles. Sides are full height/depth, top/bottom fit between sides, back fits inside at rear. Panels touch but do not overlap. Back fastening and all joinery remain unassigned. Installation type `unassigned` conveys no floor or wall support rating.

Panel IDs derive from cabinet identity and semantic role, not list indices or names. Opening identity is stored in intent. Future hardware pins have ID/revision boundaries; this schema rejects nonempty hardware until a supported pack exists. Persisted evaluator revision prevents silent geometric updates. Native format version changes are required when capabilities broaden.

## Scope and release

No nesting, CAM, production documents, costs, labels, project/room layout, legacy importer, placeholder service or menu. Future consumers may read a versioned evaluated cabinet boundary; they are not implemented now.

No GitHub Actions, hosting manifest, deployment hook or site registration. A local build is always local. Source sync to an agreed private GitHub repository is separate from a future explicitly requested publication.
