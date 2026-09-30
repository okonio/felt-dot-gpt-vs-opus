# Prompt

This is the exact prompt given to both models. Attach [`references/dots-reference.png`](references/dots-reference.png) when you send it.

It came in two messages: the **original task** below, then a short **follow-up** after the first version was built. Both models received both parts. The only difference between the runs was the model name in the heading.

To reproduce the comparison with another model, send the original task and the reference image in one message. Once the first version is built, send the follow-up with that model's name in place of `<MODEL NAME>`.

---

## 1. Original task


Create an interactive animated 3D character for the browser using Three.js.

Use the attached reference image as the visual reference for the character.

The character is the blue OpenAI Dots-style blob visible in the image:
- soft rounded blob body
- light blue / cyan color
- fuzzy felt-like surface
- two simple vertical black oval eyes
- black beret tilted slightly to one side
- no mouth
- no arms
- no legs
- simple cute minimal proportions

Do NOT build this as a video, sprite sheet, GIF, or pre-rendered animation.
The result must be rendered live in the browser with Three.js.

TECH STACK
- Three.js
- JavaScript or TypeScript
- WebGL
- Prefer procedural geometry and shaders/materials over heavy external assets
- Keep dependencies minimal
- No game engine
- No React unless it is clearly beneficial
- Structure the code so the character animation can later be reused on a website

CHARACTER GEOMETRY

Build the blue body as a soft irregular blob.

Do not use a perfect sphere.

Start from a SphereGeometry or IcosahedronGeometry and deform the vertices to create:
- slightly flattened bottom
- wider lower body
- narrower upper body
- subtle asymmetry
- soft organic silhouette

The character should approximately resemble a small squishy plush blob.

The body should retain enough geometry subdivisions to allow subtle vertex deformation during animation.

EYES

Create two separate black oval eyes.

Eyes should:
- be vertical
- slightly protrude from the body surface
- have a matte finish
- be simple and minimal

Place them on the front of the blob.

The pupils are not separate.
The entire black oval acts as the eye.

The eyes should support:
- blinking by scaling vertically
- subtle looking left/right by slightly changing their position or orientation
- independent micro-movement

BERET

Create a black beret using simple Three.js geometry.

It should look soft and slightly irregular rather than perfectly geometric.

Possible construction:
- flattened sphere / ellipsoid for the main beret
- small round stem/button on top

Tilt the beret slightly.

The beret should sit naturally on top-left of the blob.

It should have subtle secondary animation when the body moves.

MATERIAL / FELT EFFECT

The reference character has a soft fuzzy felt / plush appearance.

Recreate this without using a huge texture.

Use one of these approaches:

Preferred:
- custom shader with subtle procedural noise
- fresnel-based fuzzy edge
- small normal perturbation
- rough diffuse material

Alternative:
- MeshStandardMaterial
- very high roughness
- subtle procedural bump/noise texture
- optional shell/fur effect if performance allows

The surface should NOT look:
- metallic
- glossy
- plastic
- rubber

It should feel like soft felt or flocked fabric.

LIGHTING

Use soft studio lighting similar to the reference.

Suggested setup:
- dark nearly black background
- large soft key light from upper-left/front
- weaker fill light
- subtle rim light

Use physically believable but soft shadows.

Avoid harsh dramatic lighting.

ANIMATION

Create a continuous idle animation using requestAnimationFrame.

The animation should feel organic, subtle and cute.

Implement the following:

1. BREATHING
Slow body expansion/compression.

Example:
scaleY changes by approximately 1–2%
scaleX/Z change inversely very slightly.

Use sine waves.

2. SQUASH AND STRETCH
The blob should deform slightly instead of behaving like a rigid object.

When moving:
- compress vertically
- expand horizontally
- then settle naturally

3. WOBBLE
Very subtle rotation around X and Z.

Use layered sine waves with different frequencies.

Do not make the character constantly bounce.

4. EYE MOVEMENT
Every few seconds:
- eyes look slightly left
- return center
- look slightly right
- return center

Movement should be tiny.

5. BLINKING
Random blink approximately every 3–6 seconds.

