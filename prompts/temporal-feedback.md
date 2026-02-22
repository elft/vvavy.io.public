# Temporal Feedback Loop (Echo Effect)

## Description
Creates "ghost trails," motion blur, and infinite recursive tunnels by feeding the previous frame back into the current frame with slight transformations.

## Visual Effect
- Motion trails that persist over time
- Liquid-like bleeding and "echoes"
- Infinite recursive tunnel effect
- Hallucinogenic motion blur
- Trailing "hallucination" effects

## How It Works

### Core Architecture
**Double Buffering (Ping-Ponging)**:
1. Create two Framebuffer Objects (FBOs): `Texture_A` and `Texture_B`
2. Render current frame's logic into `Texture_B`, sampling `Texture_A` as `u_buffer`
3. Render `Texture_B` to the screen
4. Swap `Texture_A` and `Texture_B`

### Shader Logic
1. Sample the previous frame from `u_buffer` at `v_texCoord`
2. Apply transformation: slightly scale UV coordinates toward center or rotate by ~0.01 radians
3. Blend current and previous frames: `vec3 finalCol = currentFractal + (previousFrame * u_feedback)`

## Required Uniforms
- `u_buffer` (sampler2D) - Previous frame texture
- `u_feedback` (float, 0.0–1.0) - Controls how much of the old frame is kept
- `u_resolution` (vec2) - Screen resolution
- `u_time` (float) - Time elapsed

## Audio Integration
- Map `u_audioLow` to feedback amount for pulsing trails
- Use `u_audioHigh` for rotation speed modulation
- Apply `u_audioMid` to scaling transformation intensity

## Parameters
- **Persistence**: 0.0 (no trails) to 1.0 (infinite persistence)
- **Rotation**: -0.05 to 0.05 radians per frame
- **Scale**: 0.98 to 1.02 (zooming effect)
- **Blend Mode**: Additive, multiplicative, or alpha blend

## Seamless Screen-Wrap Ghosts (No Edge Bounce)
- For wrap-around visuals, represent center positions in normalized UV space (`0..1`) and wrap with:
  - `value = ((value % 1.0) + 1.0) % 1.0`
- Do not compute follow velocity with plain subtraction near edges.
  - Bad: `delta = target - current`
  - Good (shortest torus path):
    - `delta = target - current`
    - `if (delta > 0.5) delta -= 1.0`
    - `if (delta < -0.5) delta += 1.0`
- In shader sampling, wrap previous-frame UVs to avoid clipping at borders:
  - `prev = texture(u_buffer, fract(uv + flowDrift))`
- For radial ghost distance to a wrapped center, use wrapped delta:
  - `wrappedDelta = mod(uv - center + 0.5, 1.0) - 0.5`

## Recommended Smoothing Values (Temporal Feedback Ghost Style)
- `idleTimeout`: `0.5` seconds before autonomous movement starts.
- `flowLerp`: `1.0 - pow(0.95, dt * 60.0)` for stable frame-rate-independent smoothing.
- `mouseFollowGain`: `0.1` (`vx = dx * 0.1`, `vy = dy * 0.1`) for soft but responsive easing.
- `driftSpeed`: `0.0015 + audioIntensity * 0.009` (optionally multiply by `1.35` on beat).
- `beatCooldown`: `0.22` seconds to avoid rapid direction flipping.
- Feedback persistence: start around `0.94` to keep trails without runaway accumulation.
