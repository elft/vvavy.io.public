# Temporal Feedback Baseline

Use this module as a baseline inside the `client-create-visual` workflow after the user selects a direction.
It should tell an agentic AI model how to build feedback-based motion in VVavy while still following the normal discovery and final output rules.

## Workflow Placement

- Ask whether the user wants trails, ghosting, recursive tunnels, smearing, or liquid memory.
- Ask whether the feedback should feel subtle and cinematic or intense and hallucinogenic.
- Confirm whether the user wants the feedback to wrap across screen edges or stay center-anchored.

## Baseline Effect Goal

Create a visual that feeds prior frames into the current frame so motion leaves history behind.
The key outcome is persistence and memory, not just blur.

## Baseline Technical Pattern

- Use two framebuffers or textures in a ping-pong loop.
- Render the new frame while sampling the previous frame.
- Apply a small transform to the old frame before blending it back in.
- Present the composited result every frame.

## Core Feedback Levers

- Feedback persistence.
- UV scale drift.
- Rotation drift.
- Flow drift.
- Blend mode or decay curve.

## Audio Mapping Baseline

- `bassEnergy`: persistence amount and trail weight.
- `midEnergy`: zoom or scale drift.
- `trebleEnergy`: rotational shimmer or sharper echo detail.
- `reverbTail`: linger duration and memory density.
- `spectralFlux` or `novelty`: sudden disturbances or fresh echo injections.

## Edge-Wrap Baseline

- If the user wants screen-wrap ghosts, keep positions and deltas toroidal so motion crosses edges cleanly.
- Wrap sampled UVs with `fract()` or equivalent normalized wrapping logic.
- Avoid naive subtraction near edges when computing feedback motion.

## Stability Baseline

- Start around a safe feedback value rather than near runaway accumulation.
- Clamp transforms and blend factors.
- Smooth audio input and throttle beat-triggered direction changes.
- Keep the effect readable enough that the feedback history contributes structure, not mush.

## VVavy Output Expectations

- Return one minified `.js` file only.
- Use `WebGLFeatureVisualizer`, or `WebGLCaptureVideoVisualizer` if the user specifically wants feedback on shared video.
- Keep all buffer setup and shader code inline.
