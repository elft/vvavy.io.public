# Reaction-Diffusion Baseline

Use this module as a baseline inside the `client-create-visual` workflow after the user chooses a new visual direction.
It should guide an agentic AI model on how to build this effect for VVavy rather than acting like a standalone code request.

## Workflow Placement

- Ask what kind of organic pattern the user wants: coral, cells, worms, stripes, growth, fingerprints, or abstract biology.
- Ask whether the effect should fill the screen, live on geometry, or act as a texture layer.
- Confirm whether the user prefers slow evolution or frequent morphing.

## Baseline Effect Goal

Create a living chemical-pattern simulation using a Gray-Scott-style update loop.
The visual should feel self-evolving, musical, and temporally rich rather than like simple noise.

## Baseline Technical Pattern

- Use a ping-pong simulation buffer.
- In the update pass, compute diffusion and reaction from neighboring pixels.
- In the render pass, map the concentrations to a readable palette.
- Keep the simulation stable with conservative parameter ranges and a clamped time step.

## Gray-Scott Baseline

- `dA = DA * laplacianA - A * B * B + F * (1.0 - A)`
- `dB = DB * laplacianB + A * B * B - (K + F) * B`

Typical baseline ranges:

- `F`: roughly `0.01` to `0.1`
- `K`: roughly `0.045` to `0.07`
- `DA`: around `1.0`
- `DB`: around `0.5`

## Audio Mapping Baseline

- `midEnergy`: feed rate drift and growth activation.
- `bassEnergy`: kill rate modulation and broad morphological shifts.
- `trebleEnergy` or `presenceEnergy`: diffusion speed or edge crispness.
- `overallEnergy`: simulation speed ceiling and palette intensity.
- `spectralFlux` or `accentPulse`: seed injections, bloom events, or local perturbations.

## Recommended Usage

- Use this module when the user wants slow biological growth, pattern intelligence, or a feedback-driven surface.
- Combine it with domain warping or temporal feedback when the user wants more memory and instability.
- Keep parameter changes smoothed so the chemistry evolves musically instead of tearing.

## VVavy Output Expectations

- Return one minified `.js` file only.
- Use `WebGLFeatureVisualizer`.
- Embed all simulation and render shaders inline.
