import { Vector2 } from "three";
import { damp } from "../utils/math";

/**
 * Tracks the pointer relative to an element in normalised device coordinates
 * (-1..1, +y up), plus a smoothed velocity in NDC units per second.
 */
export class PointerTracker {
  readonly position = new Vector2();
  readonly velocity = new Vector2();
  inside = false;
  pressed = false;
  /** Seconds since the pointer last moved over the element. */
  idleTime = Infinity;

  onPress?: () => void;
  onRelease?: () => void;

  private pendingDelta = new Vector2();
  private hasPosition = false;
  private readonly controller = new AbortController();

  constructor(private readonly element: HTMLElement) {
    const options = { signal: this.controller.signal };
    element.addEventListener("pointermove", this.handleMove, options);
    element.addEventListener("pointerdown", this.handleDown, options);
    element.addEventListener("pointerleave", this.handleLeave, options);
    window.addEventListener("pointerup", this.handleUp, options);
    window.addEventListener("pointercancel", this.handleUp, options);
    window.addEventListener("blur", this.handleLeave, options);
  }

  update(dt: number) {
    if (dt <= 0) return;
    const vx = this.pendingDelta.x / dt;
    const vy = this.pendingDelta.y / dt;
    this.pendingDelta.set(0, 0);
    this.velocity.set(damp(this.velocity.x, vx, 14, dt), damp(this.velocity.y, vy, 14, dt));
    this.idleTime += dt;
  }

  dispose() {
    this.controller.abort();
  }

  private toNdc(event: PointerEvent) {
    const rect = this.element.getBoundingClientRect();
    return new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private handleMove = (event: PointerEvent) => {
    const next = this.toNdc(event);
    if (this.hasPosition && this.inside) this.pendingDelta.add(next.clone().sub(this.position));
    this.position.copy(next);
    this.hasPosition = true;
    this.inside = true;
    this.idleTime = 0;
  };

  private handleDown = (event: PointerEvent) => {
    this.handleMove(event);
    this.pressed = true;
    this.onPress?.();
  };

  private handleUp = (event: PointerEvent) => {
    if (this.pressed) {
      this.pressed = false;
      this.onRelease?.();
    }
    // Touch has no hover: once the finger lifts the character should relax.
    if (event.pointerType !== "mouse") this.inside = false;
  };

  private handleLeave = () => {
    this.inside = false;
    this.pendingDelta.set(0, 0);
  };
}
