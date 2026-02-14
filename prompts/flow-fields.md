# GPGPU Flow Fields & Particle Physics

## Description
Uses the GPU for physics calculations to simulate millions of particles flowing like liquid or wind based on noise maps, creating organic fluid motion.

## Visual Effect
- Millions of individual points flowing through "wind" fields
- Liquid-like particle motion
- Smoke or gas simulations
- Swarm behavior
- Organic, flowing patterns

## How It Works

### GPGPU Architecture
**GPU General Purpose Computing**: Store particle data in texture color channels

1. **Data Texture**: RGB channels store particle positions (x, y, velocity)
2. **Update Pass**: Fragment shader calculates new positions based on flow field
3. **Render Pass**: Vertex shader reads positions from data texture and draws points

### Implementation Steps

#### Setup
1. Create data texture (e.g., 512x512 = 262,144 particles)
2. Initialize with random positions
3. Create two FBOs for ping-pong updates

#### Update Shader (Fragment)
```glsl
// Read current position from data texture
vec3 particle = texture2D(u_particles, v_texCoord).rgb;
vec2 pos = particle.xy;

// Calculate flow field at this position using noise
vec2 flow = vec2(
    noise(pos * u_scale + u_time),
    noise(pos * u_scale + u_time + 100.0)
);

// Update position
pos += flow * u_speed;

// Wrap or bounce at edges
pos = mod(pos, 1.0);

// Output new position
gl_FragColor = vec4(pos, particle.z, 1.0);
```

#### Render Shader (Vertex)
```glsl
// Read particle position from data texture
vec4 particleData = texture2D(u_particles, a_texCoord);
vec2 pos = particleData.xy;

// Convert to screen space
gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
gl_PointSize = u_pointSize;
```

## Required Uniforms

### Update Pass
- `u_particles` (sampler2D) - Current particle data texture
- `u_time` (float) - Time for noise animation
- `u_scale` (float) - Flow field scale
- `u_speed` (float) - Particle velocity multiplier
- `u_audioLow` (float) - Flow strength modulation

### Render Pass
- `u_particles` (sampler2D) - Updated particle data texture
- `u_pointSize` (float) - Visual size of particles
- `u_color` (vec3) - Particle color

## Audio Integration
- Map `u_audioLow` to flow field strength (stronger currents on bass)
- Use `u_audioMid` for turbulence/chaos amount
- Apply `u_audioHigh` to particle spawn rate or point size
- Link beat detection to flow direction changes

## Parameters
- **Particle Count**: sqrt of texture size (512x512 = 262k particles)
- **Flow Scale**: 0.5-5.0 (noise field scale)
- **Speed**: 0.001-0.05 (particle velocity)
- **Turbulence**: 0.0-2.0 (randomness in flow)
- **Point Size**: 1.0-10.0 (visual particle size)
- **Curl Noise**: Option to use curl noise for divergence-free flow
- **Attraction Points**: Add gravity wells or repellers

## Advanced Features
- **Trail Rendering**: Combine with temporal feedback for particle trails
- **Color by Velocity**: Map speed to color for visual feedback
- **Depth/3D**: Extend to 3D flow fields
- **Collision**: Add obstacle avoidance
