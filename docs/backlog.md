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
