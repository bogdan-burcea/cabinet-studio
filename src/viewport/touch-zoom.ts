type TouchPoint = Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>;
const separation = ([a, b]: TouchPoint[]) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

/** Establish a fresh baseline whenever the fingers taking part change. */
export class TouchZoom {
  private points = new Map<number, TouchPoint>();
  private used = false;

  start(point: TouchPoint) {
    if (!this.points.size) this.used = false;
    this.points.set(point.pointerId, point);
    const started = this.points.size === 2 && !this.used;
    if (started) this.used = true;
    return started;
  }

  move(point: TouchPoint) {
    if (!this.points.has(point.pointerId)) return;
    const pinch = this.points.size === 2;
    const before = pinch ? separation([...this.points.values()]) : 0;
    this.points.set(point.pointerId, point);
    if (!pinch) return;
    const after = separation([...this.points.values()]);
    if (before >= 1 && after >= 1 && before !== after) return before / after;
  }

  end(pointerId: number) {
    return this.points.delete(pointerId) && this.points.size === 0 && this.used;
  }

  get blocksSinglePointer() {
    return this.used && this.points.size > 0;
  }
}
