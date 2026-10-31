; ADC0808/0809 channel 0 → DAC via 8255 #1
; PC0–2: channel, PC3: ALE+START, PC7: EOC
; ADC OE tied high. Control word 8AH.
ORG 2000H
LXI SP, 0FFFFH
MVI A, 8AH
OUT 83H
AGAIN:
    MVI A, 08H  ; Channel 0, ALE+START high
    OUT 82H
    XRA A       ; Falling START begins conversion
    OUT 82H
POLL:
    IN 82H
    ANI 80H
    JZ POLL     ; Wait for EOC=1
    IN 81H      ; 8-bit result from ADC
    OUT 80H     ; Same code to DAC
    STA 3000H   ; Most recent sample in user RAM
    JMP AGAIN
END
