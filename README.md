# Cabinet Studio

Online app: **https://bogdan-burcea.github.io/cabinet-studio/**

A cabinet editor with fixed shelves and dividers, configurable back panels, pinned fastener layouts and CNC joint previews. The interface uses the eBay Evo design system. The advanced Stage 2–4 implementation is preserved in source; it is not part of the default editor. GitHub Pages publishes the tested `main` branch automatically.

## Development

Runtime: **Node 24.15.0** (`.nvmrc`), npm 11.12.1. Dependencies are pinned and locked.

```sh
npm ci
npm run dev
```

Local address: **http://127.0.0.1:5173**. The server binds to loopback only. Stop with Ctrl-C. No account, hosting registration, deployment credentials, remote services or database are required. The interface uses official eBay Evo/Skin styles and self-hosted Market Sans fonts/icons; the builder works without external runtime requests.

```sh
npm test
npm run build
```

`build` checks TypeScript and writes static assets to `dist/`. Building does not publish. The Pages workflow tests and builds each push to `main`, then deploys `dist/`. Pull requests run validation without deploying.

## Current UX baseline

- One five-panel cabinet; edit overall width, body height and depth numerically or with the existing 3D drag handles.
- Select panels in the viewport or Structure for contextual editing and a flat, expandable part preview. Cabinet dimensions appear when the cabinet is selected.
- Camera orbit/pan/zoom, standard views and Fit; eBay Evo light/dark presentation.
- Undo/Redo, name, New/Open/Save and a dedicated browser-local simple draft.
- Fixed shelves and vertical dividers: select an opening and choose Add shelf or Add divider. Edit the clear gap below/left, centre, drag or remove the selected element with Backspace. Nested contents remain protected. Save/load preserves mixed interiors.
- Cabinet dimensions and size-only type presets appear when the cabinet is selected or the 3D selection is cleared; selected parts show their own controls. Presets preserve interiors and change only width/height/depth.
- User-entered stock thickness from 3–24 mm, including decimals; back stock and inset/applied/grooved/rebated seating are configured separately.
- Lamello Cabineo 8/12 and Häfele Ixconnect back layouts use matched drilling rules. Cabineo counts can be set per side; fitting thickness and spacing requirements remain enforced.
- Puzzle corner joints and optional finger ends on fixed shelves/dividers, shared wood-joint tolerance (default 2 mm), cutter-relative dogbone relief and opposed receiving-pilot through conversion. Manufacturer housing depths remain fixed.
- Real cutout geometry in 3D and clipped part previews, one-face machining/interference warnings, normal/transparent/wireframe/exploded views, and official Evo numeric inputs.
- Advanced adjustable shelves, materials/finishes, doors, drawers and installation tools remain preserved in source. CNC previews are not production exports or physically verified assemblies.

Open **http://127.0.0.1:5173/**. The simple editor uses `cabinet-studio.simple.autosave.v1`, without reading, migrating or overwriting earlier advanced autosaves. Advanced files are rejected intact, never flattened. Simple files use the existing versioned native format and validated transaction path.

`src/ui/AdvancedApp.tsx` preserves the previous Stage 4 interface as source only. Its catalogue, rules, commands, geometry, tests and native compatibility remain available for future development. There is no advanced-mode toggle or alternate app entry in the current user flow.

## Preserved advanced implementation

The details below document the retained Stage 2–4 implementation and its limitations, not controls currently exposed in the simple editor.

## Current limits

This remains conceptual construction. Sides span the body; bottom/full top fit between them. Top rails occupy that same reserved top zone. A full back fits between the four carcass panels; rear rails are vertical panels of carcass stock. Rail pairs require at least a 20 mm gap, an application policy. No joinery, preparation, structural/racking capacity or wall support is inferred.

Older native files retain their pinned stock, finish and grain bindings for dimensional and data compatibility. Their editing controls are available in the restored inspector; edge banding remains editable.

Fixed shelf/divider positions remain absolute inside their parent opening. Material changes reserve actual selected thickness and update descendants; positions and identities are never silently rewritten. Invalid changes are rejected. The 60 mm minimum opening and 5 mm drag grid are application policies, not support-hole or load requirements. Body depth excludes fronts/handles. Support may remain unassigned, sit directly on the floor, or use four concept feet. Installed height is body top above the floor reference: body height plus foot height or suspended body clearance. With no floor reference it remains unassigned. Changing support never translates the body origin.

The pinned concept foot profile has a 60 × 60 mm plate, 34 mm post and 50 mm base. Four feet and 5 mm plinth clearances are application modelling policies. No purchased fitting, clip, drilling, fixing, load capacity or stability is verified. Plinth covers are nonstructural; side returns meet the front cover without overlapping. Settings and panel edge intent survive disabling support/plinth.

