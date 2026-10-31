; Saw wave → 8255 #1 PA → DAC0800
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
    DB 00H, 04H, 08H, 0CH, 10H, 14H, 18H, 1CH, 20H, 24H, 28H, 2CH, 30H, 34H, 38H, 3CH
    DB 40H, 44H, 48H, 4CH, 50H, 54H, 58H, 5CH, 60H, 64H, 68H, 6CH, 70H, 74H, 78H, 7CH
    DB 80H, 83H, 87H, 8BH, 8FH, 93H, 97H, 9BH, 9FH, A3H, A7H, ABH, AFH, B3H, B7H, BBH
    DB BFH, C3H, C7H, CBH, CFH, D3H, D7H, DBH, DFH, E3H, E7H, EBH, EFH, F3H, F7H, FBH
END
