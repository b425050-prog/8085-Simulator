; Sine wave → 8255 #1 PA → DAC0800
; 64 samples, delay count 16.
; Period = 16984 T-states (loop overhead included).
; Rebuild after changing the waveform settings.
ORG 2000H
LXI SP, 0FFFFH
MVI A, 8AH       ; PA out, PB in, PC upper in, lower out
OUT 83H

REPEAT:
    LXI H, TABLE
    MVI B, 40H
NEXT:
    MOV A, M
    OUT 80H
    MVI C, 10H
WAIT:
    DCR C
    JNZ WAIT
    INX H
    DCR B
    JNZ NEXT
    JMP REPEAT

TABLE:
    DB 80H, 8CH, 98H, A5H, B0H, BCH, C6H, D0H, DAH, E2H, EAH, F0H, F5H, FAH, FDH, FEH
    DB FFH, FEH, FDH, FAH, F5H, F0H, EAH, E2H, DAH, D0H, C6H, BCH, B0H, A5H, 98H, 8CH
    DB 80H, 73H, 67H, 5AH, 4FH, 43H, 39H, 2FH, 25H, 1DH, 15H, 0FH, 0AH, 05H, 02H, 01H
    DB 00H, 01H, 02H, 05H, 0AH, 0FH, 15H, 1DH, 25H, 2FH, 39H, 43H, 4FH, 5AH, 67H, 73H
END
