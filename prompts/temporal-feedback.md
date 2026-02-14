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
