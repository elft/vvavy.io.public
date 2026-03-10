# Chaotic 4D Manifold Logic

This document outlines the technical architecture used in the "Non-Euclidean Simpson-wave" visual. This technique can be applied to any 3D environment to create infinite, non-repeating, and mathematically alien motion.

## 1. The Chaotic Engine: Lorenz Attractor

To move beyond human-looking loops, use a strange attractor. Unlike a sine wave, which repeats, a Lorenz system is a set of differential equations that is sensitive to initial conditions.

### Bot-Readable Logic

- **Purpose**: Generate a 3D coordinate `(x, y, z)` that evolves infinitely without retracing the same path.

### Equations

- `dx = σ(y - x) dt`
- `dy = (x(ρ - z) - y) dt`
- `dz = (xy - βz) dt`

### Standard Constants

- `σ = 10`
- `ρ = 28`
- `β = 8/3`

### Implementation

Update these values every frame and pass them to the GPU as a `vec3` uniform.

## 2. The 4D Manifold: Vertex Displacement

Instead of moving the object through space, warp the space inside the object.

### Logic

- **Manifold folding**: Use the Lorenz `X` and `Y` values to modulate the frequency and amplitude of a spatial distortion.
- **Pinch points**: Calculate `length(position.xy)` to find the distance from the center, then apply a `sin()` wave offset using the chaotic variables.
- **Non-Euclidean twist**: Multiply the `xy` coordinates by a rotation matrix where the angle is tied to the chaotic `Z` value and current time. This should make the geometry appear to swallow itself.

## 3. The Simpson-Wave Shader: Color Segmentation

To achieve a 2D pop-art-in-3D look, avoid smooth gradients and use step logic instead.

### Logic

- **UV striation**: Generate high-frequency sine waves based on `V` coordinates, such as `sin(vUv.y * density)`.
- **Conditional masking**: Instead of returning a color directly, use `if` statements or `step()` functions to create hard borders between yellow, blue, and pink.
- **Chaotic drift**: Add the Lorenz `X` value to the UV offset so the patterns crawl and stretch in sync with the physical warping of the mesh.

## 4. Seamlessness Protocol

To prevent snapping or resetting visuals:

- **Procedural time**: Use `uTime` as the phase in all shader calculations. Never reset the physical position of the mesh.
- **Modular geometry**: Use a cylinder or torus that is significantly longer than the viewport so the edges of the manifold are never visible to the camera.
