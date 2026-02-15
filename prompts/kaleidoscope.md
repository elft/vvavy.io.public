# Kaleidoscope (Starter Basis)

Treat this as a baseline only. Ask the user what to keep or change before implementing.

Core visual description:
Generate a 3D-feeling kaleidoscopic tunnel composed of layered, geometric grid structures.
The visual must feel hypnotic and surreal, using recursive folding and polar coordinate transforms.

Technical requirements:
Symmetry and geometry:
- Use a foldRotate function with 8-fold symmetry.
- Main texture derived from SDFs, specifically an sdRect distorted through iterative folding and rotations.

Layering logic:
- Implement the tunnel using a loop of N=6 instances.
- Each layer computes its own progress and time offset to suggest infinite depth.

Color space:
- Use HSV-to-RGB conversion for vibrant, shifting neon palettes.

Audio-reactive uniforms (shader side):
- u_time: constant forward flow.
- u_tunnelSpeed: controls layer scale and perspective.
- u_colorShiftSpeed: modulates hue transitions (driven by novelty or spectral flux).
- u_beatPulse: 0 to 1 spike for flashes (beat detection).
- u_dropActive and u_dropIntensity: reality-warping saturation and distortion during drops.
- u_timeDistortion: accelerates internal clock during high intensity moments.

Audio mapping (JS side):
- bassEnergy -> tunnel speed momentum (slow drift).
- bassEnergy -> inner radius breath / layer swell.
- trebleEnergy -> line thickness / shimmer.
- isBeat -> fold count crossfade (3s cooldown, 1s crossfade).
- isBeat -> pulse flashes (gentle, decays over ~1.5s).
- overallEnergy -> brightness envelope (3s attack, 5s release).
- overallEnergy -> glow novelty (baseline adapts over ~5s; glow attack 0.3s, release 2s).
- overallEnergy -> evolution speed (attack 1.5s, release 3s, capped).

Audio safeguards:
- Warmup window keeps reactive parameters at defaults for 5s.
- Clamp audio inputs to 0..1 and ignore NaN values.
- Clamp dt to 1/240..0.25 and fall back to 1/60.
- Apply attack/release smoothing to every audio-driven input.

Reactivity logic (JS side):
- Use attack/release smoothing for all inputs (momentum feel on tunnel speed).
- Combine spectral flatness (tonality) and novelty (onsets) to drive colorShiftSpeed.