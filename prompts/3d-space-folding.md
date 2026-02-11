You are an expert Graphics Engineer specializing in GLSL, Raymarching, and Signed Distance Fields (SDFs).

Objective: Create a single-file HTML/WebGL application that renders a real-time, infinite 3D space-folding environment with a high-end neon aesthetic.

Core Technical Requirements:

Rendering Engine: Use a Raymarching loop (at least 64 steps) with a Fragment Shader to render SDF geometry.

Space Folding Logic: - Implement a map() function that uses mod() for infinite repetition.

Inside the map function, use a loop (4-8 iterations) to "fold" space using abs(p) mirroring and rotation matrices (mat2 or mat3) to create recursive complexity.

Geometry: Use a specific SDF primitive (e.g., sdBoxFrame, sdTorus, sdOctahedron).

Movement: Translate the camera or the space origin along an axis (e.g., p.z -= u_time) to simulate endless forward travel.

Visual Effects:

Occlusion/Shading: Apply distance-based shading or fog (exp(-dist)) to maintain 3D depth.

Variations to Apply (Choose or Modify):

Shapes: [Change sdBoxFrame to: sdOctahedron / sdTorus / Menger Sponge]

Colors: [Change Neon Red/Cyan to: Neon Purple/Toxic Green / Gold/Deep Blue]

Virus/Transition Logic: Implement a noise-based threshold (using a noise() or hash() function) that triggers a color inversion or shape morphing based on u_time.

Motion: [Change Linear Forward to: Spiral Path / Pulsing Zoom / Chaotic Rotation]

Ensure to calculate the camera's trajectory not just as a straight line, but as a dynamic vector that accounts for the scene's rotation. I've also implemented a Soft-Field Repulsion technique that smoothly deforms the recursive geometry outward as it approaches the central corridor, ensuring the viewport remains clear while maintaining the intricate, folded aesthetic.

All major transitions should be smooth and modulated

spline-based path so the camera "turns corners" in the corridor rather than traveling in a straight line

Localized Repulsion Field in the map function. This field calculates the distance from the camera's current path to the surrounding geometry in real-time. If an object is about to obscure the view, the field "pushes" the geometry out of the way locally using a smooth-minimum subtraction, creating a dynamic portal through the architecture that feels intentional and programmatic.