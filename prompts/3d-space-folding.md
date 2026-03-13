# 3D Space Folding Baseline

Use this module only after following the interaction gate in `src/prompts/client-create-visual.md`.
This is not a standalone instruction to skip discovery. Treat it as a baseline recipe for an agentic AI model when the user wants an infinite, folded-space flythrough.

## Role In The Client Create Workflow

- First confirm the user chose `create new visual`.
- Then confirm they want a regular music visualizer, not a capture-video effect.
- Ask what should stay constant versus mutate: shape language, palette, camera intensity, and how aggressive the folding should feel.
- Summarize the plan before generating the final single-file VVavy output.

## Baseline Effect Goal

Build a VVavy-compatible WebGL visual that feels like moving through impossible architecture.
The core look should come from recursive SDF folding, repeated structures, and depth-preserving fog or glow, while still following VVavy safety rules: smoothed audio input, no uncontrolled flashes, and no viewport clipping.

## Baseline Technical Direction

- Use a fragment-shader raymarcher as the main renderer.
- Keep the shader WebGL1-safe by default.
- Use a `map()` function with `mod()` or tiled space repetition for infinite continuation.
- Fold space inside `map()` with `abs()` mirroring plus 4 to 8 iterations of rotation-based transforms.
- Build the scene from one or more strong SDF primitives such as `sdBoxFrame`, `sdTorus`, or `sdOctahedron`.
- Create forward motion through the world with time-driven translation of space or the camera path.
- Maintain readable depth with fog, glow accumulation, or distance-based shading.

## What The Agent Should Clarify Before Building

- Does the user want boxy architecture, smoother tunnels, or mixed geometry?
- Should the corridor feel steady, spiraling, or path-driven with turns?
- Should the palette be neon, metallic, void-like, toxic, or restrained?
- Should the center path stay mostly clear, or should geometry crowd the frame more aggressively?

## Audio Mapping Baseline

- `bassEnergy` or `subBassEnergy`: forward momentum, corridor expansion, and large-scale fold amplitude.
- `overallEnergy`: fog density, glow ceiling, and structural contrast.
- `centroid` or `spectralRolloff95`: color temperature and edge sharpness.
- `spectralFlux` or `novelty`: brief fold inversions, path turbulence, or pattern mutations.
- `beatConfidence` plus `isBeat`: discrete structural transitions with cooldowns, never every frame.

Smooth every mapping with attack/release logic before it reaches the shader.

## Corridor And Repulsion Baseline

- Prefer a path-aware camera vector instead of a flat straight-line flight.
- If the user wants a readable corridor, add a soft repulsion field near the active path so nearby geometry deforms away from the center.
- Use soft deformation rather than hard clipping so the folded look remains intact.

## VVavy Output Expectations

- Return one minified `.js` file only.
- Use `WebGLFeatureVisualizer`.
- Inline shader strings.
- Register with `registerFeatureVisualizer(...)`.
- Keep the center mathematically stable and render every frame.
