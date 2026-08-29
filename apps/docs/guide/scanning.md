# Scanning Entry/Exit

**Entry:** `scanner/entry` → scan QR → `admit` (blocked during grace 60m after close).

**Exit:** `scanner/exit` → scan → complete/deposit logic (forfeit vs gradual).

Grace: after calendar close, no admit for 60m, inside play continues, auto-close ticks every 60s.
