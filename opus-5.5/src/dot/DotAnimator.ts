import { Euler, Quaternion, Vector2 } from "three";
import type { DotConfig } from "../config";
import type { PointerTracker } from "../interaction/PointerTracker";
import {
  Spring,
  clamp,
  damp,
  easeInOutSine,
  lerp,
  randomRange,
  smoothstep,
} from "../utils/math";
import type { Dot } from "./createDot";
import { deformPoint, deformSlope } from "./deform";

export type BehaviorState = "IDLE" | "LOOK_LEFT" | "LOOK_RIGHT" | "CURIOUS" | "RETURN_TO_IDLE";
export type BlinkState = "OPEN" | "BLINK";

const CURIOUS_EYES_LEAD = 0.35;
const CURIOUS_LEAN_TIME = 1.1;
const CURIOUS_HOLD_UNTIL = 2.9;

/**
 * Drives the character. Two layers run side by side:
 *  - a behaviour state machine (idle, glances, curious) that sets targets;
 *  - a blink scheduler that runs independently of it.
 * Targets are blended with pointer input and reach the rig through springs
 * and damping, so no transition is ever abrupt.
 */
export class DotAnimator {
  state: BehaviorState = "IDLE";
  blinkState: BlinkState = "OPEN";

  private stateTime = 0;
  private stateDuration = 2;
  private lookSide = Math.random() < 0.5 ? -1 : 1;
  private curiousSide = 1;
  private curiousTimer: number;
  private lookY = 0;

  private blinkTimer: number;
  private blinkElapsed = 0;
  private blinkQueued = 0;
  private eyeOpen = 1;

  // Behaviour targets.
  private behaviorEye = new Vector2();
  private behaviorLean = 0;
  private behaviorStretch = 0;
  private behaviorYaw = 0;
  private returnFrom = { eye: new Vector2(), lean: 0, stretch: 0, yaw: 0 };

  // Smoothed state.
  private eyeLook = new Vector2();
  private engage = 0;
  private excite = 0;
  private wasFast = false;
  private leanX = new Spring(32, 8.5);
  private leanZ = new Spring(32, 8.5);
  private squash = new Spring(150, 8);
  private yaw = new Spring(24, 8);
  private pitch = 0;
  private jiggle = 0;
  private beretX: Spring;
  private beretZ: Spring;
  private beretSquash: Spring;

  private readonly motionScale: number;
  private readonly euler = new Euler();
  private readonly quat = new Quaternion();

  constructor(
    private readonly dot: Dot,
    private readonly config: DotConfig,
    private readonly pointer?: PointerTracker,
  ) {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.motionScale = reduced ? 0.4 : 1;
    this.curiousTimer = randomRange(config.curiousMinDelay, config.curiousMaxDelay);
    this.blinkTimer = randomRange(1.2, config.blinkMaxDelay);
    this.beretX = new Spring(config.beretStiffness, config.beretDamping);
    this.beretZ = new Spring(config.beretStiffness, config.beretDamping);
    this.beretSquash = new Spring(config.beretStiffness * 1.4, config.beretDamping);
    this.enter("IDLE");

    if (pointer) {
      pointer.onPress = () => this.squash.impulse(-0.55 * this.motionScale);
      pointer.onRelease = () => {
        this.squash.impulse(0.9 * this.motionScale);
        this.blink();
      };
    }
  }

  /** Force a blink (the animator also blinks on its own). */
  blink(double = false) {
    if (this.blinkState === "BLINK") return;
    this.blinkState = "BLINK";
    this.blinkElapsed = 0;
    this.blinkQueued = double ? 1 : 0;
  }

  /** Start the curious glance now. */
  triggerCurious(side?: -1 | 1) {
    this.enter("CURIOUS");
    if (side) this.curiousSide = side;
  }
  update(dt: number, time: number) {
    dt = Math.min(dt, 1 / 20);
    this.pointer?.update(dt);
    this.updateEngagement(dt);
    this.updateBehavior(dt);
    this.updateBlink(dt);
    this.applyToRig(dt, time);
  }

