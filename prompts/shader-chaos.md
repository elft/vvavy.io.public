# Shader Chaos

Develop a high-performance, single-file WebGL audio visualizer using the Web Audio API and a custom fragment shader.

Strictly no external libraries. Do not use Three.js, p5.js, or similar frameworks.

## Core Visual Logic

- **Technique**: Use domain warping layered with recursive spatial folding. The coordinate system (`UV`s) must be warped by multiple octaves of simplex noise.
- **Living camera**: Do not use traditional matrix-based camera movement. Instead, create a phantom camera effect by modulating UV offsets and noise scales over time. It should feel like drifting, diving, and being pulled through a fluid fractal dimension.
- **Spatial breaks**: Implement a transient listener in JavaScript. When audio energy exceeds a dynamic threshold, the shader must trigger a spatial break.

## Spatial Break Behavior

A spatial break should include:

- Immediate coordinate mirroring for a kaleidoscope effect
- Extreme chromatic aberration
- A temporary inversion of the spatial folding logic

## Audio Integration

Use uniforms to map audio to behavior:

- **Bass**: Drive the scale of the recursive folds and the intensity of the domain warping.
- **Mids**: Drive the fine-grained detail and complexity of the noise patterns.
- **Transients**: Use a `punch` uniform from `0.0` to `1.0` that decays rapidly and triggers physical distortion of the screen boundaries.

## Aesthetic Goals

- **Cinematic chaos**: The visual should never loop and must constantly evolve by mixing time-based variables with audio data.
- **Edge interaction**: The visual must interact with the viewport edges by stretching, bending perspective, or breaking the frame during heavy drops.
- **Color theory**: Use a dynamic palette that shifts from deep, atmospheric voids to explosive, high-energy light based on the `overall_energy` uniform.
