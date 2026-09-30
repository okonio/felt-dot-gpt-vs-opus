import { MathUtils, Vector2 } from 'three';
import type { Dot } from './createDot';
import { DOT_CONFIG, type DotConfig } from './config';

export type MotionState = 'IDLE' | 'LOOK_LEFT' | 'LOOK_RIGHT' | 'CURIOUS' | 'RETURN_TO_IDLE';
const ease = (x: number) => { const t = MathUtils.clamp(x, 0, 1); return t * t * (3 - 2 * t); };

export class DotAnimator {
  state: MotionState = 'IDLE';
  // Blinks run on their own channel, so they can overlap a glance or curious lean.
  eyeState: 'OPEN' | 'BLINK' = 'OPEN';
  private time = 0;
  private entered = 0;
  private nextLook = 2.4;
  private nextCurious: number;
  private nextBlink: number;
  private blinkStart = 0;
  private doubleBlink = false;
  private repeatBlink = false;
  private lookSign = -1;
  private gaze = 0;
  private lean = 0;
  private stretch = 0;
  private pointer = new Vector2();
  private pointerTarget = new Vector2();
  private pointerMotion = new Vector2();
  private pointerActive = false;
  private pointerEngagement = 0;
  private previousLean = 0;
  private squish = 0;
  private squishVelocity = 0;
  private hatX = 0;
  private hatZ = 0;

  constructor(private dot: Dot, private config: DotConfig = DOT_CONFIG) {
    this.nextBlink = this.blinkDelay();
    this.nextCurious = this.curiousDelay();
  }

  setPointer(x: number, y: number) {
    const nextX = MathUtils.clamp(x, -1, 1);
    const nextY = MathUtils.clamp(y, -1, 1);
    if (this.pointerActive) {
      this.pointerMotion.x += (nextX - this.pointerTarget.x) * 4;
      this.pointerMotion.y += (nextY - this.pointerTarget.y) * 4;
      this.pointerMotion.clampLength(0, 1.2);
    }
    this.pointerActive = true;
    this.pointerTarget.set(nextX, nextY);
  }
  clearPointer() { this.pointerActive = false; this.pointerTarget.set(0, 0); }
  private blinkDelay() { return MathUtils.randFloat(this.config.blinkMinDelay, this.config.blinkMaxDelay); }
  private curiousDelay() { return MathUtils.randFloat(this.config.curiousMinDelay, this.config.curiousMaxDelay); }
  private enter(state: MotionState) { this.state = state; this.entered = this.time; }

