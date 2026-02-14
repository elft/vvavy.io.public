# Chromatic Aberration & Lens Effects

## Description
Simulates physical optical imperfections of a camera lens, creating RGB "splitting," film grain, or "God Rays" that make digital art feel more physical and cinematic.

## Visual Effect
- RGB color splitting at screen edges
- Lens distortion and warping
- Film grain and noise
- Vignette darkening at corners
- God Rays (light shafts)
- Physical camera artifacts

## How It Works

### Chromatic Aberration
Light wavelengths refract differently through a lens:
1. Sample the final rendered image
2. Offset Red, Green, and Blue channels by different amounts
3. Base offset on distance from screen center

```glsl
vec2 direction = v_texCoord - 0.5; // vector from center
float dist = length(direction);
vec2 offset = normalize(direction) * dist * u_aberration;

float r = texture2D(u_buffer, v_texCoord + offset).r;
float g = texture2D(u_buffer, v_texCoord).g;
float b = texture2D(u_buffer, v_texCoord - offset).b;

vec3 color = vec3(r, g, b);
```

### Additional Lens Effects

#### Barrel/Pincushion Distortion
```glsl
vec2 centered = v_texCoord - 0.5;
float r2 = dot(centered, centered);
vec2 distorted = centered * (1.0 + u_distortion * r2);
vec2 uv = distorted + 0.5;
```

#### Vignette
```glsl
float vignette = smoothstep(u_vignetteRadius, u_vignetteRadius - u_vignetteSoftness, dist);
color *= vignette;
```

#### Film Grain
```glsl
float grain = random(v_texCoord + u_time) * u_grainAmount;
color += grain;
```

## Required Uniforms
- `u_buffer` (sampler2D) - Final rendered image
- `u_aberration` (float) - Chromatic aberration strength (0.0-0.02)
- `u_distortion` (float) - Barrel/pincushion distortion (-0.3 to 0.3)
- `u_vignetteRadius` (float) - Vignette size (0.5-1.5)
- `u_vignetteSoftness` (float) - Vignette edge softness (0.1-0.5)
- `u_grainAmount` (float) - Film grain intensity (0.0-0.2)
- `u_time` (float) - For animated grain

## Audio Integration
- Increase aberration based on `u_audioHigh` (snare/hats create RGB splits)
- Pulse vignette with `u_audioLow` (darker on bass hits)
- Modulate distortion with `u_audioMid`
- Increase grain on transients for "film damage" effect

## Parameters

### Chromatic Aberration
- **Strength**: 0.0 (none) to 0.02 (extreme splitting)
- **Falloff**: How aberration increases toward edges (1.0-3.0 power)

### Distortion
- **Amount**: -0.3 (pincushion) to 0.3 (barrel)
- **Type**: Radial, tangential, or combined

### Vignette
- **Radius**: 0.5 (tight) to 1.5 (subtle)
- **Softness**: 0.1 (hard edge) to 0.5 (soft fade)
- **Darkness**: 0.0 (black) to 0.8 (subtle)

### Film Grain
- **Amount**: 0.0 to 0.2 (intensity)
- **Size**: 1.0 to 4.0 (grain scale)
- **Monochrome**: true/false (color vs B&W grain)

## Effect Combinations
- **Vintage Camera**: Medium aberration + barrel distortion + vignette + grain
- **Glitch**: Extreme aberration (audio-reactive) + random distortion
- **Dreamy**: Subtle aberration + soft vignette + light grain
- **VHS**: Horizontal aberration + scanlines + heavy grain
