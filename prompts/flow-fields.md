# Flow Fields Baseline

Use this module only as a baseline inside the `client-create-visual` workflow.
It is meant to guide an agentic AI model building a particle-driven VVavy effect, not to bypass the normal discovery and approval steps.

## Workflow Placement

- Ask whether the user wants points, smoke-like particles, liquid trails, a swarm, or a field of glowing dust.
- Confirm whether the particles should feel airy, fluid, aggressive, or meditative.
- Confirm whether trails and feedback are required or optional.

## Baseline Effect Goal

Create a GPU-driven field of particles that moves according to a procedural vector field.
The field should feel organic, musical, and scalable without turning into a random spray.

## Baseline Technical Pattern

- Store particle state in textures or another GPU-friendly structure.
- Use a ping-pong update pass to evolve position and velocity.
- Render particles from the updated state in a separate pass.
- Wrap, respawn, or softly redirect particles when they leave the active field.

## Baseline Architecture

- Data texture for particle state.
- Update shader for simulation.
- Render shader for visible particles.
- Optional feedback pass for trails.

## Audio Mapping Baseline

- `bassEnergy`: flow strength, particle advection speed, or global field pressure.
- `midEnergy`: turbulence or vector-field complexity.
- `trebleEnergy`: point size, sparkle, or emission highlights.
- `stereoBalance` or `stereoSpread`: lateral bias in emitters, never camera tilt.
- `isBeat`, `accentPulse`, or `dropStart`: redirect field flow or inject a burst layer, with cooldowns.

## Performance Baseline

- Start with a mobile-safe particle count.
- Reuse textures and buffers.
- Avoid per-frame allocations.
- If the user wants heavier density, scale carefully rather than defaulting to millions of particles.

## VVavy Output Expectations

- Return one minified `.js` file only.
- Use `WebGLFeatureVisualizer`.
- Keep all passes embedded in the single output file.
