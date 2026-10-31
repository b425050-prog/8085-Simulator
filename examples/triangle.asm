; Triangle wave → 8255 #1 PA → DAC0800
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
    DB 00H, 08H, 10H, 18H, 20H, 28H, 30H, 38H, 40H, 48H, 50H, 58H, 60H, 68H, 70H, 78H
    DB 80H, 87H, 8FH, 97H, 9FH, A7H, AFH, B7H, BFH, C7H, CFH, D7H, DFH, E7H, EFH, F7H
    DB FFH, F7H, EFH, E7H, DFH, D7H, CFH, C7H, BFH, B7H, AFH, A7H, 9FH, 97H, 8FH, 87H
    DB 80H, 78H, 70H, 68H, 60H, 58H, 50H, 48H, 40H, 38H, 30H, 28H, 20H, 18H, 10H, 08H
END
