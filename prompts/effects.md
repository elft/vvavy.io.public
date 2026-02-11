will now implement a Temporal Feedback Loop using a Framebuffer Object (FBO) system.

To achieve this "Temporal Echo" effect in a single-file WebGL application, we need to:

Double Buffering: Create two textures. In each frame, we render the current fractal combined with the previous frame (stored in Texture A) into Texture B. Then, we swap them.

Feedback Logic: The fragment shader will now sample the u_buffer (the previous state). By slightly scaling or rotating the previous frame before blending, we create "ghost trails" that appear to spiral or expand infinitely.

Persistence: The u_feedback uniform controls how much of the old frame is kept, creating a hallucinogenic motion blur.