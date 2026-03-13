# Chaotic 4D Manifold Baseline

Use this module only inside the `client-create-visual` workflow after the user has chosen a new visual direction.
Treat it as a baseline for an agentic AI model that needs a non-looping, mathematically unstable motion system rather than as a complete prompt by itself.

## Workflow Placement

- Confirm the user wants a regular visualizer.
- Ask whether they want the chaos to drive geometry, color segmentation, camera feel, or all three.
- Confirm whether the look should feel alien, pop-art, liquid, or architectural.
- Summarize the intended use of the chaotic system before writing the final single-file output.

## Baseline Effect Goal

Create a VVavy-compatible visual whose motion comes from a chaotic attractor instead of simple oscillators.
The point of this module is to give the visual non-repeating structure while still keeping motion smooth and readable.

## Core Baseline Logic

### Chaotic Motion Engine

- Use a Lorenz attractor or similar strange attractor in JavaScript.
- Update the system every frame with a clamped `dt`.
- Pass the evolving chaotic state to the shader as one or more uniforms.

Suggested Lorenz baseline:

- `dx = sigma * (y - x) * dt`
- `dy = (x * (rho - z) - y) * dt`
- `dz = (x * y - beta * z) * dt`

Standard starting constants:

- `sigma = 10`
- `rho = 28`
- `beta = 8 / 3`

### Manifold Warping

- Use the chaotic values to rotate, pinch, or twist space inside the vertex or fragment logic.
- Prefer radius-aware deformation such as `length(position.xy)` so the center and edges behave differently.
- Tie the strongest distortions to smoothed chaos, not raw frame noise.

### Segmented Color Logic

- Avoid relying only on gradients.
- Use `step()`, masks, or hard palette bands for a graphic, pop-art, or posterized look.
- Offset UVs or pattern bands with the chaotic state so color drift feels linked to the physical deformation.

## Audio Mapping Baseline

- `overallEnergy`: scale the intensity of the chaotic deformation.
- `bassEnergy`: control low-frequency bulging or manifold compression.
- `spectralFlux` or `novelty`: trigger temporary increases in chaotic gain.
- `centroid`: shift palette bands or stripe density.
- `reverbTail`: extend how long the chaotic state visually lingers.

## Safety And Continuity Baseline

- Never hard-reset the object or phase during playback.
- Keep a continuous time base in all major calculations.
- Smooth or clamp the attractor output before using it for visible transforms.
- Use a long enough geometry or repeated pattern so the viewer never sees the system “end.”

## VVavy Output Expectations

- Return one minified `.js` file only.
- Default to `WebGLFeatureVisualizer`.
- Keep everything inline and copy/paste safe for the Create Visual dialog.
