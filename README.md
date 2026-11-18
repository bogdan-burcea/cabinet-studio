# Cabinet Studio

A new, local cabinet builder. Stage 0/1 foundation plus Stage 2 construction, fixed interiors, material bindings and edge banding, following `docs/specification-v0.2.md`. The original specification is requirements material; it does not grant permission to publish. Nothing in this project deploys automatically.

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
- Orbit, pan and zoom; use Front, Side, Top, 3D and Fit. With the canvas focused, arrows orbit, +/− zoom and F fits.
- Undo/Redo with the toolbar or Cmd/Ctrl-Z, Shift-Cmd/Ctrl-Z or Ctrl-Y.
- Switch Graphite/Linen with the theme button. The shell, controls, dimension overlays and 3D presentation change together.
- Save cabinet creates native cabinet JSON. Open validates the schema and revisions and can be undone. Files from Cabinet Workshop are unsupported.
- Select a leaf opening to add a fixed shelf or divider at its centre. Repeat in the child openings for nested interiors. Select a division to reposition, centre, duplicate or remove it. Duplicate uses the largest child opening. Remove child divisions before their parent; nested contents are never silently deleted. Invalid dependent edits preserve the entire previous cabinet.
- Choose full top or independently sized front/rear top rails; full inset back or upper/lower rear rails. Review the ghost model, usable depth and preserved interior count, then Apply construction or Cancel preview. Rails use carcass stock. Rear rails reserve their thickness behind all interior panels; top-zone height remains reserved for either top option.
- Materials & edge banding selects the carcass, full-back or interior role. Interiors inherit the carcass stock/finish/grain unless explicitly overridden. Pick generic stock thickness, expand Finish & grain intent if needed, and apply the reviewed change. Invalid dependencies preserve the entire prior cabinet.
- Select a panel for its four named edge controls. Choose unbanded or a pinned 0.8/1/2 mm generic band. Finished dimensions remain fixed; core and band geometry are derived inside that envelope. Edge choices for inactive top/back variants are retained when switching construction.
- Browser autosave is specific to this origin, browser and profile. Use JSON backups before clearing browser data or changing the local address. Unreadable autosaves are preserved until backed up through the editing guide.

## Current limits

This remains conceptual construction. Sides span the body; bottom/full top fit between them. Top rails occupy that same reserved top zone. A full back fits between the four carcass panels; rear rails are vertical panels of carcass stock. Rail pairs require at least a 20 mm gap, an application policy. No joinery, preparation, structural/racking capacity or wall support is inferred.

Generic carcass/interior stock is available at 16/18/19/22 mm, and back stock at 6/9/12 mm. These are versioned declared records, not verified purchased materials. Unspecified, white-concept and oak-concept finishes carry pinned identities; colour rendering stays in the design system. Grain is stored relative to each panel's two broad-face axes. Band products are generic concepts matching the panel finish. Band corner treatment is schematic; board-core dimensions are not manufacturing cut sizes and include no preparation allowances.

Fixed shelf/divider positions remain absolute inside their parent opening. Material changes reserve actual selected thickness and update descendants; positions and identities are never silently rewritten. Invalid changes are rejected. The 60 mm minimum opening and 5 mm drag grid are application policies, not support-hole or load requirements. Body depth excludes fronts/handles; installation height is unassigned.

The hardware shortlist is explicit but **disabled pending assembly verification**. No fitting is substituted or implied. Stage 0's complete verified starter fitting set remains open; see `docs/hardware-shortlist.md`. Adjustable shelves, feet/plinth, mounting and Stage 3–5 tools remain deferred, without placeholder menus.

Camera state and theme are presentation state; they are not cabinet intent or saved in the cabinet file. Ordinary edits preserve the camera; Fit is explicit. Native files pin the schema, evaluator, material and construction policy revisions. Native schema 4 pins evaluator `materials-4`, construction policy `construction-1`, interior policy `fixed-1`, and all stock/finish/band revisions. Schemas 1–3 upgrade as disclosed copies with unchanged finished geometry and retained construction/interior intent. Autosave writes to a v4 key and preserves previous v1/v2/v3 records. Unknown formats fail clearly and preserve the original data. Save downloads committed intent; apply a preview before backing up its changes.

## Repository

This is a separate Git repository. Stage 0/1 is on `main`; the current Stage 2 increment is on local feature branch `feat/stage-2-materials` for review (including the construction checkpoint). The agreed private source repository is **https://github.com/bogdan-burcea/cabinet-studio** (`origin`). Source synchronization does not deploy the app. No files in `/Users/Bogdan/Projects/cabinet-workshop` are edited or copied into the new controller.

See `docs/architecture.md`, `docs/backlog.md` and `docs/reference-review.md` for boundaries and staged follow-up work.
