# Reaction-Diffusion (Gray-Scott Model)

## Description
Simulates chemical interactions to create organic, growing patterns found in nature like zebra stripes, coral growth, fingerprint ridges, or cellular division.

## Visual Effect
- Zebra stripes and animal patterns
- Coral growth and organic structures
- Fingerprint-like ridges
- Cellular division patterns
- Living, breathing textures that evolve over time

## How It Works

### Gray-Scott Model Equations
$$\frac{\partial A}{\partial t} = D_A \nabla^2 A - AB^2 + F(1-A)$$

$$\frac{\partial B}{\partial t} = D_B \nabla^2 B + AB^2 - (K+F)B$$

Where:
- `A` and `B` are concentrations of two "chemicals"
- `D_A`, `D_B` are diffusion rates
- `F` is the feed rate
- `K` is the kill rate
- `∇²` is the Laplacian (neighbor calculation)

### Implementation
**Requires multi-pass shader**:
1. **Update Pass**: Calculate new chemical concentrations based on neighbors
2. **Render Pass**: Map concentrations to colors

### Neighbor Calculation
Sample 8 surrounding pixels to calculate Laplacian:
```glsl
vec2 laplacian =
    -1.0 * center +
    0.2 * (top + bottom + left + right) +
    0.05 * (topLeft + topRight + bottomLeft + bottomRight);
```

## Required Uniforms
- `u_buffer` (sampler2D) - Previous state texture
- `u_feedRate` (float) - Chemical feed rate (0.01-0.1)
- `u_killRate` (float) - Chemical kill rate (0.045-0.07)
- `u_diffusionA` (float) - Diffusion rate for chemical A (1.0)
- `u_diffusionB` (float) - Diffusion rate for chemical B (0.5)
- `u_time` (float) - Time for initialization
- `u_resolution` (vec2) - Screen resolution

## Audio Integration
- Map `u_audioMid` to Feed Rate (`F`) to make patterns "bloom" with the beat
- Use `u_audioLow` to modulate Kill Rate (`K`) for pattern morphing
- Apply `u_audioHigh` for diffusion rate changes (creates faster/slower growth)

## Parameters
- **Feed Rate (F)**: 0.01-0.1 (higher = more "food" for growth)
- **Kill Rate (K)**: 0.045-0.07 (higher = more death/clearing)
- **Diffusion A**: Typically 1.0
- **Diffusion B**: Typically 0.5
- **Time Step**: 0.5-1.5 (simulation speed)

## Preset Patterns
- **Coral**: F=0.0545, K=0.062
- **Mitosis**: F=0.0367, K=0.0649
- **Spirals**: F=0.014, K=0.054
- **Worms**: F=0.078, K=0.061
