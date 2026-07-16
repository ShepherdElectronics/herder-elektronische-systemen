# herder-elektronische-systemen

## TI Piccolo dynamometer documentation

The [TI Piccolo dual-motor PMSM dynamometer project page](projects/ti-piccolo-pmsm-dynamometer.html) includes the phase-sense protection and long-term testability documentation.

Supporting engineering calculations:

- [Engineering-calculations index](docs/engineering-calculations/README.md)
- [Personal Regen / DC Bus / VSEN workbook](docs/engineering-calculations/Personal_Regen_DC_Bus_VSEN_Documentation.xlsx)

- [BOOSTXL phase-sense visual preview](docs/engineering-calculations/BOOSTXL_phase_sense_network_calculations.png)

### Phase-sense protection and long-term testability

VSEN_A, VSEN_B and VSEN_C are individual phase-to-ground signals, not direct phase-to-phase voltage signals. At a 24 V DC bus, the expected per-phase range is approximately 0-1.79 V. D2, the onsemi NUP4201MR6T1G TVS/ESD array, protects low-voltage sensing electronics from transients and ESD; it is not a regenerative-energy clamp or brake element.

See the [internal calculation/reference workbook](docs/engineering-calculations/Personal_Regen_DC_Bus_VSEN_Documentation.xlsx) for the preserved formulas, test expectations and maintenance context.