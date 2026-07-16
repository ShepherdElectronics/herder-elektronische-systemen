# TI Piccolo PMSM Dynamometer

Professional repository for the TI Piccolo dual-motor PMSM dynamometer and its supporting documentation.

## Project Overview

This repository presents the dynamometer as an engineering asset: a dual-motor PMSM test system used to develop, validate, and document control behavior, sensing, communications, and measurement workflows.

## Hardware Architecture

- TI C2000 F28069M control hardware
- Dual-motor PMSM dynamometer arrangement
- QEP encoder feedback
- BOOSTXL-DRV8305EVM phase-sense network
- Shared DC-bus behavior and regeneration handling
- External instrumentation for measured validation

## Motor-Control Firmware

The embedded firmware handles motor-control states, PWM generation, feedback processing, fault response, and system integration. The code is preserved as-is unless a wording update is required for documentation or user-facing labels.

## Efficiency Mapping

Efficiency mapping covers the measurement and analysis workflow used to characterize torque, speed, power, and efficiency across the operating range of the dynamometer.

## EPA Drive Cycle

EPA drive-cycle support describes the driver or host-side procedure used to replay a standardized speed profile for validation and comparison. Legacy shortened drive-cycle terminology is not used in the public presentation.

## SCI Host Interface

SCI communication is retained where it is part of the documented system interface. Documentation should describe it as an SCI interface or host interface, not as a class-based workflow.

## CAN Integration

CAN integration covers the telemetry and control migration from SCI to CAN where documented. The repository keeps the technical distinction between the two interfaces clear.

## Data Acquisition and Processing

Supporting MATLAB, Python, and spreadsheet-based assets capture calculations, test expectations, and post-processing used for validation and traceability.

## Validation Procedures

Validation procedures document the measurement setup, the expected behavior, the operating conditions, and the evidence used to assess the system.

## Repository Structure

- `projects/` - public project pages
- `docs/` - supporting engineering documentation and calculations
- `assets/` - figures, photographs, and supporting media
- `output/` - local export artifacts
- `tests/` - automated checks for site behavior
- `tools/` - local export and maintenance utilities

## Safety Considerations

- Verify test conditions before energizing the hardware
- Treat regenerative energy as a separate design problem from sensing protection
- Confirm wiring, instrumentation, and supply limits before running a drive cycle
- Do not infer performance beyond what the documented evidence supports

## Known Limitations

- Some supporting material is preserved as reference documentation rather than a polished release package
- Generated exports in `output/` are local artifacts and may lag the source pages until regenerated
- Historical repository names may still appear in linked external projects until those upstream repositories are renamed