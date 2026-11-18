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
