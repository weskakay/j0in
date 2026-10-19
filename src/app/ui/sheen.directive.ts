import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Lets a soft light follow the pointer across a surface. It only moves two
 * custom properties; whether the light shows at all is up to the look and
 * to reduced motion, both decided in the tokens.
 */
@Directive({
  selector: '[appSheen]',
  host: {
    class: 'sheen',
    '(pointermove)': 'onMove($event)',
  },
})
export class SheenDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private frame = 0;

  /** Follows the pointer, at most once per frame. */
  protected onMove(event: PointerEvent): void {
    if (this.frame !== 0 || event.pointerType !== 'mouse') {
      return;
    }
    this.frame = requestAnimationFrame(() => this.place(event));
  }

  /** Writes where the light sits, relative to the surface. */
  private place(event: PointerEvent): void {
    this.frame = 0;
    const box = this.host.nativeElement.getBoundingClientRect();
    this.host.nativeElement.style.setProperty('--mx', `${event.clientX - box.left}px`);
    this.host.nativeElement.style.setProperty('--my', `${event.clientY - box.top}px`);
  }
}
