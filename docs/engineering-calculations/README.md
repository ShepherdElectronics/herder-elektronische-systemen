# Engineering calculations

## DC Bus / VSEN documentation

This folder contains an internal calculation and reference file supporting the TI Piccolo dual-motor PMSM dynamometer documentation. It is provided as engineering working documentation, not as a polished deliverable or production qualification package.

- [Workbook: Personal_Regen_DC_Bus_VSEN_Documentation.xlsx](Personal_Regen_DC_Bus_VSEN_Documentation.xlsx)
- [Visual preview: BOOSTXL_phase_sense_network_calculations.png](BOOSTXL_phase_sense_network_calculations.png)

The workbook documents the BOOSTXL-DRV8305EVM phase-sense divider, RC filtering and TVS/ESD protection. VSEN_A, VSEN_B and VSEN_C are individual phase-to-ground signals. For a 24 V DC bus, the expected per-phase range is approximately 0-1.79 V.

D2 is the onsemi NUP4201MR6T1G TVS/ESD protection array. It protects low-voltage sensing electronics from transients and ESD; it is not a regenerative-energy clamp or brake element.

The workbook was created to preserve hardware interpretation, test expectations and maintenance knowledge for future engineering use. Private email drafts, personal tracking notes and unrelated internal source notes are not included in this public repository copy. Workbook formulas are retained.