; 8085 arithmetic and stack experiment
ORG 2000H
LXI SP, 0FFFFH
MVI A, 45H      ; Packed BCD 45
ADI 38H         ; Add packed BCD 38
DAA             ; A = 83H (decimal 83)
STA 3000H

LXI H, 4000H
MVI M, 0FFH
INR M           ; 00H, Z=1, AC=1, CY preserved
LXI B, 1234H
PUSH B
CALL DOUBLE
POP D           ; DE = 1234H
HLT
DOUBLE:
    ADD A
    RET
END