  // ---------------------------------------------------------------- behaviour

  private enter(state: BehaviorState) {
    this.state = state;
    this.stateTime = 0;
    const c = this.config;
    switch (state) {
      case "IDLE":
        this.stateDuration = randomRange(c.lookMinDelay, c.lookMaxDelay);
        break;
      case "LOOK_LEFT":
      case "LOOK_RIGHT":
        this.stateDuration = randomRange(0.9, 1.6);
        this.lookY = randomRange(-0.25, 0.3);
        break;
      case "CURIOUS":
        this.curiousSide = Math.random() < 0.5 ? -1 : 1;
        this.stateDuration = CURIOUS_HOLD_UNTIL;
        this.curiousTimer = randomRange(c.curiousMinDelay, c.curiousMaxDelay);
        break;
      case "RETURN_TO_IDLE": {
        // Ease out of whatever pose the previous state left behind.
        const r = this.returnFrom;
        r.eye.copy(this.behaviorEye);
        r.lean = this.behaviorLean;
        r.stretch = this.behaviorStretch;
        r.yaw = this.behaviorYaw;
        this.stateDuration = Math.abs(r.lean) > 0.03 ? 1.5 : 0.7;
        break;
      }
    }
  }

  private updateBehavior(dt: number) {
    const previousTime = this.stateTime;
    this.stateTime += dt;
    // The user's pointer is more interesting than anything imaginary.
    if (this.engage < 0.3) this.curiousTimer -= dt;
    const u = this.stateTime;
    const done = u >= this.stateDuration;

    this.behaviorEye.set(0, 0);
    this.behaviorLean = 0;
    this.behaviorStretch = 0;
    this.behaviorYaw = 0;

    switch (this.state) {
      case "IDLE":
        if (!done) break;
        if (this.curiousTimer <= 0) {
          this.enter("CURIOUS");
        } else if (this.engage > 0.5 || Math.random() < 0.25) {
          this.enter("IDLE");
        } else {
          this.lookSide *= -1;
          this.enter(this.lookSide < 0 ? "LOOK_LEFT" : "LOOK_RIGHT");
        }
        break;

      case "LOOK_LEFT":
      case "LOOK_RIGHT": {
        const side = this.state === "LOOK_LEFT" ? -1 : 1;
        this.behaviorEye.set(side * 0.75, this.lookY);
        this.behaviorLean = side * 0.012;
        if (done) this.enter("RETURN_TO_IDLE");
        break;
      }

      case "CURIOUS": {
        const s = this.curiousSide;
        // Eyes first...
        this.behaviorEye.set(s * smoothstep(0, 0.22, u), 0.2 * smoothstep(0, 0.3, u));
        // ...then the body slowly leans in and stretches, pauses, and lets go.
        const lean = easeInOutSine((u - CURIOUS_EYES_LEAD) / CURIOUS_LEAN_TIME);
        this.behaviorLean = s * 0.1 * lean;
        this.behaviorStretch = 0.03 * lean;
        this.behaviorYaw = s * 0.2 * lean;
        if (previousTime < CURIOUS_EYES_LEAD && u >= CURIOUS_EYES_LEAD) {
          this.squash.impulse(-0.18 * this.motionScale);
        }
        if (previousTime < 2.1 && u >= 2.1) this.blink();
        if (done) this.enter("RETURN_TO_IDLE");
        break;
      }

      case "RETURN_TO_IDLE": {
        const r = this.returnFrom;
        const k = 1 - easeInOutSine(u / this.stateDuration);
        this.behaviorEye.copy(r.eye).multiplyScalar(k);
        this.behaviorLean = r.lean * k;
        this.behaviorStretch = r.stretch * k;
        this.behaviorYaw = r.yaw * k;
        if (done) this.enter("IDLE");
        break;
      }
    }
  }

  private updateBlink(dt: number) {
    const c = this.config;
    if (this.blinkState === "OPEN") {
      this.eyeOpen = 1;
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) this.blink(Math.random() < c.doubleBlinkChance);
      return;
    }

