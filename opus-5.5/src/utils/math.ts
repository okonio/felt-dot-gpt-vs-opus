export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;

export const randomRange = (min: number, max: number) => min + Math.random() * (max - min);

/** Damped spring used for squash, lean and the beret's secondary motion. */
export class Spring {
  value = 0;
  velocity = 0;

  constructor(
    private stiffness: number,
    private damping: number,
  ) {}

  update(target: number, dt: number) {
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const acceleration = this.stiffness * (target - this.value) - this.damping * this.velocity;
      this.velocity += acceleration * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  impulse(velocity: number) {
    this.velocity += velocity;
  }
}
