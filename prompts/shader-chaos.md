"Develop a high-performance, single-file WebGL audio visualizer using the Web Audio API and a custom fragment shader. Strictly no external libraries (No Three.js, No P5.js). Core Visual Logic:

Technique: Use Domain Warping layered with Recursive Spatial Folding. The coordinate system (UVs) must be warped by multiple octaves of Simplex noise.

The 'Living' Camera: Do not use traditional matrix-based camera movement. Instead, create a 'phantom camera' effect by modulating the UV offsets and noise scales over time. It should feel like drifting, diving, and being pulled through a fluid fractal dimension.

Spatial Breaks: Implement a 'transient listener' in JavaScript. When audio energy exceeds a dynamic threshold, the shader must trigger a Spatial Break. This includes immediate coordinate mirroring (kaleidoscope effect), extreme chromatic aberration, and a temporary inversion of the spatial folding logic.

Audio Integration (Uniforms):

Bass: Drive the scale of the recursive folds and the intensity of the domain warping.

Mids: Drive the fine-grained detail/complexity of the noise patterns.

Transients: A 'punch' uniform (0.0 to 1.0) that decays rapidly, triggering the physical distortion of the screen boundaries.

Aesthetic Goals:

Cinematic Chaos: The visual should never loop. It must constantly evolve by mixing time-based variables with audio data.

Edge Interaction: The visual must interact with the viewport edges—stretching, bending perspective, or 'breaking' the frame during heavy drops.

Color Theory: Use a dynamic palette that shifts from deep, atmospheric voids to explosive, high-energy light based on the overall_energy uniform.