; Six-digit ID → dedicated 8255 #2
; PA = digits 1–2, PB = digits 3–4, PC = digits 5–6
; Packed BCD: one digit per group of four LEDs.
ORG 2000H
LXI SP, 0FFFFH

MVI A, 80H       ; Mode 0, all three ports output
STA F003H

MVI A, 12H       ; PA: 12
STA F000H
MVI A, 34H       ; PB: 34
STA F001H
MVI A, 56H       ; PC: 56
STA F002H
HLT
END
