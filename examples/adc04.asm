; ADC0804: CS tied low, PC3=/WR, PC0=/RD, PC7=/INTR
ORG 2000H
LXI SP, 0FFFFH
MVI A, 8AH
OUT 83H
AGAIN:
    MVI A, 01H  ; /WR low, /RD high
    OUT 82H
    MVI A, 09H  ; /WR rising begins conversion
    OUT 82H
POLL:
    IN 82H
    ANI 80H
    JNZ POLL    ; Wait for /INTR low
    MVI A, 08H  ; /RD low enables result
    OUT 82H
    IN 81H
    OUT 80H
    STA 3000H
    JMP AGAIN
END
