# Domain Warping Baseline

Use this as an optional baseline module inside the VVavy create-client workflow.
It should tell an agentic AI model how to approach domain warping in a VVavy-compatible visual after discovery is complete.

## Workflow Placement

- Confirm whether the user wants the result to feel like marble, smoke, liquid, plasma, lava, clouds, or something more abstract.
- Ask whether the warping should drive the whole image or only a layer within a larger composition.
- Confirm how readable versus chaotic the pattern should be.

## Baseline Effect Goal

Build organic, nested-noise motion by warping coordinates with other noise fields.
This should create a fluid, non-repetitive surface that still feels musically driven and controllable.

## Baseline Technical Pattern

- Start from normalized coordinates.
- Build nested offsets such as `f(p + g(p + h(p)))`.
- Use different frequencies, gains, or flow directions per layer so the result does not collapse into one noisy blob.
- Animate the fields with time and smoothed audio values.

## Effect Levers

- Pattern scale.
- Warp strength.
- Octave count.
- Flow speed.
- Rotation or directional drift.

## Audio Mapping Baseline

- `bassEnergy`: inner displacement strength and large, slow warps.
- `midEnergy`: octave weight or turbulence density.
- `trebleEnergy`: fine detail motion or directional shimmer.
- `overallEnergy`: contrast and total warp amplitude ceiling.
- `spectralFlux`: temporary distortion spikes or pattern inversion moments.

## Recommended Usage

- Use this module for fluid surfaces, smoke-like tunnels, living backgrounds, or heat-haze distortion.
- Combine it with shape logic, feedback, or kaleidoscopic folding when the user wants a richer effect.
- Smooth every audio input before it reaches the warp math to avoid noisy flicker.

## VVavy Output Expectations

- Return one minified `.js` file only.
- Default to `WebGLFeatureVisualizer`.
- Keep shader code inline and viewport-safe.
