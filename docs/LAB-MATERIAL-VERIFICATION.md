# Supplied lab material and official cross-check

The three PDFs were copied unchanged from Downloads into `references/lab/manuals`. All ten pages were rendered and visually inspected; text extractions are stored beside the PDFs. Their printed Intel syntax is source material, while the user's explicit LCD grammar governs typed code.

## Address map from the supplied programs

| PPI / experiment | PA | PB | PC | Control |
|---|---|---|---|---|
| IC-02 DAC, 8085 page 1 | 00 | 01 | 02 | 03 |
| ID output | 30 | 31 | 32 | 33 |
| Stepper | 30 | 31 | 32 | 33 |

Addresses are hexadecimal. The DAC sheet's second page is for an 8086 and has a different address scheme; it is not applied to the 8085. The desk now has two trainer PPIs plus the independent SC-01 PPI identified by the final photos. Analog uses 00–03; the second address range 30–33 selects the connected SC-01 for ID, or the trainer motor PPI when SC-01 is unplugged. This alternate selection is a simulator convention because the physical decoder schematic was not supplied. The motor preset leaves the LED board unplugged because these two experiments share the second PPI's PA. The combined ID + DAC experiment remains independent.

## Instruction grammar

Valid LCD examples: `MVI A 80`, `OUT 03`, `LXI D 0000`, `CALL 03A6`, `MOV A,B`, `INR A`, `HLT`.

Exactly one ASCII space separates the mnemonic and its operands; MVI/LXI use another single space between their operands. MOV alone uses a comma between its register operands, with no space next to the comma. No H suffix, leading/trailing/doubled spaces, tabs, non-ASCII whitespace, labels, comments or directives are accepted. Immediate bytes have one or two hex digits; word operands have one to four. Generated displays use two/four digits. Keyboard letters are uppercased, as on the trainer.

Validation does not trim, normalize separators or guess program intent. A syntax failure occurs on Enter, leaves the current address/RAM/written-byte mask unchanged, and keeps the rejected line until Reset. Backspace, Delete and address arrows cannot edit coding. Reset then `1 A address Enter` replaces an instruction at that address; `M address Enter` changes an individual byte. Valid instructions targeting unused ports or unintended addresses remain valid, since the requested check is syntax-only. For example, `CM A` is a legal conditional CALL to 000A even if the programmer intended `CMA`; logic intent cannot be inferred from spacing.

## Independent machine-code fixtures

The fixtures in `tests/lab-profile.test.js` were transcribed from the PDFs' machine-code columns and are compared to bytes entered through the monitor:

- ID: 2000–2010, control 80 at 33, data 42/50/50 at 30/31/32, HLT. The LED test checks `0100 0010`, `0101 0000`, `0101 0000` through the real cable netlist.
- Clockwise stepper: 2000–2029, outputs F9/F5/F6/FA to 30, calls the local routine at 2023, which loads DE=0000 and calls 03A6. Every instruction/address/byte matches the sheet.
- Ramp: 2000–200D, OUT 00 and OUT 01 for X and Y; no added delay loop.
- Square: 2000–201B, C=FF delay loop at 2015; no substituted timing routine.
- Triangle: 2000–2018, exact CPI/JNZ up/down loops, including the sheet's endpoint behavior.

The sine, combined, ADC, half-step and counter examples are additional programs, formatted with the same strict grammar. All exported files in `examples/lab-desk` can be imported as LCD instruction lines.

## Motor phase order and delay

For the supplied harness, adjacent coil order is PA0, PA2, PA1, PA3. The half-step ring is 1,5,4,6,2,A,8,9. Thus the supplied low nibbles 9,5,6,A advance clockwise; A,6,5,9 reverse it. The upper F nibble does not energize additional coils. The simulation tests direction, repeated cycles, invalid transitions and actual execution of the complete PDF program.

The original monitor ROM was not supplied. A compatible executable 8085 delay service is installed at 03A6:

```
03A6  PUSH PSW
03A7  DCX D
03A8  MOV A,D
03A9  ORA E
03AA  JNZ 03A7
03AD  POP PSW
03AE  RET
```

It preserves A and flags, leaves DE=0000, and balances the return stack. DE=N takes N iterations; zero means 65,536. Its duration is 24*N+29 T states, approximately 0.512 s for zero at 3.072 MHz. This service's timing is reconstructed, not claimed as the manufacturer's ROM timing.

## Official references checked

- [Intel 8080/8085 Assembly Language Programming Manual, 9800301-04](references/intel-8080-8085-manual.pdf): instruction encodings and operand forms, little-endian word bytes, register/flag behavior and 8085 timing. Printed page 3-37 describes MVI as a two-byte instruction with seven states and no affected flags. The complete 246-encoding regression and arithmetic/interrupt tests remain active. Its conventional source-assembler notation is intentionally distinct from the user's LCD dialect.
- [Renesas/Intersil 82C55A datasheet, FN2969 rev. 11](references/82c55a-official.pdf): mode/control/direction bits, PA/PB/PC register selection and handshakes. 80 configures mode 0 with all ports output; 8A gives PA output, PB input, PC upper input and PC lower output. The model retains original 8255A write-only-control behavior rather than the CMOS device's enhanced control readback. External board base addresses come from the lab sheets, not from the PPI datasheet.
- [TI DAC0800/DAC0802 datasheet](references/dac0800.pdf): eight-bit current scaling and complementary outputs. The module op-amp gain/offset remains an ideal adjustable model; the supplied program sheet does not establish the real module resistor calibration.
- [TI ADC0808/ADC0809 datasheet](references/adc0808-adc0809.pdf): conversion sequence, channel/data interface and EOC behavior. The exact IC-01 harness schematic remains an explicit reconstruction assumption.
- [Kitek M85-04 specification](../references/lab/M85-04-manufacturer.pdf): board identification, two PPIs, 8253, LCD/keyboard and supported interface modules. The 3.072 MHz CPU setting assumes division of the board's 6.144 MHz oscillator; it also agrees with the supplied waveform programs and photographed approximate square/triangle frequencies. The clock remains configurable.

The exact square period is 7,248 T states (423.841 Hz at 3.072 MHz). The exact triangle period is 15,821 T states (194.172 Hz). Tests execute the source programs and compare successive PC/cycle timestamps against these independently calculated periods. These are virtual-time measurements; browser throughput does not redefine the CPU clock.

## Fidelity limits

The CPU, PPI semantics and supplied machine-code fixtures are tested. This is not an original ROM dump, a transistor-level analog simulation, a mechanical torque/inertia model, or proprietary Tektronix firmware. Visual surfaces are photographic reconstructions used only for appearance. Live canvases, hardware states, terminals and event handlers supply all behavior. The main guide documents sample-rate, transfer-function and wiring assumptions.

The final SC-01 photos supersede the earlier passive LED-panel interpretation. See [SC01-STUDY-CARD.md](SC01-STUDY-CARD.md); its CPU bus, independent PPI, port nets, data/status indicators, instruction-level step controls and saved state have dedicated regressions in `tests/sc01.test.js`.
