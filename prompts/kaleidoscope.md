# Kaleidoscope Baseline

Use this module only after the interaction gate in `src/prompts/client-create-visual.md`.
This is a baseline for an agentic AI model building a VVavy kaleidoscope effect. It should shape the plan and implementation, not replace the workflow.

## Workflow Placement

- Confirm the user chose `create new visual`.
- Confirm they want a regular music visualizer unless they explicitly want a capture-video kaleidoscope.
- Ask what to keep fixed versus what can mutate: fold count, seam visibility, palette, tunnel feel, and brightness.
- Summarize the selected kaleidoscope direction before generating code.

## Baseline Effect Goal

Create a 3D-feeling kaleidoscopic tunnel or chamber built from mirrored slices, layered depth, and smooth musical motion.
The result should stay hypnotic and rich without becoming strobe-heavy or structurally unstable.

## Core Visual Baseline

### Symmetry And Geometry

- Build repeated mirrored slices with a fold-rotation function.
- Ask whether the user prefers fewer bold folds or many fine folds.
- Ask whether seams should stay visible or blend away.
- Prefer SDF or grid-derived geometry so the folds stay crisp.

### Layering

- Stack several depth layers to imply volume and infinite continuation.
- Offset layer progress and timing so the tunnel does not feel like one repeated card.

### Color

- Use a vibrant but controlled palette, often via HSV-style color motion.
- Keep brightness stable and avoid hard flashes unless requested.

## Audio Mapping Baseline

- `bassEnergy`: tunnel momentum and radius breathing.
- `trebleEnergy`: line thickness and crisp detail.
- `overallEnergy`: brightness envelope and pattern evolution speed.
- `novelty`, `spectralFlux`, or beat cues: symmetry transitions, hue pulses, or glow accents.
- `centroid` or `flatness`: palette steering and textural sharpness.

## Safety Baseline

- Warm up audio-reactive behavior during the first few seconds.
- Clamp and sanitize all metric inputs.
- Smooth every reactive parameter.
- Throttle fold changes and other structural shifts.
- Use energy history for rare events instead of reacting to every small fluctuation.

## Recommended Usage

- Use this module when the user wants hypnotic symmetry, tunnel repetition, or music-synced mirrored geometry.
- Combine it with feedback, domain warping, or chromatic aberration only when the user wants a richer stack.

## VVavy Output Expectations

- Return one minified `.js` file only.
- Default to `WebGLFeatureVisualizer`.
- Keep the visual full-frame, centered, and copy/paste safe.
