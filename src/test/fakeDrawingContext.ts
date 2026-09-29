import type { ContextoDibujo } from '../features/signal/drawing/drawTachogram';

export interface OperacionDibujo {
  readonly operacion: string;
  readonly argumentos: readonly unknown[];
  /** Estilo vigente cuando se ejecutó la operación. */
  readonly fillStyle: unknown;
  readonly strokeStyle: unknown;
}

/** Contexto 2D que registra cada operación con el estilo vigente; jsdom no tiene canvas. */
export class ContextoDibujoFalso implements ContextoDibujo {
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  strokeStyle: string | CanvasGradient | CanvasPattern = '';
  lineWidth = 1;
  font = '';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  readonly operaciones: OperacionDibujo[] = [];

  #registrar(operacion: string, argumentos: readonly unknown[]): void {
    this.operaciones.push({
      operacion,
      argumentos,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
    });
  }

  contar(operacion: string, filtro: (o: OperacionDibujo) => boolean = () => true): number {
    return this.operaciones.filter((o) => o.operacion === operacion && filtro(o)).length;
  }

  setTransform(...argumentos: number[]): void {
    this.#registrar('setTransform', argumentos);
  }
  clearRect(...argumentos: number[]): void {
    this.#registrar('clearRect', argumentos);
  }
  fillRect(...argumentos: number[]): void {
    this.#registrar('fillRect', argumentos);
  }
  rect(...argumentos: number[]): void {
    this.#registrar('rect', argumentos);
  }
  beginPath(): void {
    this.#registrar('beginPath', []);
  }
  moveTo(...argumentos: number[]): void {
    this.#registrar('moveTo', argumentos);
  }
  lineTo(...argumentos: number[]): void {
    this.#registrar('lineTo', argumentos);
  }
  stroke(): void {
    this.#registrar('stroke', []);
  }
  clip(): void {
    this.#registrar('clip', []);
  }
  save(): void {
    this.#registrar('save', []);
  }
  restore(): void {
    this.#registrar('restore', []);
  }
  fillText(texto: string, x: number, y: number): void {
    this.#registrar('fillText', [texto, x, y]);
  }
}