  update(delta: number, reducedMotion = false) {
    const dt = Math.min(delta, 1 / 30);
    this.time += dt;
    const t = this.time;
    const amount = reducedMotion ? 0.18 : 1;
    const age = t - this.entered;
    let gazeTarget = 0, leanTarget = 0, stretchTarget = 0;

    if (this.state === 'IDLE') {
      if (t >= this.nextCurious && !reducedMotion) {
        this.lookSign = Math.random() < 0.5 ? -1 : 1;
        this.nextCurious = t + this.curiousDelay();
        this.squishVelocity += 0.15;
        this.enter('CURIOUS');
      } else if (t >= this.nextLook) {
        this.enter(this.lookSign < 0 ? 'LOOK_LEFT' : 'LOOK_RIGHT');
      }
    } else if (this.state === 'LOOK_LEFT' || this.state === 'LOOK_RIGHT') {
      gazeTarget = (this.state === 'LOOK_LEFT' ? -1 : 1) * 0.75 * ease(age / 0.6);
      if (age > 1.5) this.enter('RETURN_TO_IDLE');
    } else if (this.state === 'CURIOUS') {
      gazeTarget = this.lookSign * ease(age / 0.4);
      leanTarget = this.lookSign * 0.085 * ease((age - 0.35) / 1.15);
      stretchTarget = 0.035 * ease((age - 0.55) / 1.0);
      if (age > 3.1) this.enter('RETURN_TO_IDLE');
    } else if (age > 1.6) {
      this.lookSign *= -1;
      this.nextLook = t + MathUtils.randFloat(2.5, 4.5);
      this.enter('IDLE');
    }

    this.gaze = MathUtils.damp(this.gaze, gazeTarget, 6, dt);
    this.lean = MathUtils.damp(this.lean, leanTarget, 3.5, dt);
    this.stretch = MathUtils.damp(this.stretch, stretchTarget, 4, dt);
    this.pointer.x = MathUtils.damp(this.pointer.x, this.pointerTarget.x, 3, dt);
    this.pointer.y = MathUtils.damp(this.pointer.y, this.pointerTarget.y, 3, dt);
    this.pointerMotion.multiplyScalar(Math.exp(-5 * dt));
    this.pointerEngagement = MathUtils.damp(this.pointerEngagement, this.pointerActive ? 1 : 0, 4, dt);
    const autonomous = 1 - this.pointerEngagement * 0.9;
    const motionX = this.pointerMotion.x * this.config.mouseMotionStrength * amount;
    const motionY = this.pointerMotion.y * this.config.mouseMotionStrength * amount;

    const breathing = Math.sin(t * 1.45) * this.config.breathingStrength * amount;
    const lean = this.lean * amount * autonomous + this.pointer.x * this.config.mouseFollowStrength * 0.7 * amount + motionX;
    // A damped spring absorbs changes in lean and settles without a continuous bounce.
    this.squishVelocity += Math.abs(lean - this.previousLean) * 8;
    this.previousLean = lean;
    this.squishVelocity += (-52 * this.squish - 12 * this.squishVelocity) * dt;
    this.squish += this.squishVelocity * dt;
    const sy = 1 + breathing + this.stretch * amount * autonomous - this.squish - this.pointerMotion.length() * 0.01 * amount;
    this.dot.group.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    const wobble = this.config.wobbleStrength * amount;
    this.dot.group.rotation.z = -lean + (Math.sin(t * 0.77) * 0.48 + Math.sin(t * 1.31 + 2) * 0.22) * wobble;
    this.dot.group.rotation.x = Math.sin(t * 0.62 + 0.8) * wobble * 0.28 - this.pointer.y * 0.065 * amount - motionY * 0.7;
    this.dot.group.rotation.y = this.pointer.x * 0.07 * amount + motionX * 0.5;

    let blink = 1;
    if (this.eyeState === 'OPEN' && t >= this.nextBlink) {
      this.eyeState = 'BLINK'; this.blinkStart = t;
      this.doubleBlink = !this.repeatBlink && Math.random() < 0.18;
    }
    if (this.eyeState === 'BLINK') {
      const phase = (t - this.blinkStart) / this.config.blinkDuration;
      blink = 1 - 0.95 * Math.pow(Math.sin(Math.PI * MathUtils.clamp(phase, 0, 1)), 2);
      if (phase >= 1) {
        this.eyeState = 'OPEN';
        this.nextBlink = t + (this.doubleBlink ? 0.17 : this.blinkDelay());
        this.repeatBlink = this.doubleBlink;
      }
    }
    this.dot.eyes.eyes.forEach(({ mount, eye, rest, height }, i) => {
      mount.position.x = rest.x + (this.gaze * 0.036 * autonomous + this.pointer.x * 0.065) * amount + Math.sin(t * 1.1 + i * 2.3) * 0.0015 * amount;
      mount.position.y = rest.y + this.pointer.y * 0.04 * amount + Math.sin(t * 0.8 + i) * 0.001 * amount;
      eye.scale.y = height * blink;
      eye.rotation.y = (this.gaze * autonomous + this.pointer.x) * 0.05 * amount;
    });

    this.hatZ = MathUtils.damp(this.hatZ, -this.dot.group.rotation.z * 0.48, 5, dt);
    this.hatX = MathUtils.damp(this.hatX, -this.dot.group.rotation.x * 0.4, 5, dt);
    this.dot.beret.group.rotation.z = this.dot.beret.restRotation.z + this.hatZ;
    this.dot.beret.group.rotation.x = this.dot.beret.restRotation.x + this.hatX;
    this.dot.body.uniforms.uFeltTime.value = t;
    this.dot.body.fibers.uniforms.uFeltTime.value = t;
    this.dot.body.uniforms.uFeltMotion.value = amount;
    this.dot.body.fibers.uniforms.uFeltMotion.value = amount;
  }
}
