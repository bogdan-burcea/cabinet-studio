# Cabinet Studio

A new, local cabinet builder. Stage 0 foundation and Stage 1 rectangular carcass prototype, following `docs/specification-v0.2.md`. The original specification is requirements material; it does not grant permission to publish. Nothing in this project deploys automatically.

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
- Browser autosave is specific to this origin, browser and profile. Use JSON backups before clearing browser data or changing the local address. Unreadable autosaves are preserved until backed up through the editing guide.

## Current limits

This is a conceptual five-panel carcass, not verified construction. Sides run full height/depth; top and bottom fit between them. A 6 mm back fits inside the four panels at the rear. No joinery, drilling, supports, fitting load checks, grain or edge treatment is inferred. Generic material records are pinned at 18/6 mm. Body depth excludes fronts and handles; installation height is unassigned. The editable ranges are application policies, not structural ratings.

The hardware shortlist is explicit but **disabled pending assembly verification**. No fitting is substituted or implied. Stage 0's complete verified starter fitting set remains open; see `docs/hardware-shortlist.md`. Stage 2–5 tools and downstream workflows have no interfaces or placeholder menus.

Camera state and theme are presentation state; they are not cabinet intent or saved in the cabinet file. Ordinary edits preserve the camera; Fit is explicit. Native files pin the schema, evaluator, material and construction policy revisions. This first version supports schema 1 only; there are no silent migrations.

## Repository

This is a separate local Git repository, developed on `feat/stage-0-1`. Desired GitHub name/visibility: **cabinet-studio / private**, approved in the implementation chat. No remote is configured until the separate GitHub repository is created and connected. No files in `/Users/Bogdan/Projects/cabinet-workshop` are edited or copied into the new controller.

See `docs/architecture.md`, `docs/backlog.md` and `docs/reference-review.md` for boundaries and staged follow-up work.
