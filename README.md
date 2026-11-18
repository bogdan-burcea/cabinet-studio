# Cabinet Studio

A new, local cabinet builder. Stage 0/1 foundation plus Stage 2 construction, fixed/adjustable interiors, material bindings, edge banding and concept feet/plinth, wall layouts and reviewed arrangement presets, following `docs/specification-v0.2.md`. The original specification is requirements material; it does not grant permission to publish. Nothing in this project deploys automatically.

## Development

Runtime: **Node 24.15.0** (`.nvmrc`), npm 11.12.1. Dependencies are pinned and locked.

```sh
npm ci
npm run dev
```

Local address: **http://127.0.0.1:5173**. The server binds to loopback only. Stop with Ctrl-C. No account, hosting registration, deployment credentials, remote services or database are required. Typography uses system fonts; the builder works without external runtime requests.

```sh
npm test
npm run build
```

`build` checks TypeScript and writes static assets to `dist/`. Building does not publish. This repository has no deployment workflow or production remote.

## Review the prototype

- Select the cabinet, an individual panel or the opening in 3D or the Structure list.
- Change width/body height/body depth in the inspector. Click a viewport dimension to focus its field. Enter or blur commits; Escape cancels. Valid edits show a ghost while typing.
- Drag a gold handle along its width/height/depth axis. Release creates one Undo step; Escape cancels. A rejected edit preserves the committed cabinet.
- Orbit, pan and zoom; use Front, Side, Top, Rear, 3D and Fit. With the canvas focused, arrows orbit, +/− zoom and F fits.
- Undo/Redo with the toolbar or Cmd/Ctrl-Z, Shift-Cmd/Ctrl-Z or Ctrl-Y.
- Switch Graphite/Linen with the theme button. The shell, controls, dimension overlays and 3D presentation change together.
- Save cabinet creates native cabinet JSON. Open validates the schema and revisions and can be undone. Files from Cabinet Workshop are unsupported.
- Select a leaf opening to add a fixed shelf, adjustable shelf or divider at its centre. Repeat in the child openings for nested interiors. Select a division to reposition, centre, duplicate or remove it. Duplicate uses the largest child opening. Remove child divisions before their parent; nested contents are never silently deleted. Invalid dependent edits preserve the entire previous cabinet.
- Adjustable shelves remain contents of a leaf opening, without splitting it. They use declared concept support levels (first underside 64 mm, 32 mm pitch), 1 mm side clearance and four visible pads. Move numerically, by level buttons/selectors or by the constrained handle. Set a front setback, duplicate/remove, and apply the existing interior material/edge controls. Sibling/parent/depth conflicts reject the transaction. These are application policies, not manufacturer drilling or capacity.
- Shelf construction previews fixed/adjustable conversion while preserving the panel ID and edge intent. Adjustable conversion snaps to a concept level. Nested divisions/contents must be removed first; no custom content is silently deleted.
- Arrangement presets review open, base, wall-style and tall configurations of the same model. Body size stays unchanged unless Use suggested body size is checked. Top/back/support/mounting changes retain custom contents, materials, bands and dormant settings; preview/Apply/Cancel and one-step Undo cover the complete transformation.
- Choose full top or independently sized front/rear top rails; full inset back or upper/lower rear rails. Review the ghost model, usable depth and preserved interior count, then Apply construction or Cancel preview. Rails use carcass stock. Rear rails reserve their thickness behind all interior panels; top-zone height remains reserved for either top option.
- Wall mounting offers None, Wall restraint (on direct-floor/concept-foot support) and Suspended concepts. Review wall gap, mounting-centre offset from top, side setbacks and suspended body clearance above floor, then Apply. Suspension sets floor support to Unassigned while retaining every foot/plinth dimension, material and band. Undo restores the complete previous support in one step. Select the rail/bracket envelopes in Structure or 3D; Rear provides a rear perspective for inspection.
- Feet & plinth offers unassigned/direct-floor/four-foot support. Preview foot height (70–200 mm), independent front/rear and shared side setbacks, front plinth setback, optional left/right returns and floor/top gaps. Apply as one Undo step. Hide the plinth in the view to inspect feet without changing saved intent. Plinth material inherits the carcass or can be overridden; its panels use the same edge controls. Clearance conflicts reject the transaction.
- Materials & edge banding selects the carcass, full-back, interior or plinth role. Interiors inherit the carcass stock/finish/grain unless explicitly overridden. Pick generic stock thickness, expand Finish & grain intent if needed, and apply the reviewed change. Invalid dependencies preserve the entire prior cabinet.
- Select a panel for its four named edge controls. Choose unbanded or a pinned 0.8/1/2 mm generic band. Finished dimensions remain fixed; core and band geometry are derived inside that envelope. Edge choices for inactive top/back variants are retained when switching construction.
- Browser autosave is specific to this origin, browser and profile. Use JSON backups before clearing browser data or changing the local address. Unreadable autosaves are preserved until backed up through the editing guide.

