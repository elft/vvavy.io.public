# Cinematic Flythrough Baseline

Use this module after the client-create workflow has established that the user wants a new visual.
Treat it as a baseline for an agentic AI model building a moving, immersive visual language inside VVavy.

## Workflow Placement

- Confirm whether the user wants a regular visualizer or a screen/video transformation.
- Ask how intense the motion should feel: drifting, gliding, diving, or aggressive pull-through.
- Ask what should dominate the experience: geometry, atmosphere, speed, or distortion.

## Baseline Effect Goal

Create a visual that feels like the viewer is traveling through a living scene.
The scene should keep evolving, use the entire viewport, and feel synchronized to the track without becoming disorienting.

## Baseline Motion Direction

- Favor continuous forward or drifting movement over static composition.
- Use space warping, parallax, layered depth, and controlled perspective changes to imply travel.
- Keep the camera readable and smooth unless the user asks for chaos.
- Let the frame edges participate through stretch, bend, or environmental pressure rather than random clipping.

## Audio Mapping Baseline

- `bassEnergy`: travel speed, large-scale depth pulses, and corridor width.
- `midEnergy`: structural deformation and scene density.
- `trebleEnergy` or `presenceEnergy`: edge detail, sparkle, or emissive accents.
- `overallEnergy`: overall brightness, movement intensity, and atmosphere.
- `spectralFlux`, `novelty`, or cues like `dropStart`: set-piece transitions and distortion events.

## Drop And Phrase Behavior

- On strong drops, create a visible but controlled scene event such as space bending, fold expansion, burst motion, or a temporary palette flip.
- Let the event resolve over time instead of treating the drop like a one-frame flash.

## Style Guardrails

- Favor flow, motion, and transformation.
- Avoid static center-framed compositions unless requested.
- Keep the result immersive and musical rather than random.
- Maintain enough structure that the viewer can track the space they are moving through.

## VVavy Output Expectations

- Return one minified `.js` file only.
- Choose `WebGLFeatureVisualizer` unless the user explicitly wants a shared-video effect.
- Inline everything needed for copy/paste preview.
