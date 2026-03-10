# 3D Space Folding

You are an expert graphics engineer specializing in GLSL, raymarching, and signed distance fields (SDFs).

## Objective

Create a single-file HTML/WebGL application that renders a real-time, infinite 3D space-folding environment with a high-end neon aesthetic.

## Core Technical Requirements

- **Rendering engine**: Use a raymarching loop with at least 64 steps in a fragment shader to render SDF geometry.
- **Space folding logic**: Implement a `map()` function that uses `mod()` for infinite repetition.
- **Recursive folding**: Inside `map()`, use a loop with 4 to 8 iterations to fold space using `abs(p)` mirroring and rotation matrices (`mat2` or `mat3`) to create recursive complexity.
- **Geometry**: Use a specific SDF primitive such as `sdBoxFrame`, `sdTorus`, or `sdOctahedron`.
- **Movement**: Translate the camera or the space origin along an axis such as `p.z -= u_time` to simulate endless forward travel.

## Visual Effects

- **Occlusion and shading**: Apply distance-based shading or fog such as `exp(-dist)` to maintain 3D depth.

## Variations To Apply

Choose or modify from these directions:

- **Shapes**: Change `sdBoxFrame` to `sdOctahedron`, `sdTorus`, or a Menger sponge.
- **Colors**: Change neon red and cyan to neon purple and toxic green, or gold and deep blue.
- **Virus or transition logic**: Implement a noise-based threshold using a `noise()` or `hash()` function that triggers a color inversion or shape morph based on `u_time`.
- **Motion**: Change linear forward motion to a spiral path, pulsing zoom, or chaotic rotation.

## Camera And Corridor Logic

- Calculate the camera trajectory as a dynamic vector that accounts for scene rotation, not just a straight line.
- Use a spline-based path so the camera turns corners in the corridor rather than traveling in a straight line.

## Repulsion Field Requirement

Implement a localized repulsion field inside the `map()` function.

- This field should calculate the distance from the camera's current path to the surrounding geometry in real time.
- If an object is about to obscure the view, the field should push the geometry out of the way locally using a smooth-minimum subtraction.
- The result should feel like a dynamic portal opening through the architecture while preserving the intricate folded aesthetic.

## Soft-Field Repulsion Goal

Use a soft-field repulsion technique that smoothly deforms recursive geometry outward as it approaches the central corridor, keeping the viewport clear while maintaining the scene's complexity.

## Transition Rules

- All major transitions should be smooth and modulated.
