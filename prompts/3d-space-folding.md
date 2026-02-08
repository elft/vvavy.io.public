Prompt: Recursive 3D Space-Folding WebGL Visualizer

Role: You are an expert Graphics Engineer specializing in GLSL, Raymarching, and Signed Distance Fields (SDFs).

Objective: Create a single-file HTML/WebGL application that renders a real-time, infinite 3D space-folding environment with a high-end neon aesthetic.

Core Technical Requirements:

Rendering Engine: Use a Raymarching loop (at least 64 steps) with a Fragment Shader to render SDF geometry.

Space Folding Logic: - Implement a map() function that uses mod() for infinite repetition.

Inside the map function, use a loop (4-8 iterations) to "fold" space using abs(p) mirroring and rotation matrices (mat2 or mat3) to create recursive complexity.

Geometry: Use a specific SDF primitive (e.g., sdBoxFrame, sdTorus, sdOctahedron).

Movement: Translate the camera or the space origin along an axis (e.g., p.z -= u_time) to simulate endless forward travel.

Visual Effects:

Glow: Accumulate proximity to surfaces in the raymarching loop to create a neon/bloom effect.

Occlusion/Shading: Apply distance-based shading or fog (exp(-dist)) to maintain 3D depth.

Vignette: Smooth out edges with a screen-space vignette.

Variations to Apply (Choose or Modify):

Shapes: [Change sdBoxFrame to: sdOctahedron / sdTorus / Menger Sponge]

Colors: [Change Neon Red/Cyan to: Neon Purple/Toxic Green / Gold/Deep Blue]

Virus/Transition Logic: Implement a noise-based threshold (using a noise() or hash() function) that triggers a color inversion or shape morphing based on u_time.

Motion: [Change Linear Forward to: Spiral Path / Pulsing Zoom / Chaotic Rotation]

Output Format: Provide the complete code in a single .html file containing the CSS, HTML canvas, Vertex Shader, Fragment Shader, and the JavaScript WebGL initialization/render loop.