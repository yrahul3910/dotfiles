# pixilate

A pi agent extension that renders a little pixel-art scene in a TUI widget:
characters wander back and forth, hop, blink, and occasionally stop to idle
while the agent works.

## Characters

- `bunny` — hops along in little arcs
- `cat` — trots around, pounces, and stretches into a loaf when idle
- `guy` — a round-faced fellow who shuffles about

Pick which ones appear (comma-separated) via the `PIXILATE_CHARACTERS`
environment variable; the default is `bunny,cat,guy`.

Each character runs its own little state machine (walk / idle / jump, with
random blinks), so they act independently.

## Layout

- `index.ts` — the pi extension: widget setup, tick loop, terminal detection
- `scene.ts` — actor state machines and scene compositing
- `sprites.ts` — palette and pixel art; add new characters here
- `png.ts` — minimal PNG encoder (bitmap rows → base64)
- `osc11.ts` — queries the terminal background color so outlines stay visible
  on both light and dark themes

## Adding a character

Add a `CharacterSprite` to `sprites.ts` (all art drawn facing right with
palette keys; ` ` is transparent) and register it in `CHARACTERS`:

- `walk` — two frames, required
- `jump` — optional; characters without one simply never jump
- `idle` — optional sequence of poses played in order while standing still
  (each held for `ticks`, the last held until the idle ends), e.g. the cat's
  stretch → loaf
- Use `E` for eyes plus a `blink` substitution map to get blinking for free

To install dependencies:

```bash
bun install
```
