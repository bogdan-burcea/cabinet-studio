# Cabineo in the simple editor

Adapted from the read-only Cabinet Workshop `src/workbench/cabineo.js` and its regression fixtures, rather than importing its controller. Sources checked 18 November 2026:

- [Lamello operating instructions](https://lamello.com/fileadmin/products/Operating_instructions_Cabineo.pdf), 26 February 2024, pages 1–2, surface-mounted collar, option 1.
- [Cabineo 8](https://lamello.com/products/drilling-system/cabineo-8) and [Cabineo 12](https://lamello.com/products/drilling-system/cabineo-12).
- Workshop white fitting references: Häfele 267.91.251 (8) / 267.91.252 (12).

The cabinet-level selector defaults to None, preserving existing drafts. Cabineo connects full tops/bottoms, fixed shelves and vertical dividers to actual perpendicular supporting panels. The 6 mm back is excluded. Housings use the matched three Ø15 × 11 mm bores at 3.6 / 14.8 / 26 mm from the joint edge; receiving bores are Ø5 × 8/12 mm, 5 mm inside the housing face. Bottom housings face up, top and shelf housings face down; divider housings use the right face. Full-panel depth positions follow Workshop's 50 mm setback and ≤300 mm spacing. Short rails use a symmetric setback of one quarter of their joint width (rounded down to whole millimetres, bounded between 20 and 50 mm). Thus a 120 mm rail places a pair at 30 and 90 mm instead of 50 and 70 mm. Automatic connector counts remain unchanged; explicit counts retain the 20 mm minimum pitch and collision checks. The global count is a target capped at the safe capacity of each rail contact, including divider-to-rail contacts; a 50 mm rail retains one connector per end without blocking changes to other joints. Minimum housing stock is 12 mm; receiving stock is screw depth +1 mm. Unsupported or colliding layouts fail without replacing the cabinet. Opposing 12 mm bores in an 18 mm divider are rejected; 8 mm may be used when the full arrangement clears.

3D and flat thumbnails show fitting/boring locations. Panels remain canonical rectangular geometry; this is an inspection preview, not boolean machined solids or CNC output. No loads, costs, exports, flush/HPL/M6/X variants or physical trial claims are added. Purchased fitting/stock trial verification remains deferred. Thumbnails show the selected machinable face; use Flip part when there are operations on both faces.

Regression coverage includes both fitting variants, shared dividers, matched patterns, underside face datum, quantity/spacing, resize and move identity, invalid transactions, Undo/Redo, native save/load, legacy migration and face projection.
