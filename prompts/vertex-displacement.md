# Vertex Displacement & Wave Simulations

## Description
Manipulates the actual geometry mesh (rather than just pixels) to create realistic water surfaces, flapping fabric, terrain, or organic deformations.

## Visual Effect
- Realistic water surfaces with ripples and waves
- Flapping fabric or flags
- Terrain with hills and valleys
- Organic mesh deformations
- Cloth simulation
- Morphing geometry

## How It Works

### Vertex Shader Displacement
Unlike fragment shaders (pixel-based), vertex shaders modify the actual 3D positions of geometry:

```glsl
// Vertex Shader
attribute vec3 a_position;
attribute vec2 a_texCoord;

uniform float u_time;
uniform float u_waveHeight;
uniform float u_waveFrequency;

void main() {
    vec3 pos = a_position;

    // Calculate wave displacement
    float wave = sin(pos.x * u_waveFrequency + u_time) *
                 cos(pos.y * u_waveFrequency + u_time) *
                 u_waveHeight;

    // Displace vertex along its normal (typically Z-axis)
    pos.z += wave;

    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(pos, 1.0);
}
```

### Wave Simulation Types

#### Simple Sine Wave
```glsl
float wave = sin(pos.x * freq + time) * amplitude;
```

#### Gerstner Waves (Realistic Ocean)
```glsl
// Per-wave calculation
vec2 d = normalize(waveDirection);
float k = 2.0 * PI / wavelength;
float c = sqrt(9.8 / k); // wave speed
float f = k * (dot(d, pos.xy) - c * time);
float a = steepness / k;

pos.x += d.x * a * cos(f);
pos.y += d.y * a * cos(f);
pos.z += a * sin(f);
```

#### Simplex Noise Terrain
```glsl
float height = simplex3D(vec3(pos.xy * scale, time * speed));
pos.z += height * amplitude;
```

## Required Uniforms

### Basic Waves
- `u_time` (float) - Animation time
- `u_waveHeight` (float) - Displacement amplitude
- `u_waveFrequency` (float) - Wave density
- `u_waveSpeed` (float) - Animation speed

### Advanced
- `u_projectionMatrix` (mat4) - Camera projection
- `u_viewMatrix` (mat4) - Camera view
- `u_modelMatrix` (mat4) - Object transform
- `u_normalMatrix` (mat3) - For lighting calculations

### Ocean Simulation
- `u_waveDirections` (vec2[]) - Array of wave directions
- `u_wavelengths` (float[]) - Array of wavelengths
- `u_steepness` (float[]) - Array of wave sharpness values

## Geometry Requirements
- **High-res mesh**: More vertices = smoother displacement (e.g., 128x128 grid)
- **Proper normals**: Recalculate normals for correct lighting
- **UV coordinates**: For texture mapping

## Audio Integration
- Map `u_audioLow` to wave height (bass creates bigger waves)
- Use `u_audioMid` for wave frequency modulation
- Apply `u_audioHigh` to ripple speed or choppiness
- Beat detection for splash effects or sudden deformations

## Parameters

### Water Surface
- **Wave Height**: 0.1-2.0 (vertical displacement)
- **Wave Frequency**: 1.0-10.0 (number of waves)
- **Wave Speed**: 0.5-3.0 (animation rate)
- **Steepness**: 0.0-1.0 (0=smooth, 1=sharp crests)
- **Number of Waves**: 4-8 (for Gerstner waves)

### Fabric/Cloth
- **Gravity**: 0.0-10.0 (downward force)
- **Wind Strength**: 0.0-5.0 (horizontal force)
- **Stiffness**: 0.1-1.0 (resistance to bending)

### Terrain
- **Noise Scale**: 0.5-5.0 (feature size)
- **Height Scale**: 0.0-10.0 (mountain height)
- **Octaves**: 3-8 (detail levels)

## Advanced Features

### Normal Recalculation
For proper lighting, recalculate normals based on displaced positions:
```glsl
vec3 tangent = vec3(1.0, 0.0, dFdx(displacement));
vec3 bitangent = vec3(0.0, 1.0, dFdy(displacement));
vec3 normal = normalize(cross(tangent, bitangent));
```

### Physics-Based Cloth
- Spring-mass system simulation
- Collision detection
- Wind forces with turbulence

### Interactive Ripples
- Mouse/touch position creates displacement
- Multiple ripple sources
- Decay over time

## Performance Considerations
- More vertices = more computation in vertex shader
- Consider LOD (Level of Detail) for distant geometry
- Use instancing for repeated displaced meshes
- GPU compute shaders for complex physics (WebGL 2.0)