    this.blinkElapsed += dt;
    const k = this.blinkElapsed / c.blinkDuration;
    this.eyeOpen =
      k < 0.45
        ? lerp(1, 0.05, easeInOutSine(k / 0.45))
        : lerp(0.05, 1, easeInOutSine((k - 0.45) / 0.55));

    if (k >= 1) {
      this.eyeOpen = 1;
      this.blinkState = "OPEN";
      if (this.blinkQueued > 0) {
        this.blinkQueued--;
        this.blinkTimer = 0.09;
      } else {
        this.blinkTimer = randomRange(c.blinkMinDelay, c.blinkMaxDelay);
      }
    }
  }

  // ------------------------------------------------------------------ pointer

  private updateEngagement(dt: number) {
    const p = this.pointer;
    let target = 0;
    if (p?.inside) target = p.idleTime < 4 ? 1 : 0.35;
    if (p?.pressed) target = 1;
    // Engage quickly, let go slowly.
    this.engage = damp(this.engage, target, target > this.engage ? 3 : 1.1, dt);

    const speed = p && p.inside ? p.velocity.length() : 0;
    const fast = speed > 2.6;
    if (fast && !this.wasFast) {
      // A sudden flick startles it a little: a quick hop and a beret kick.
      this.squash.impulse(0.45 * this.config.mouseMotionStrength * this.motionScale);
    }
    if (!fast && this.wasFast && Math.random() < 0.6) this.blink();
    this.wasFast = fast;
    this.excite = Math.max(this.excite * Math.exp(-dt * 1.4), smoothstep(0.8, 4, speed));
  }

  // --------------------------------------------------------------------- rig

  private applyToRig(dt: number, t: number) {
    const c = this.config;
    const m = this.motionScale;
    const p = this.pointer;
    const e = this.engage;
    const follow = c.mouseFollowStrength / 0.08;
    const motion = c.mouseMotionStrength;

    const px = p ? clamp(p.position.x, -1.2, 1.2) : 0;
    const py = p ? clamp(p.position.y, -1.2, 1.2) : 0;
    const vx = p?.inside ? clamp(p.velocity.x, -8, 8) : 0;
    const vy = p?.inside ? clamp(p.velocity.y, -8, 8) : 0;

    // Eyes: behaviour glances blended with looking at the cursor.
    const eyeTargetX = lerp(this.behaviorEye.x, clamp(px * 1.3, -1, 1), e);
    const eyeTargetY = lerp(this.behaviorEye.y, clamp(py * 1.2 + 0.15, -1, 1), e);
    this.eyeLook.set(damp(this.eyeLook.x, eyeTargetX, 12, dt), damp(this.eyeLook.y, eyeTargetY, 12, dt));

    // Body lean (shear, bottom stays planted). Position leans towards the
    // cursor; velocity sways it along with the movement.
    const idleShare = 1 - e;
    const leanTargetX =
      this.behaviorLean * idleShare + e * (px * c.mouseFollowStrength + vx * 0.011 * motion);
    const leanTargetZ = e * (-py * c.mouseFollowStrength * 0.5 - vy * 0.004 * motion);
    this.leanX.update(leanTargetX * m, dt);
    this.leanZ.update(leanTargetZ * m, dt);

    this.yaw.update((this.behaviorYaw * idleShare + e * px * 0.2 * follow) * m, dt);
    this.pitch = damp(this.pitch, -e * py * 0.05 * follow * m, 4, dt);

    // Squash & stretch: behaviour stretch, excitement, pressing and vertical flicks.
    const stretchTarget =
      this.behaviorStretch * idleShare +
      this.excite * 0.03 * motion +
      e * clamp(vy * 0.005, -0.025, 0.025) * motion +
      (p?.pressed ? -0.08 : 0);
    this.squash.update(stretchTarget * m, dt);

    this.jiggle = damp(
      this.jiggle,
      clamp(Math.abs(this.squash.velocity) * 0.012 + this.excite * 0.006, 0, 0.012) * m,
      8,
      dt,
    );

    // Breathing + squash, volume-preserving.
    const breath =
      c.breathingStrength *
      m *
      (Math.sin((t * Math.PI * 2) / c.breathingPeriod) * 0.85 + Math.sin(t * 0.37) * 0.15);
    const stretch = breath + this.squash.value;
    const sy = 1 + stretch;
    const sxz = 1 - stretch * 0.5;

    const body = this.dot.body;
    body.group.scale.set(sxz, sy, sxz);

    // Wobble: layered sines, never a bounce.
    const w = c.wobbleStrength * m;
    const wobbleZ = w * (0.6 * Math.sin(t * 1.1) + 0.4 * Math.sin(t * 2.3 + 1.2));
    const wobbleX = w * 0.7 * (0.6 * Math.sin(t * 0.8 + 0.4) + 0.4 * Math.sin(t * 1.9 + 2.2));
    body.group.rotation.set(wobbleX + this.pitch, this.yaw.value, wobbleZ - this.leanX.value * 0.2);

    const u = body.deform;
    u.uLean.value.set(this.leanX.value, this.leanZ.value);
    u.uJiggle.value = this.jiggle;
    u.uTime.value = t;

    this.applyEyes(t);
    this.applyBeret(dt, wobbleZ, wobbleX);

    const shadow = this.dot.contactShadow;
    shadow.scale.set(sxz * (1 + Math.abs(this.leanX.value) * 0.4), sxz, 1);
    shadow.position.x = this.leanX.value * 0.25;
    shadow.material.opacity = clamp(1 - stretch * 3, 0.7, 1.1);
  }

  private applyEyes(t: number) {
    const c = this.config;
    const widen = 1 + this.excite * 0.12;
    const u = this.dot.body.deform;

    for (const eye of this.dot.eyes.eyes) {
      deformPoint(eye.restPosition, u, eye.anchor.position);
      // Independent micro-movement per eye keeps them from feeling mechanical.
      const mx = 0.06 * Math.sin(t * 1.7 + eye.phase) + 0.04 * Math.sin(t * 4.1 + eye.phase * 2);
      const my = 0.05 * Math.sin(t * 1.3 + eye.phase * 1.5);
      const lx = (this.eyeLook.x + mx) * c.eyeLookDistance;
      const ly = (this.eyeLook.y + my) * c.eyeLookDistance * 0.6;
      eye.mesh.position.set(lx, ly, -3 * (lx * lx + ly * ly));
      eye.mesh.rotation.set(-ly * 2, lx * 3, 0);
      eye.mesh.scale.set(
        eye.baseScale.x * (1 + this.excite * 0.05),
        eye.baseScale.y * this.eyeOpen * widen,
        eye.baseScale.z,
      );
    }
  }

  private applyBeret(dt: number, wobbleZ: number, wobbleX: number) {
    const beret = this.dot.beret;
    const u = this.dot.body.deform;
    const gain = this.config.beretLagGain;

    deformPoint(beret.restPosition, u, beret.anchor.position);
    const slope = deformSlope(beret.restPosition.y, u);
    this.euler.set(slope.z, 0, -slope.x);
    this.quat.setFromEuler(this.euler);
    beret.anchor.quaternion.copy(this.quat).multiply(beret.restQuaternion);

    // How far the crown has swung (roughly radians); the beret chases it late.
    const h = u.uHeight.value;
    const swingX = (this.leanX.value / h) * 1.6 - (wobbleZ - this.leanX.value * 0.2) + this.yaw.value * 0.3;
    const swingZ = (this.leanZ.value / h) * 1.6 + wobbleX + this.pitch;
    this.beretX.update(swingX, dt);
    this.beretZ.update(swingZ, dt);
    this.beretSquash.update(this.squash.value, dt);

    beret.pivot.rotation.set(
      -(swingZ - this.beretZ.value) * gain,
      0,
      (swingX - this.beretX.value) * gain,
    );
    const flop = (this.squash.value - this.beretSquash.value) * 0.8;
    beret.pivot.scale.set(1 - flop * 0.5, 1 + flop, 1 - flop * 0.5);
  }
}
