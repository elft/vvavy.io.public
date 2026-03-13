# Shader Chaos Baseline

Use this module after the client-create workflow establishes that the user wants a new visual.
This is a baseline for an agentic AI model building a chaotic, high-energy VVavy visual, not permission to skip user discovery.

## Workflow Placement

- Confirm the user wants a regular music visualizer.
- Ask how far they want the chaos pushed: atmospheric, unstable, ruptured, or full breakdown.
- Ask whether the image should stay mostly readable or deliberately fracture during intense moments.

## Baseline Effect Goal

Create a high-performance WebGL visual that feels fluid, unstable, and cinematic.
The motion should come from nested coordinate warping, recursive folding, and time-varying structure, while still staying within VVavy’s single-file create-client constraints.

## Baseline Technical Pattern

- Use a fragment shader as the core visual engine.
- Build the main look from domain warping plus recursive spatial folding.
- Simulate “camera” movement by changing UV offsets, scale, rotation, and field drift instead of relying on literal camera transforms.
- Add a transient-driven rupture state that temporarily changes how the space is folded or colored.

## Spatial Break Baseline

When the music crosses a meaningful transient or energy threshold:

- Mirror or re-slice coordinates for a short kaleidoscopic break.
- Increase chromatic split or edge stress briefly.
- Invert or perturb one part of the folding logic.
- Let the break decay over time instead of persisting indefinitely.

## Audio Mapping Baseline

- `bassEnergy`: large fold scale, warp amplitude, and low-frequency pressure.
- `midEnergy`: fine detail density and noise complexity.
- `overallEnergy`: palette intensity and overall turbulence ceiling.
- `spectralFlux`, `novelty`, or `accentPulse`: trigger punch events and rupture states.
- `dropStart` or `dropIntensity`: larger scene-wide breaks with cooldowns.

## Style Guardrails

- Keep the effect alive and evolving, not loop-obvious.
- Let the frame edges participate during heavy moments, but do not lose total image control.
- Use smoothing, clamping, and cooldowns so chaos stays intentional.

## VVavy Output Expectations

- Return one minified `.js` file only.
- Use `WebGLFeatureVisualizer`.
- No external libraries, imports, or extra files.
