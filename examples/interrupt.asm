; Press the RST7.5 pulse button in the interrupt panel.
; The ISR increments the low eight ID-board LEDs.
ORG 2000H
VECTOR 003CH, ISR
LXI SP, 0FFFFH
MVI A, 80H
OUT 93H
MVI A, 0BH      ; MSE=1, unmask 7.5, mask 6.5 & 5.5
SIM
MVI B, 00H
EI
WAIT:
    HLT
    JMP WAIT
ORG 2100H
ISR:
    PUSH PSW
    INR B
    MOV A, B
    OUT 90H
    POP PSW
    EI
    RET
END 2000H
