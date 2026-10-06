import type { DrawingContext } from '../features/signal/drawing/drawTachogram';

export interface DrawingOperation {
  readonly operation: string;
  readonly args: readonly unknown[];
  /** Estilo vigente cuando se ejecutó la operación. */
  readonly fillStyle: unknown;
  readonly strokeStyle: unknown;
}

/** Contexto 2D que registra cada operación con el estilo vigente; jsdom no tiene canvas. */
export class FakeDrawingContext implements DrawingContext {
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  strokeStyle: string | CanvasGradient | CanvasPattern = '';
  lineWidth = 1;
  font = '';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  readonly operations: DrawingOperation[] = [];

  #register(operation: string, args: readonly unknown[]): void {
    this.operations.push({
      operation,
      args,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
    });
  }

  count(operation: string, filter: (o: DrawingOperation) => boolean = () => true): number {
    return this.operations.filter((o) => o.operation === operation && filter(o)).length;
  }

  setTransform(...args: number[]): void {
    this.#register('setTransform', args);
  }
  clearRect(...args: number[]): void {
    this.#register('clearRect', args);
  }
  fillRect(...args: number[]): void {
    this.#register('fillRect', args);
  }
  rect(...args: number[]): void {
    this.#register('rect', args);
  }
  beginPath(): void {
    this.#register('beginPath', []);
  }
  moveTo(...args: number[]): void {
    this.#register('moveTo', args);
  }
  lineTo(...args: number[]): void {
    this.#register('lineTo', args);
  }
  stroke(): void {
    this.#register('stroke', []);
  }
  clip(): void {
    this.#register('clip', []);
  }
  save(): void {
    this.#register('save', []);
  }
  restore(): void {
    this.#register('restore', []);
  }
  fillText(text: string, x: number, y: number): void {
    this.#register('fillText', [text, x, y]);
  }
}
