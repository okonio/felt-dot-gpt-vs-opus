/** All tunable parameters for the character in one place. */
export const DOT_CONFIG = {
  // Look
  bodyColor: "#77B7FF",
  bodyRoughness: 0.95,
  beretColor: "#151517",
  eyeColor: "#0b0b0d",
  fuzzStrength: 0.42,
  fiberScale: 38,
  bumpStrength: 0.018,
  furShells: 3,
  furLength: 0.022,

  // Idle motion
  breathingStrength: 0.015,
  breathingPeriod: 3.8,
  wobbleStrength: 0.025,

  // Eyes
  eyeLookDistance: 0.055,
  blinkMinDelay: 3,
  blinkMaxDelay: 6,
  blinkDuration: 0.15,
  doubleBlinkChance: 0.22,

  // Behaviours
  lookMinDelay: 2.4,
  lookMaxDelay: 4.2,
  curiousMinDelay: 8,
  curiousMaxDelay: 15,

  // Beret secondary motion
  beretStiffness: 55,
  beretDamping: 6.5,
  beretLagGain: 1.6,

  // Pointer
  mouseFollowStrength: 0.08,
  mouseMotionStrength: 1,

  shadows: true,
};

export type DotConfig = typeof DOT_CONFIG;
