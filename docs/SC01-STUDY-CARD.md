# SC-01 study card from the later photographs

The final three photos identify the LED equipment as an **SC-01 8255 STUDY CARD**. It contains its own 8255 and buffer/decoder ICs. It is not a passive LED panel connected to an on-board PPI's 24 outputs. The local originals are in `references/lab/details` (file IDs 7e1b32cc, 422de2a5 and ec5bc856).

The skin now follows the observed layout: PA along the bottom, PB along the top right, PC vertically at the right, AD0–AD7 at the top left, and five /CS, A0, A1, /RD, /WR indicators nearer the middle. There are 24 port lamps and 13 bus/status lamps. Generated decorative silkscreen is imperfect; live lamp tooltips identify each actual simulated bit. The three small value badges are simulator aids showing the packed-BCD port bytes, rather than claimed physical display hardware.

## CPU connection and chip selection

Connect **trainer CN1 → SC-01 CN1 with the 50-pin CPU-bus cable**. The logical bundle includes +5 V and ground; no separate four-rail supply is required for the default study-card preset. The SC-01 CN2 connector exposes its 24 port signals and can drive another interface module. Its independent PPI implements the same mode 0/1/2, BSR, handshake and interrupt-latch behavior as the trainer PPIs.

The ID PDF establishes SC-01 PA/PB/PC/control at **30/31/32/33**. The stepper PDF also uses **30–33**, with the motor connected to the trainer's second PPI. These are alternate lab profiles. In this model a complete SC-01 bus selects its independent chip for the second address range; with that bus unplugged, the range selects the trainer motor PPI. The motor preset unplugs SC-01 automatically. This explicit selection is a simulator convention: no physical address-decoder schematic was supplied, so simultaneous decoding of both chips at that range is not claimed. The separate analog PPI remains at **00–03**, allowing ID and DAC operation together.

The 50-pin and 26-pin views expose **logical** signal order. Exact Kitek physical pin numbering, bus loading, buffer delays and address-decoder equations were not established by the supplied photos or product specification. Do not use the virtual pin numbering as a real-hardware wiring diagram.

## Indicators and stepping

The eight AD lamps show the latest observed CPU data byte. /CS, A0, A1, /RD and /WR show the latest instruction-level bus transaction, including I/O reads/writes and instruction fetches. Asserted active-low signals light their indicator. These are retained transaction indicators; rapid physical multiplexing, LED persistence and individual T-state signal edges are not simulated.

The slide switch selects full clock (OFF) or single-step (ON). Start execution using `G` and the desired address. In single-step mode the SC-01 STEP key executes one complete 8085 instruction per press; switching OFF resumes continuous execution. The exact unprovided hardware gating circuit and microcycle stepping are not claimed. LCD `T` remains available as an independent software step command.

Desk saves include the independent SC-01 chip, bus indicators, single-step switch and ribbon netlist. Older desks using a passive 24-signal LED connection still restore with that legacy wiring and their saved address map.

## Source checks

[Kitek's manufacturer specification](../references/lab/M85-04-manufacturer.pdf) lists the SC-01 8255 PPI Study Card as a supported study module. The photographed card itself supplies the layout, labels and connector evidence. The supplied [ID program](../references/lab/manuals/01_id_output_8255.pdf) supplies the address map and 42/50/50 sample data. [Renesas' 82C55A datasheet](references/82c55a-official.pdf) supplies the compatible mode, direction, BSR and handshake behavior; the model retains the original NMOS 8255A's write-only control-register behavior.
