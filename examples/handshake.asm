; 8255 #1 mode 1 input A, B mode 0 output.
; Disable the analog harness for this experiment.
; Set PA external switches, then click STB A pulse.
ORG 2000H
LXI SP, 0FFFFH
MVI A, 0B0H     ; A mode 1 input; B/C general pins output
OUT 83H
MVI A, 09H      ; BSR PC4=1 → enable INTE A
OUT 83H
WAIT:
    IN 82H      ; PC5 = IBF A
    ANI 20H
    JZ WAIT
    IN 80H      ; Read latched byte; clears IBF/INTR
    OUT 81H     ; Echo on port B
    STA 3000H
    JMP WAIT
END
