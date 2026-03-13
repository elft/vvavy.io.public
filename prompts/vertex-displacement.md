# Vertex Displacement Baseline

Use this module only as a baseline inside the `client-create-visual` workflow.
It should help an agentic AI model build geometry-driven VVavy effects after discovery is complete.

## Workflow Placement

- Ask what surface or object is being displaced: water, cloth, terrain, ribbons, a tunnel wall, or an abstract mesh.
- Ask whether the deformation should feel smooth, choppy, elastic, heavy, or violent.
- Confirm whether realism or stylization matters more.

## Baseline Effect Goal

Manipulate mesh positions directly so the scene gains real depth and silhouette change instead of only fragment-level distortion.
This works best when the user wants waves, fabric motion, terrain breathing, or sculptural deformation.

## Baseline Technical Pattern

- Use a sufficiently dense mesh or generated grid so displacement is visible.
- Compute displacement in the vertex shader.
- Recalculate or approximate normals if lighting matters.
- Keep movement continuous with time plus smoothed audio control.

## Baseline Deformation Options

- Sine or cosine wave fields for simple rhythmic motion.
- Gerstner-style waves for more physical water motion.
- Noise-driven height fields for terrain or organic surfaces.
- Layered displacement bands for hybrid stylized motion.

## Audio Mapping Baseline

- `bassEnergy`: displacement amplitude and large body motion.
- `midEnergy`: wave density, frequency, or secondary ripple activity.
- `trebleEnergy`: choppiness, ripple speed, or fine edge flutter.
- `beatConfidence` and `isBeat`: occasional splash, crease, or pulse events.
- `overallEnergy`: total deformation ceiling and lighting response.

## Geometry Baseline

- Use enough subdivisions to support the requested detail.
- Keep normals consistent with the displaced shape when lit rendering is involved.
- Clamp extreme movement so the mesh does not invert or explode unless the user explicitly wants that.

## VVavy Output Expectations

- Return one minified `.js` file only.
- Use `WebGLFeatureVisualizer`.
- Keep geometry generation, shader code, and registration in the single output file.