Animate eye scaleY:
1 → 0.05 → 1

Blink duration around 100–180 ms.

Occasionally perform a double blink.

6. BERET SECONDARY MOTION
The beret should lag slightly behind the body's movement.

Use damped interpolation.

When the blob leans right, the beret should react a fraction of a second later.

7. CURIOUS INTERACTION
Every 8–15 seconds, optionally trigger a short curious animation:

- character notices something to the side
- eyes move first
- body slowly leans toward it
- blob stretches slightly
- pauses
- returns smoothly to idle

This should feel subtle, not theatrical.

ANIMATION SYSTEM

Do not hardcode everything directly inside the render loop.

Create a small animation/state system.

Suggested states:

IDLE
LOOK_LEFT
LOOK_RIGHT
BLINK
CURIOUS
RETURN_TO_IDLE

Use smooth interpolation.

Prefer:
- lerp
- damp
- smoothstep
- sine easing

Avoid abrupt transitions.

MOUSE INTERACTION

Add optional pointer interaction.

The Dot should gently react to the user's mouse.

Mouse position should influence:
- eye direction
- tiny body rotation
- slight head/body lean

The effect should be subtle.

Do not make the character follow the cursor aggressively.

When the cursor leaves the canvas:
smoothly return to neutral.

CAMERA

Use a PerspectiveCamera.

Character centered.

Camera should show:
- full blob
- beret
- a small amount of space around it

Use a static camera.

No orbit controls in the final experience.

RESPONSIVENESS

The canvas must:
- fill its container
- resize correctly
- handle devicePixelRatio
- work on desktop and mobile

Clamp renderer pixel ratio to something reasonable, e.g.:
Math.min(window.devicePixelRatio, 2)

PERFORMANCE

Target stable 60 FPS on a normal laptop and modern phone.

Avoid:
- huge textures
- excessive geometry
- expensive post-processing
- too many lights
- unnecessary draw calls

Use shadows carefully.

PROJECT STRUCTURE

Organize the code cleanly.

Suggested structure:

```text
src/
  main.ts
  scene/
    createScene.ts
    createLights.ts
    createCamera.ts
  dot/
    createDot.ts
    createBody.ts
    createEyes.ts
    createBeret.ts
    DotAnimator.ts
  shaders/
    feltVertex.glsl
    feltFragment.glsl
```

Expose useful parameters in one config object:

```js
const DOT_CONFIG = {
  bodyColor: "#77B7FF",
  bodyRoughness: 0.95,
  breathingStrength: 0.015,
  wobbleStrength: 0.025,
  mouseFollowStrength: 0.08,
  blinkMinDelay: 3,
  blinkMaxDelay: 6
}
```

Make the character easy to tune later.

IMPORTANT DESIGN REQUIREMENTS

The result should feel like the character from the supplied reference image.

Do not turn it into:
- a generic cartoon blob
- a Pixar-like character
- a slime
- a glossy 3D mascot
- a sphere with eyes

The main visual goal is:
soft,
minimal,
friendly,
slightly awkward,
handcrafted,
fuzzy,
and close to the OpenAI Dots aesthetic.

DELIVERABLE

Create a complete working browser demo.

Include:
- HTML entry point
- Three.js scene
- character creation
- animation system
- responsive resize handling
- pointer interaction
- clean code comments only where necessary

The demo should run locally with:

```sh
npm install
npm run dev
```

Use Vite if a build setup is needed.

First build the character and animation.
Do not add UI, text, buttons, menus, particles, or other decorative elements.

---

## 2. Follow-up message

> Add animations that react to mouse movement, make the background white.
>
> And at the very top, add the name `<MODEL NAME>` in Inter Bold.

`<MODEL NAME>` was `GPT 6.1 Sol` for the first run and `Opus 5.5` for the second. This follow-up overrides two points in the original task: the background becomes white instead of near-black, and a text heading is now allowed.

For the second model, one extra line was added so the builds stayed independent:

> Build an independent implementation in the `opus-5.5` folder. Do not copy the GPT implementation or use it as a template. The only shared source is the attached reference image and this prompt.