Wall mounting uses an application-owned, pinned 30 mm-high/5 mm-deep rail and two 30 × 50 mm bracket envelopes in a 15–100 mm rear gap. Centres must fit within the body envelope and remain at least 10 mm apart. These are spatial policies only: no cabinet connection, back cutout, wall substrate, anchor, fastener, preparation or load/stability rating is assigned. The provisional layout is not an installable assembly. Wall restraint requires floor/feet support; suspension keeps that support inactive and retains the settings. Disable mounting before re-enabling feet, or Undo suspension to restore the previous layout.

The earlier hardware shortlist remains research material. Stage 4 now has a separate, pinned drawing-checked TANDEMBOX pack; see `docs/stage-4-antaro.md` for its evidence and remaining assembly checks. Verified foot/clip packs, shelf supports and suspension/anchoring remain deferred. No other fitting pack is enabled.

Camera state, drawer/door inspection motion and theme are presentation state and are not saved cabinet intent. Ordinary edits preserve the camera; Fit is explicit. Native schema 12 pins evaluator `drawers-12`, existing policy/product revisions, optional door boundary links and persistent centre constraints. Schemas 1–11 upgrade as disclosed copies; older source files and autosave keys are preserved. Old divisions remain absolute until Keep centred is chosen. Unknown or malformed formats fail without replacing the current cabinet. Save downloads committed intent.

## Concept features and deferred fitting verification

The remaining concept-design software is implemented and locally reviewed: fixed/adjustable interiors, construction variants, materials/banding, installation layouts and four reviewed presets. Exact fitting verification is explicitly deferred by the user to a later stage; it does not block concept Stage 3 work. No fitting is represented as validated. The six supplied FeroShop products are recorded in Fitting references, explicitly NOT APPLIED; existing concept geometry is not relabelled as real hardware. AXILO 637.76.353's supplier range is 90–120 mm, whereas the separately pinned concept profile remains 70–200 mm. The supplied Blum hanger is right-handed only and the fixed-shelf item is a housing only. Matching assembly/preparation, regional companion parts, physical trial fixtures and cabinet/wall structural acceptance remain incomplete. See `docs/stage-2-review.md` and `docs/stage-2-fitting-evidence.md`.

Inset concepts occupy space inside the front of the carcass. Existing fixed shelves/dividers can conflict there; these edits are rejected rather than trimming contents. Adjustable shelves can provide setback where sufficient. Overlay slabs sit outside the body. Front reveals/clearances, 80–1200 mm slab width, minimum 120 mm height, 5 mm handle edge clearance and concept handle pitches are application policies, not fitting specifications. Overlapping coverage regions are rejected. At most 32 slab doors are supported.

## Repository

This is a separate Git repository. The tested editor is published to `main` in the source repository **https://github.com/bogdan-burcea/cabinet-studio** (`origin`). Pushes to `main` now deploy the app through GitHub Pages after tests and the build pass; local development remains at the loopback address above. No files in `/Users/Bogdan/Projects/cabinet-workshop` are edited or copied into the new controller.

See `docs/architecture.md`, `docs/backlog.md` and `docs/reference-review.md` for boundaries and staged follow-up work.

## Design system

The current interface uses official `@ebay/skin` 19.39.0 components/tokens, self-hosted Market Sans and unmodified Evo icons. The design-system boundary remains replaceable and independent of cabinet geometry. Source references, mappings and verification are in `docs/design-system-evo.md`. Regenerate scoped dark tokens and the icon subset with `node scripts/sync-ebay-design.mjs` after any deliberate Skin upgrade.

## Online deployment

GitHub Pages is configured with GitHub Actions. The workflow can also be run manually from Actions → Test and publish Cabinet Studio. The build uses relative asset paths so fonts and icons work under `/cabinet-studio/`. Dependencies and Node are pinned.

Cabinet drafts stay in each browser/origin. To move an existing local draft online, use Save in the local app and Open in the hosted app. Deployment does not upload saved cabinets or connect a backend.

### Local costs

Open the settings icon beside Undo/Redo for **Utilities**. The **Costs** tab uses manual unit prices and full sheet quantities from Cut. Estimate includes reusable offcut value (rectangles at least 150 × 150 mm); opt in to deduct it before profit. Hardware quantities follow the cabinet; labour and profit (% of costs) are editable. RON is fixed. Empty prices display a dash and mark the estimate partial. CSV includes category totals and profit.

Draft estimates save in this browser per cabinet ID. **Save defaults** reuses rates, pricing basis and profit for new estimates on this device. Existing prices survive removal of store integration; product links and fetching are removed. Cabinet JSON does not contain the price book. Delivery and separate tax/discount rules are not added.

The **Part labels** tab provides label/page sizes, margins, horizontal/vertical gaps and skipping used labels. Export every cut part and reusable offcut as grayscale thumbnail/QR labels, followed by numbered sheet maps. Details appear directly on the sheets; no separate part lists or cabinet arrangement pages. A calibration-sheet PDF remains available. Print at actual size (100%). Set an app address reachable from your phone; QR links select the part after opening its matching cabinet file. Label stock settings remain in this browser.
