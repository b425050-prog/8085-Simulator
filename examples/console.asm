; RST 3: print zero-terminated string at HL
; RST 1: output A; RST 2: get a queued input byte
ORG 2000H
LXI SP, 0FFFFH
LXI H, MESSAGE
RST 3
HLT
MESSAGE:
    DB "Hello from the 8085!", 13, 10
    DB "56 KB of user RAM is ready.", 13, 10, 0
END
