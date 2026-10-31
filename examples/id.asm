; Six-digit ID → dedicated 8255 #2
; PA = digits 1–2, PB = digits 3–4, PC = digits 5–6
; Packed BCD: one digit per group of four LEDs.
ORG 2000H
LXI SP, 0FFFFH

MVI A, 80H       ; Mode 0, all three ports output
OUT 93H

MVI A, 00H       ; PA: 00
OUT 90H
MVI A, 00H       ; PB: 00
OUT 91H
MVI A, 00H       ; PC: 00
OUT 92H
HLT
END
