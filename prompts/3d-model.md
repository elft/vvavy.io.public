# 3D Model Baseline

Use this module only inside the VVavy client-create workflow after the user chooses to build a new visual.
This is a baseline for an agentic AI model handling model-centric visuals. It should not bypass the normal discovery, plan confirmation, or single-file output rules.

## Workflow Placement

- Confirm the user wants a regular visualizer that includes a model-like subject or central object.
- Ask what the subject is, how realistic versus stylized it should be, and whether the model is procedural or implied.
- Ask whether the result must stay single-file with no external assets.
- Summarize the technical plan before building.

## Baseline Effect Goal

Create a browser-safe 3D model presentation or procedural object scene that runs inside VVavy’s create-client flow.
The model should serve the music rather than exist as a static asset drop.

## Baseline Technical Direction

- Prefer procedural geometry or lightweight embedded data when the result must stay single-file.
- Use `WebGLFeatureVisualizer` unless the user explicitly needs another runtime path.
- Keep lighting, camera, and materials simple enough to remain performant in the browser.
- Use audio to animate the model, its materials, or its environment in at least five distinct ways.

## Discovery Topics

- Subject and silhouette.
- Stylization level.
- Material direction.
- Scene scale and camera feel.
- Audio-reactive behavior.
- Performance constraints.

## Audio Mapping Baseline

- `bassEnergy`: primary model motion or scale emphasis.
- `midEnergy`: material deformation, surface animation, or orbiting detail.
- `trebleEnergy`: highlight response and fine detail motion.
- `overallEnergy`: lighting intensity and scene density.
- `beatConfidence` or cues: controlled hero moments or pose/state changes.

## VVavy Output Expectations

- Return one minified `.js` file only.
- Keep everything inline.
- End with a ready-to-paste registration call.