## Current limits

This remains conceptual construction. Sides span the body; bottom/full top fit between them. Top rails occupy that same reserved top zone. A full back fits between the four carcass panels; rear rails are vertical panels of carcass stock. Rail pairs require at least a 20 mm gap, an application policy. No joinery, preparation, structural/racking capacity or wall support is inferred.

Generic carcass/interior stock is available at 16/18/19/22 mm, and back stock at 6/9/12 mm. These are versioned declared records, not verified purchased materials. Unspecified, white-concept and oak-concept finishes carry pinned identities; colour rendering stays in the design system. Grain is stored relative to each panel's two broad-face axes. Band products are generic concepts matching the panel finish. Band corner treatment is schematic; board-core dimensions are not manufacturing cut sizes and include no preparation allowances.

Fixed shelf/divider positions remain absolute inside their parent opening. Material changes reserve actual selected thickness and update descendants; positions and identities are never silently rewritten. Invalid changes are rejected. The 60 mm minimum opening and 5 mm drag grid are application policies, not support-hole or load requirements. Body depth excludes fronts/handles. Support may remain unassigned, sit directly on the floor, or use four concept feet. Installed height is body top above the floor reference: body height plus foot height or suspended body clearance. With no floor reference it remains unassigned. Changing support never translates the body origin.

The pinned concept foot profile has a 60 × 60 mm plate, 34 mm post and 50 mm base. Four feet and 5 mm plinth clearances are application modelling policies. No purchased fitting, clip, drilling, fixing, load capacity or stability is verified. Plinth covers are nonstructural; side returns meet the front cover without overlapping. Settings and panel edge intent survive disabling support/plinth.

Wall mounting uses an application-owned, pinned 30 mm-high/5 mm-deep rail and two 30 × 50 mm bracket envelopes in a 15–100 mm rear gap. Centres must fit within the body envelope and remain at least 10 mm apart. These are spatial policies only: no cabinet connection, back cutout, wall substrate, anchor, fastener, preparation or load/stability rating is assigned. The provisional layout is not an installable assembly. Wall restraint requires floor/feet support; suspension keeps that support inactive and retains the settings. Disable mounting before re-enabling feet, or Undo suspension to restore the previous layout.

The hardware shortlist is explicit but **disabled pending assembly verification**. No fitting is substituted or implied. Stage 0's complete verified starter fitting set remains open; see `docs/hardware-shortlist.md`. Verified foot/clip packs, manufacturer shelf supports and verified suspension/anchoring and Stage 3–5 tools remain deferred, without placeholder menus.

Camera state and theme are presentation state; they are not cabinet intent or saved in the cabinet file. Ordinary edits preserve the camera; Fit is explicit. Native files pin the schema, evaluator, material and construction policy revisions. Native schema 7 pins evaluator `interiors-7` and adjustable policy `adjustable-1`, mounting policy `mounting-1` and support policy `support-1`, construction policy `construction-1`, interior policy `fixed-1`, and all stock/finish/band revisions. Schemas 1–6 upgrade as disclosed copies with unchanged finished geometry and retained construction/interior intent. Autosave writes to a v7 key and preserves previous v1/v2/v3/v4/v5/v6 records. Schema 6 copies retain every existing construction/material/edge/installation setting and gain no adjustable shelves by default. Schema 5 cabinets retain all feet/plinth settings and gain disabled mounting. Earlier cabinets gain unassigned support without changing existing geometry. Unknown formats fail clearly and preserve the original data. Save downloads committed intent; apply a preview before backing up its changes.

## Stage 2 acceptance status

The remaining concept-design software is implemented and locally reviewed: fixed/adjustable interiors, construction variants, materials/banding, installation layouts and four reviewed presets. Full Stage 2 sign-off remains open for fitting verification. The six supplied FeroShop products are recorded in Fitting references, explicitly NOT APPLIED; existing concept geometry is not relabelled as real hardware. AXILO 637.76.353's supplier range is 90–120 mm, whereas the separately pinned concept profile remains 70–200 mm. The supplied Blum hanger is right-handed only and the fixed-shelf item is a housing only. Matching assembly/preparation, regional companion parts, physical trial fixtures and cabinet/wall structural acceptance remain incomplete. See `docs/stage-2-review.md` and `docs/stage-2-fitting-evidence.md`.

## Repository

This is a separate Git repository. Stage 0/1 is on `main`; the current Stage 2 increment is on local feature branch `feat/stage-2-completion` for review (including the construction checkpoint). The agreed private source repository is **https://github.com/bogdan-burcea/cabinet-studio** (`origin`). Source synchronization does not deploy the app. No files in `/Users/Bogdan/Projects/cabinet-workshop` are edited or copied into the new controller.

See `docs/architecture.md`, `docs/backlog.md` and `docs/reference-review.md` for boundaries and staged follow-up work.
