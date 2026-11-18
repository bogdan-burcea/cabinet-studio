# Stage 2 review — 18 November 2026

App v0.7.0; schema 7 / evaluator `interiors-7`; local branch `feat/stage-2-completion`.

The remaining concept-design software is implemented. **Full Stage 2 specification acceptance remains open for fitting and physical verification.** No hardware assembly is represented as manufacturer-validated.

| Area | Software reviewed | Remaining acceptance |
| --- | --- | --- |
| Full top/top rails and full back/rear rails | Independent sizes, clearances, stable panel IDs and dependent interiors | Real joinery, fastening and racking verification |
| Fixed shelves/dividers | Recursive local positions, move/duplicate/remove and nested-content protection | Exact structural connector assembly/preparation |
| Adjustable shelves | Leaf contents, declared levels/pads, clearance, drag/numeric edits, conversion, duplication and safe removal | Actual GTV support/bore engagement, material/application fixtures and physical trial |
| Materials and banding | Inheritance/override, pinned thickness/finish/grain, finished/core composition and dormant edge intent | Purchased stock/process and fitting-specific machining rules |
| Feet and plinth | Concept geometry, heights/setbacks, returns/gaps, materials/edges and visibility | AXILO base/foot/clip assembly geometry, fixings, regional limits and physical trial |
| Wall layouts | Restraint/suspended concepts, reference heights, rail/bracket envelopes and dependencies | Complete handed hanger/wall fixture combination, cabinet preparation, anchors/substrate and physical/structural verification |
| Universal arrangements | Reviewed open/base/wall-style/tall presets; suggested size opt-in | Fitting-backed supported arrangements and user acceptance |
| Persistence/history/design | Schema 7 copies old formats, original keys preserved, atomic Undo/Redo, Graphite/Linen | No physical or measured-performance claim follows from software checks |

83 automated tests and the TypeScript/Vite build pass. Browser review covered shelf snapping and constrained dragging, both conversions, dependent rejection, all presets, native save/load/autosave, both themes and narrow layouts. The existing Three.js chunk-size advisory remains.

The six product links supplied by Bogdan are recorded in `catalogue/stage2-fittings.ts` and in the app's Fitting references section, explicitly NOT APPLIED. Their exact article identities are retained separately from the concept geometry pins. See [fitting evidence](stage-2-fitting-evidence.md) for sources, access limits and missing companions. This avoids overwriting existing concept settings or implying that a product link verifies an installation.

Local preview: http://127.0.0.1:5173/. A native example and JPG screenshots are in the parent `outputs` directory. Existing construction, interiors, bindings, bands, feet/plinth and wall settings were compared against the previous saved example and remain unchanged apart from the explicitly added adjustable shelf/front band.

No Stage 3 work, hosting registration, deployment, source push or reference-repository edit was performed.
