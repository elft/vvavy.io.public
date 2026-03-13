# Chromatic Aberration Baseline

Use this module as a workflow-aware baseline inside `src/prompts/client-create-visual.md`.
It should guide an agentic AI model on how to build this effect in VVavy, not replace the required client discovery steps.

## Workflow Placement

- Ask whether the user wants this as a subtle finishing pass or as a dominant stylized effect.
- If they are transforming live shared video or screen content, keep the underlying image recognizable unless they explicitly ask otherwise.
- Confirm whether they want cinematic, dreamy, glitchy, VHS-like, or physical-camera behavior.

## Baseline Effect Goal

Add lens-style post processing that makes the render feel optical and physical.
This module is best used as a restrained post pass layered onto a stronger base visual or capture effect.

## Baseline Technical Pattern

- Sample the current color buffer or capture frame in a fullscreen post pass.
- Build chromatic aberration from radial channel offsets based on distance from screen center.
- Optionally add barrel or pincushion distortion, grain, and light edge shaping.
- Keep the effect stable, centered, and resolution-safe.

## Core Building Blocks

### Chromatic Aberration

- Compute a direction from the screen center.
- Scale the RGB offset with distance from center and a controlled strength uniform.
- Keep the green channel near the original sample as the stable anchor.

### Distortion

- Use radial distortion for barrel or pincushion warping.
- Keep values conservative unless the user explicitly wants a broken-lens look.

### Grain

- Add subtle animated grain or dust for texture.
- Use grain as a finishing layer, not as the main motion source.

### Edge Treatment

- Avoid heavy vignette by default because the create-client workflow emphasizes full-frame readability unless the user asks for darker edges.

## Audio Mapping Baseline

- `trebleEnergy` or `presenceEnergy`: chromatic split strength.
- `midEnergy`: radial distortion amount.
- `spectralFlux` or `novelty`: temporary lens stress or glitch moments.
- `overallEnergy`: grain visibility or subtle contrast lift.
- `beatConfidence`: optional short pulses, heavily smoothed and throttled.

## Recommended Behavior

- Keep the effect subtle for cinematic or dreamy briefs.
- Push it harder only for glitch, VHS, or rupture-style requests.
- On screen/video effects, preserve legibility first and let the optical damage ride on top.

## VVavy Output Expectations

- Use `WebGLFeatureVisualizer` for normal visuals or `WebGLCaptureVideoVisualizer` for shared-screen/video transformations.
- Return one minified `.js` file only.
- Inline all shader code and register the visual at the bottom.
