# Kaleidoscope (Starter Basis)

Treat this as a baseline only. Ask the user what to keep or change before implementing.

New kaleidoscope visuals should:
- Reuse the same audio safety patterns.
- Reuse the same core audio metric mappings (with tweaks per visual).
- Preserve chill, non-strobe behavior even on aggressive tracks.

Core visual description:
- Generate a 3D-feeling kaleidoscopic tunnel composed of layered, geometric grid or SDF-based structures.
- The visual should feel hypnotic and surreal, using recursive folding and polar coordinate transforms.

Technical requirements:
Symmetry and geometry:
- “Folds” are the repeated mirrored slices that form the kaleidoscope (like cutting a circle into X identical wedges and mirroring the content in each).
- Higher fold counts feel more intricate and crystalline; lower fold counts feel more graphic and bold.
- Ask the user: “Do you prefer fewer, bolder folds or many fine folds?” and bias the default accordingly.
- Use a foldRotate function with X-fold symmetry.
- Main texture is derived from SDFs (for example, an `sdRect`) distorted through iterative folding and rotations.
- Ask the user: “Do you want to see the seams between folds (hard mirrored lines) or should those seams be blended so the joins are invisible and smooth?”

Layering logic:
- “Layers” are stacked copies of the tunnel pattern at different depths and scales that give a sense of 3D volume and infinite distance.
- More layers increase depth and richness but can feel busier; fewer layers feel cleaner and more minimal.
- Implement the tunnel using a loop of N≈6 instances (or similar).
- Each layer computes its own progress and time offset to suggest infinite depth.

Color space:
- Use HSV-to-RGB conversion for vibrant, shifting neon palettes (or ask the user).

Audio-reactive uniforms (shader side):
- `u_time`: constant forward flow.
- `u_tunnelSpeed`: controls layer scale and perspective (bass-driven momentum).
- `u_bassBreath`: inner radius / tunnel wall “breathing”.
- `u_lineThickness`: line sharpness / shimmer along geometric edges.
- `u_symFrom`, `u_symTo`, `u_symBlend`: fold count transition state for symmetry changes.
- `u_beatPulse`: 0–1 pulse used for subtle hue or contrast bursts.
- `u_brightness`: global brightness envelope that only dims during sustained quiet.
- `u_glowBoost`: novelty-based glow/saturation boost.
- `u_evolution`: fractal / pattern mutation speed, capped to avoid chaos.
- `u_rotation`: slow global rotation of the kaleidoscopic structure.
- `u_radiusScale`: small expansion/contraction of the effective radius.
- Optional extras for other kaleidoscopes:
  - `u_colorShiftSpeed`: modulates hue transitions (driven by novelty or spectral flux).
  - `u_dropActive`, `u_dropIntensity`: saturation and distortion warping during drops.
  - `u_timeDistortion`: accelerates internal clock during high-intensity moments.

Audio mapping (JS side baseline):
- `bassEnergy` → tunnel speed momentum
  - Use a smoothed “momentum” value feeding into `u_tunnelSpeed` so the tunnel drifts and only slowly speeds up or slows down.
- `bassEnergy` → inner radius breath
  - Drive `u_bassBreath` with bass via attack/release smoothing to create a gentle swelling of the inner radius / layers.
- `trebleEnergy` → line thickness / shimmer
  - Map treble to `u_lineThickness` with slow attack and release so detail sharpens on bright tops and relaxes otherwise.
- Beat / energy surge → symmetry folds
  - On beats or a clear multi-second energy rise, change `u_symTo` to a new fold count and crossfade via `u_symBlend`.
  - Throttle fold changes with a seconds-scale cooldown and smooth crossfade (~1s) so symmetry never chatters.
- Beat / energy surge → hue pulse
  - On the same beat/energy events, bump `u_beatPulse` and let it decay over ~1–2 seconds for soft pulses (not flashes).
- `overallEnergy` → brightness envelope
  - Target brightness ≈ `0.4 + overallEnergy * 0.6`, then apply a very slow envelope (attack ≈3s, release ≈5s).
  - This keeps visuals bright most of the time and only noticeably dim during sustained quiet.
- `overallEnergy` → novelty glow
  - Maintain an adapted baseline energy that tracks `overallEnergy` over ≈5s.
  - Compute novelty as `abs(currentEnergy - adaptedBaseline)` and map that to `u_glowBoost` with fast attack (~0.3s) and slower release (~2s) so unusual moments glow more.
- `overallEnergy` → evolution speed
  - Smooth `overallEnergy` again to a separate envelope and map it into a limited range of `u_evolution`, capping the maximum rate to avoid chaotic flicker.
- `overallEnergy` (history) → rotation steps
  - Keep a sliding 5s history of energy.
  - When energy rises ≈5% above the oldest value in that window and cooldown has expired, advance `u_rotation` by a small constant step (≈4°).
  - Interpolate from the previous to the new rotation over ≈0.5s using an easing function.
- `overallEnergy` (history) → radius scaling
  - Using the same history window, update `u_radiusScale` only when either:
    - Energy rises ≥5% (expand toward ~1.15), or
    - Energy drops ≤–5% (contract toward ~0.85).
  - Gate radius updates so they occur at most about once per second and/or on beats, then smooth them with attack/release to avoid popping.

Audio safeguards (JS side, all kaleidoscopes):
- Warmup:
  - Use a warmup window (~5s) where all audio-reactive parameters stay at safe defaults.
  - Implement via a `computeWarmup(time, warmupSeconds)` helper and multiply raw inputs by the warmup factor.
- Clamping and NaN safety:
  - Clamp all incoming audio metrics to [0, 1] (or the appropriate range) via helpers like `clampAudio01`.
  - Treat `NaN` or non-finite values as safe fallbacks (usually 0).
- Time-step safety:
  - Resolve frame `dt` through `resolveAudioDt(dt, { min: 1/240, max: 0.25, defaultValue: 1/60 })` so extreme spikes or stalls do not propagate into the visual.
- Smoothing:
  - Apply attack/release smoothing to every audio-driven state (tunnel momentum, breath, line thickness, brightness, glow, evolution, etc.).
  - Prefer slower release than attack for parameters that should feel responsive but never twitchy.
- Beat and fold throttling:
  - Any discrete symmetry or structural changes (fold count, radius targets, large rotation steps) must be gated by:
    - A cooldown timer (≥1s for fold changes).
    - A smooth crossfade for shader uniforms that affect geometry (e.g., `u_symBlend` over ≈1s).
- Energy history and thresholds:
  - Use a sliding multi-second energy history to detect significant musical changes (≈5% relative movement).
  - Drive rare events (rotation steps, radius expansions/contractions) from these thresholds rather than instantaneous metrics.

Reactivity logic (JS side, high level):
- Use attack/release smoothing for all audio-driven state so the visual has momentum and never vibrates due to frame noise.
- Treat beats and clear energy surges as triggers for discrete events (fold transitions, rotation steps, radius shifts), all heavily throttled and eased.
- Use novelty vs. an adapted energy baseline to drive special “wow” effects like glow, instead of making everything scale linearly with volume.
- If the design includes hue-shift uniforms such as `u_colorShiftSpeed`, combine spectral flatness (tonality), novelty (onsets), and optionally spectral flux to steer color evolution in a slow, musical way.
