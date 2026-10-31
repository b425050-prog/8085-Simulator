; Square wave → 8255 #1 PA → DAC0800
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
    DB FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH
    DB FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH, FFH
    DB 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H
    DB 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H, 00H
END
