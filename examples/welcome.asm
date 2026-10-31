; 8085 BENCH · first experiment
; User RAM: 2000H–FFFFH. Monitor ROM: 0000H–1FFFH.
; 8255 #1 at 80H: analog interface
; 8255 #2 at 90H: dedicated six-digit ID LEDs
ORG 2000H
LXI SP, 0FFFFH

; Independent ID board: PA=00, PB=00, PC=00
MVI A, 80H
OUT 93H
MVI A, 00H
OUT 90H
MVI A, 00H
OUT 91H
MVI A, 00H
OUT 92H

; Analog board: PA out, PB in, PC upper in/lower out
MVI A, 8AH
OUT 83H
XRA A

; Sawtooth: each OUT changes the physical DAC output
RAMP:
    OUT 80H
    INR A
    MVI C, 08H
DELAY:
    DCR C
    JNZ DELAY
    JMP RAMP
END
