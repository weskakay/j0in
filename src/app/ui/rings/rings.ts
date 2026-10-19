import { Component, afterNextRender, input, signal } from '@angular/core';

/** One ring: how full it is, between 0 and 1, and its colour token. */
export interface Ring {
  label: string;
  value: number;
  color: string;
}

/** Radius of the outer ring; each further ring sits one step inside. */
const OUTER = 52;
const STEP = 14;

/**
 * Concentric rings that fill up like an activity tracker. They start empty
 * and grow to their value once on screen; reduced motion skips the growing.
 */
@Component({
  selector: 'app-rings',
  templateUrl: './rings.html',
  styleUrl: './rings.scss',
})
export class Rings {
  /** The rings from the outside in. */
  readonly rings = input.required<Ring[]>();

  /** False for the first frame, so the rings have something to grow from. */
  protected readonly shown = signal(false);

  constructor() {
    afterNextRender(() => requestAnimationFrame(() => this.shown.set(true)));
  }

  /** The radius of the ring at a position. */
  protected radius(index: number): number {
    return OUTER - index * STEP;
  }

  /** The dash pattern that fills a ring to its value. */
  protected dash(index: number, value: number): string {
    const length = 2 * Math.PI * this.radius(index);
    const filled = this.shown() ? Math.min(1, Math.max(0, value)) * length : 0;
    return `${filled} ${length}`;
  }
}
