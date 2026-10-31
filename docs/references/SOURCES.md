# Reference sources

The simulator implementation and user guide are original project code and prose. The following primary documents informed the functional models. Manufacturer PDF files retain their original copyright and notices; they are included for local study.

- Intel, **8080/8085 Assembly Language Programming Manual**, order 9800301-04 (May 1981): [archived Intel manual](https://bitsavers.trailing-edge.com/pdf/intel/ISIS_II/9800301-04_8080_8085_Assembly_Language_Programming_Manual_May81.pdf). Referenced for instructions, flag behavior, interrupt semantics and 8085-specific timing, including HLT's five states. The full historical assembler dialect is broader than the implemented absolute assembler.
- Renesas/Intersil, **82C55A CMOS Programmable Peripheral Interface**, FN2969 rev. 11 (2015): [manufacturer PDF](https://www.renesas.com/en/document/dst/82c55a-datasheet). Pin-compatible 8255-family mode/control/handshake reference. The simulator models the original 8255A's write-only control register rather than the CMOS enhanced readback feature.
- Texas Instruments, **ADC0808/ADC0809**, SNAS535H: [local PDF](adc0808-adc0809.pdf), [manufacturer PDF](https://www.ti.com/lit/ds/symlink/adc0808-n.pdf).
- Texas Instruments, **ADC080x / ADC0804**, SNOSBI1C: [local PDF](adc0804.pdf), [manufacturer PDF](https://www.ti.com/lit/ds/symlink/adc0804-n.pdf).
- Texas Instruments, **DAC0800/DAC0802**, SNAS538C: [local PDF](dac0800.pdf), [manufacturer PDF](https://www.ti.com/lit/ds/symlink/dac0800.pdf).
- Texas Instruments, **DAC0808**, SNAS539A: [local PDF](dac0808.pdf), [manufacturer PDF](https://www.ti.com/lit/ds/symlink/dac0808.pdf).
- Ken Shirriff, **Inside the ALU of the 8085 microprocessor**: [original reverse-engineering research](https://www.righto.com/2013/01/inside-alu-of-8085-microprocessor.html).
- MAME maintainers, **i8085 CPU source**: [upstream source](https://github.com/mamedev/mame/blob/master/src/devices/cpu/i8085/i8085.cpp), used as a cross-check for subtraction/decrement auxiliary-carry behavior, TRAP/RIM behavior and instruction timing. No emulator code was copied into this implementation.

The ideal analog models deliberately omit electrical characteristics, tolerances and settling behavior. See [the user guide](../USER-GUIDE.md) for the formulas and modeled interfaces. The ADC0808/0809 profile shares one ideal transfer function and the DAC0800/0808 choices share an ideal current-transfer function.

## Supplied lab profile, 2026-10-31

- [ID output sheet](../../references/lab/manuals/01_id_output_8255.pdf): 30/31/32/33, sample ID 425050 and packed-BCD bytes 42/50/50.
- [Clockwise stepper sheet](../../references/lab/manuals/02_clockwise_stepper_motor.pdf): PA 30, control 33, F9/F5/F6/FA and CALL 03A6. Original monitor firmware is unavailable; the executable compatibility delay and its reconstructed timing are documented in [the verification note](../LAB-MATERIAL-VERIFICATION.md).
- [IC-02 DAC sheet](../../references/lab/manuals/IC-02_DAC_8085_&_8086_Waveform_Generation[1].pdf): 8085 page 1 establishes 00/01/02/03 and exact ramp, triangle and square program bytes. The second page is 8086 material and does not define this 8085 desk's map.
- Local official-document copies: [Intel manual](intel-8080-8085-manual.pdf), [Renesas 82C55A](82c55a-official.pdf), and TI ADC/DAC documents above. The supplied pages were rendered and visually checked; independent program-byte fixtures and CPU timing tests supplement the source review.
- The LCD's strict single-space, MOV-only comma, no-H grammar and disabled Backspace/Delete are explicit user requirements. They override the conventional printed Intel syntax in the reference documents. The separate advanced workspace retains conventional Intel syntax.
- All original photos, both full videos, review frames and the nine later close-ups are stored under [references/lab](../../references/lab). Photographic surface generation and prompts are documented [with the local assets](../../assets/photographic/README.md).

The final three card photographs identify the LED module as SC-01, with an independent 8255 and a 50-pin CPU bus. The implementation and unprovided pin/decoder/microcycle details are recorded in [SC01-STUDY-CARD.md](../SC01-STUDY-CARD.md). Kitek’s supported-study-card list is the manufacturer identity check; the photos establish the visible layout.
