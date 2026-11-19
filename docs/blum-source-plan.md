# Official Blum data integration

Recorded 18 November 2026. User request: use the Blum Cabinet Configurator as an official information source for the existing standalone Cabinet Studio project. First validation target: drawer cabinet with a Blum box system. Start with the existing TANDEMBOX antaro M 500 mm pack; do not create a separate application.

## Architecture and scope

Keep the standalone cabinet model, geometry evaluator and command transactions application-owned. Import manufacturer evidence into versioned catalogue packs, independent of the interface. Preserve existing native files and their pinned revisions. Keep development local; no publication is authorized. This research does not enable manufacturing output or a new hardware family automatically.

## Sources actually inspected

- Authenticated Cabinet Configurator: https://e-services.blum.com/main/#/PAI010?1=1&sysfwd=1
- Results > Configuration details offers PDF/XLSX, cover, overview, wooden cuttings, optional wooden-part barcodes and production drawings.
- Results > CAD-files > Configuration (3D) offers DAE, DWG, DXF, SAT, SKP and STEP; PNG is optional. Production drawings and views/sections have separate 2D sections.
- Results > CAD/CAM interfaces describes BXF as containing fitting information, wooden-part cutting dimensions and drilling positions. The observed selector offers EASYSTICK (*.bxf2). No sample file has yet been downloaded or decoded; do not assume its schema, import compatibility or coverage.
- Official integration overview: https://publications.blum.com/2026/catalogue/en/627/
- Official Cabinet Configurator overview: https://www.blum.com/ca/en/services/planning-construction-product-selection/cabinet-configurator/
- Existing pack evidence and limits: [Stage 4](stage-4-antaro.md).

Only an empty reference cabinet was explored in this session. Height 720 -> 800 changed internal height 684 -> 764; the original height was restored. No drawer configuration, exported file, exact drilling pattern or collision boundary was verified in this session.

## First reference fixture

1. Match the existing external TANDEMBOX antaro M / 500 mm / BLUMOTION / SW / 16 mm chipboard bottom and back. Record selected market, language, date and exact returned article identifiers. Do not substitute another region or variant silently.
2. Configure one drawer in a known cabinet. Record all panel construction, clear dimensions, front geometry, offsets and fitting choices. Choose sufficient clear depth for the existing 503 mm requirement; the previously explored 510 mm cabinet with 507 mm internal depth is a candidate, not a completed fixture.
3. Obtain available official configuration report, parts list, CAD assembly and BXF/BXF2 output through the service's normal export controls. Record unavailable formats rather than inventing them.
4. Preserve original exports unchanged, with SHA-256 fingerprints and acquisition timestamps. Normalized records reference originals and retain units, coordinate frame, handedness, article/set quantity semantics and market.
5. Compare article identities, bottom/back dimensions, fitting transforms and any evidenced drilling positions against the current pack. Differences must be explained before updating a pin. An exact model does not establish load limits or compatibility rules by itself.
6. Vary one input at a time: opening width, usable depth, panel thickness and drawer/front allocation. Capture boundary acceptance/rejection and official output. Record inferred behavior separately from documented manufacturer rules.
7. Add focused regression fixtures for supported results. Update pack revisions explicitly; keep unsupported variants disabled. Physical fitting and structural acceptance remain separate from software comparisons.

## Evidence record contract

Each source record needs a stable ID, official URL or original filename, retrieval time, publication/version when known, selected market/language, applicable articles and variant, units/coordinate convention, SHA-256 for files, scope and reuse status.

Each normalized fact or rule needs its value/formula, exact supporting page/file/element, applicable conditions, evidence class (manufacturer documented / official export observed / behavior inferred / application policy), verification date and unresolved limits. Do not label inferred formulas or simplified envelopes as official CAD or production-verified geometry.

## Reuse and distribution

Blum provides CAD/BXF integration workflows, but that is not evidence of unrestricted redistribution or a public API. Review the terms applicable to the actual exports before bundling assets in a distributed product. Publicly indexed Blum material terms describe customer/partner use for their own processes and marketing and written approval for deviations. Record this as an unresolved scope question, not a legal conclusion or a blocker to independent geometry development. Do not copy account credentials into the application or make it depend on an undocumented live service.

## Current state

Source/export discovery is complete for the inspected screens. Fixture capture, format inspection, comparison with the antaro pack, rights for redistribution, and implementation of import/update tooling are pending. No runtime integration or manufacturing claim is made by this document.
