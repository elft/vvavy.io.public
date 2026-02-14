# Domain Warping (Nested Noise)

## Description
A mathematical technique using nested noise functions to distort coordinates, creating organic, fluid-like textures that look like swirling marble, moving clouds, or flowing lava.

## Visual Effect
- Swirling marble textures
- Moving clouds or gas simulations
- Flowing lava patterns
- Incredibly complex, non-repetitive organic textures
- Fluid-like distortions

## How It Works

### Core Formula
Calculate nested noise: `f(p + g(p + h(p)))`

Where:
- `f`, `g`, `h` are different noise functions (typically Fractal Brownian Motion)
- Each layer distorts the coordinates of the next
- Creates complex, natural-looking patterns

### Implementation Steps
1. Start with base coordinates `p`
2. Calculate innermost noise: `h(p)`
3. Use result to offset coordinates: `p + h(p)`
4. Calculate middle noise: `g(p + h(p))`
5. Use result for final offset: `p + g(p + h(p))`
6. Calculate final noise: `f(p + g(p + h(p)))`

## Required Uniforms
- `u_time` (float) - Animates the noise over time
- `u_resolution` (vec2) - Screen resolution
- `u_audioLow` (float) - Modulates displacement strength
- `u_scale` (float) - Controls overall pattern scale

## Audio Integration
- Use `u_audioLow` to modulate displacement strength in inner noise layers
- Apply `u_audioMid` to control the number of octaves in fBM
- Map `u_audioHigh` to rotation or flow speed

## Parameters
- **Octaves**: Number of noise layers (3-8 typical)
- **Lacunarity**: Frequency multiplier between octaves (1.5-3.0)
- **Gain**: Amplitude multiplier between octaves (0.3-0.7)
- **Displacement Strength**: How much each layer warps (0.1-2.0)
- **Flow Speed**: Animation rate (0.01-0.5)
