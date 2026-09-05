import { Component, ElementRef, inject } from '@angular/core';
import { COLUMN_MAX, COLUMN_MIN, LayoutService } from '../../../core/layout.service';
import { LanguageService } from '../../../core/language.service';

/** How much one arrow key press moves the edge. */
const STEP = 20;

/**
 * The edge between two columns. Dragging it sets how wide a column is, and
 * the same width applies to all of them so the board stays even. Arrow keys
 * do the same thing for anyone who does not use a pointer.
 */
@Component({
  selector: 'app-column-grip',
  imports: [],
  templateUrl: './column-grip.html',
  styleUrl: './column-grip.scss',
})
export class ColumnGrip {
  private readonly layout = inject(LayoutService);
  private readonly language = inject(LanguageService);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** How wide a column is right now, read out on the separator. */
  protected readonly width = this.layout.columnWidth;

  /** What the edge may be dragged between. */
  protected readonly min = COLUMN_MIN;
  protected readonly max = COLUMN_MAX;

  private startX = 0;
  private startWidth = 0;

  /** Takes hold of the edge and follows the pointer until it is let go. */
  protected onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.startX = event.clientX;
    this.startWidth = this.width();
    const grip = event.target as HTMLElement;
    grip.setPointerCapture(event.pointerId);
    this.host.nativeElement.classList.add('grip--held');
  }

  /** Moves the edge while the pointer is down. */
  protected onPointerMove(event: PointerEvent): void {
    if (this.startWidth === 0) {
      return;
    }
    this.layout.setColumnWidth(this.startWidth + (event.clientX - this.startX));
  }

  /** Lets the edge go. */
  protected onPointerUp(): void {
    this.startWidth = 0;
    this.host.nativeElement.classList.remove('grip--held');
  }

  /** Left and right move the edge, Home and End go to the two limits. */
  protected onKeydown(event: KeyboardEvent): void {
    const moves: Record<string, number> = {
      ArrowLeft: this.width() - STEP,
      ArrowRight: this.width() + STEP,
      Home: COLUMN_MIN,
      End: COLUMN_MAX,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      this.layout.setColumnWidth(next);
    }
  }
}
