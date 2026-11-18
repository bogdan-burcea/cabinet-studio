# Verification — Stage 0/1 prototype

18 November 2026, Node 24.15.0, local preview at `http://127.0.0.1:5173`.

## Automated checks

`npm test`: eight passing tests, including 27 width/height/depth combinations covering modelling limits. Checks assert positive panels, enclosure, no panel-volume overlap, correct opening bounds with a nonzero origin, stable identities, numeric/drag equality, one Undo step per drag, invalid edit preservation, cancellation, Redo branching, versioned native round trips and rejection of malformed or unsupported files/revisions. Native round trips reproduce the same evaluated geometry.

`npm run build`: TypeScript and Vite production build pass. Vite emits an advisory about the Three.js-containing JavaScript chunk exceeding 500 kB; this prototype has not been optimized for delivery or hosted.

## Local browser review

- Local server returns HTTP 200 and the WebGL cabinet renders.
- Reviewed both desktop (1440 × 960) and narrow side-panel layout; all elements remain accessible through a compact selector in narrow layouts.
- Numeric width changes update the model and dimensions. Undo/Redo restores the matching values.
- Invalid 20 mm height preserves the 720 mm body, resets the field and presents the valid range.
- Width handle drag from 754 to 903 mm commits one transaction. One Undo restores 754 mm and exhausts that drag's history step.
- Panel selection updates the inspector and selection presentation. Camera orbit, 3D reset, Fit and zoom respond. View presets and numerical controls are present for keyboard/button alternatives.
- Graphite/Linen change the shell, controls and viewport presentation without altering cabinet dimensions or materials.
- Native JSON saved from the UI at 800 mm width, then a 900 mm edit was made. Opening the saved file restored 800 mm. Undo restored 900 mm and Redo restored 800 mm.
- Reload restores browser-local dimensions. The reviewed starting cabinet was left at 600 × 720 × 560 mm in Graphite.

Screenshots are supplied alongside the repository as `preview-graphite.jpg` and `preview-linen.jpg`.

## Remaining validation

No claim of manufacturer-validated construction, structural capacity, physical fitting verification, measured 30 fps performance or first-time-user usability acceptance. Hardware candidates remain disabled; a complete verified starter fitting set is outstanding. No deployment was performed.
