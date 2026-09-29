import type { InstantaneaVentana } from '../processing/SignalProcessor';
import type { LatidoClasificado } from '../processing/types';
import { VENTANA_ANALISIS_MS } from '../processing/thresholds';
import type { PaletaGrafica } from './palette';

/** Tamaño del lienzo en píxeles CSS y densidad de la pantalla. */
export interface DimensionesLienzo {
  readonly anchoCss: number;
  readonly altoCss: number;
  readonly escala: number;
}

/** Subconjunto del contexto 2D que usa el dibujo; permite probarlo sin canvas. */
export interface ContextoDibujo {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, ancho: number, alto: number): void;
  fillRect(x: number, y: number, ancho: number, alto: number): void;
  rect(x: number, y: number, ancho: number, alto: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  clip(): void;
  save(): void;
  restore(): void;
  fillText(texto: string, x: number, y: number): void;
}

// El margen derecho deja sitio a la etiqueta centrada del último minuto.
const MARGEN = { izquierda: 56, derecha: 24, arriba: 8, abajo: 24 } as const;
const SEPARACION_RAYADO_PX = 8;
const TAMANO_CRUZ_PX = 4;
const RR_POR_OMISION = { minimo: 600, maximo: 1200 } as const;

interface Escalas {
  readonly x: (tiempoMs: number) => number;
  readonly y: (rrMs: number) => number;
  readonly inicioMs: number;
  readonly finMs: number;
  readonly rrMinimo: number;
  readonly rrMaximo: number;
  readonly paso: number;
  readonly area: { x: number; y: number; ancho: number; alto: number };
}

function calcularEscalas(instantanea: InstantaneaVentana, dims: DimensionesLienzo): Escalas {
  // Mientras la ventana no está llena, el eje va de 0 a 5 min y se llena de izquierda a derecha.
  const inicioMs = Math.max(0, instantanea.tiempoMs - VENTANA_ANALISIS_MS);
  const finMs = inicioMs + VENTANA_ANALISIS_MS;

  const aceptados = instantanea.latidos.filter((l) => l.aceptado).map((l) => l.rrMs);
  const minimo = aceptados.length > 0 ? Math.min(...aceptados) : RR_POR_OMISION.minimo;
  const maximo = aceptados.length > 0 ? Math.max(...aceptados) : RR_POR_OMISION.maximo;
  // Rango redondeado a 100 ms con margen, para que la escala no salte a cada latido.
  let rrMinimo = Math.floor((minimo - 50) / 100) * 100;
  let rrMaximo = Math.ceil((maximo + 50) / 100) * 100;
  if (rrMaximo - rrMinimo < 200) {
    rrMinimo -= 100;
    rrMaximo += 100;
  }
  const paso = rrMaximo - rrMinimo > 600 ? 200 : 100;

  const area = {
    x: MARGEN.izquierda,
    y: MARGEN.arriba,
    ancho: Math.max(1, dims.anchoCss - MARGEN.izquierda - MARGEN.derecha),
    alto: Math.max(1, dims.altoCss - MARGEN.arriba - MARGEN.abajo),
  };
  return {
    inicioMs,
    finMs,
    rrMinimo,
    rrMaximo,
    paso,
    area,
    x: (tiempoMs) => area.x + ((tiempoMs - inicioMs) / VENTANA_ANALISIS_MS) * area.ancho,
    y: (rrMs) => {
      const acotado = Math.min(Math.max(rrMs, rrMinimo), rrMaximo);
      return area.y + area.alto - ((acotado - rrMinimo) / (rrMaximo - rrMinimo)) * area.alto;
    },
  };
}

function formatearMinutos(ms: number): string {
  const segundos = Math.round(ms / 1000);
  return `${String(Math.floor(segundos / 60))}:${String(segundos % 60).padStart(2, '0')}`;
}

function dibujarEjes(ctx: ContextoDibujo, e: Escalas, paleta: PaletaGrafica): void {
  ctx.strokeStyle = paleta.rejilla;
  ctx.fillStyle = paleta.texto;
  ctx.lineWidth = 1;
  ctx.font = paleta.fuente;

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let rr = e.rrMinimo; rr <= e.rrMaximo; rr += e.paso) {
    const y = e.y(rr);
    ctx.beginPath();
    ctx.moveTo(e.area.x, y);
    ctx.lineTo(e.area.x + e.area.ancho, y);
    ctx.stroke();
    ctx.fillText(`${String(rr)} ms`, e.area.x - 6, y);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // Marcas en minutos enteros de señal, aunque la ventana empiece a mitad de minuto.
  for (let t = Math.ceil(e.inicioMs / 60_000) * 60_000; t <= e.finMs; t += 60_000) {
    ctx.fillText(formatearMinutos(t), e.x(t), e.area.y + e.area.alto + 6);
  }
}

function dibujarTramos(
  ctx: ContextoDibujo,
  e: Escalas,
  instantanea: InstantaneaVentana,
  paleta: PaletaGrafica,
): void {
  for (const tramo of instantanea.tramos) {
    const x0 = Math.max(e.x(tramo.inicioMs), e.area.x);
    const x1 = Math.min(e.x(tramo.finMs), e.area.x + e.area.ancho);
    if (x1 <= x0) {
      continue;
    }
    ctx.fillStyle = paleta.bajaCalidadFondo;
    ctx.fillRect(x0, e.area.y, x1 - x0, e.area.alto);

    // Rayado diagonal: el tramo se distingue también sin percibir el color.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, e.area.y, x1 - x0, e.area.alto);
    ctx.clip();
    ctx.strokeStyle = paleta.bajaCalidadRayado;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0 - e.area.alto; x < x1; x += SEPARACION_RAYADO_PX) {
      ctx.moveTo(x, e.area.y + e.area.alto);
      ctx.lineTo(x + e.area.alto, e.area.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function dibujarSerie(ctx: ContextoDibujo, e: Escalas, latidos: readonly LatidoClasificado[], paleta: PaletaGrafica): void {
  ctx.strokeStyle = paleta.linea;
  ctx.lineWidth = 2;
  ctx.beginPath();
  let anterior: LatidoClasificado | null = null;
  for (const latido of latidos) {
    if (latido.aceptado) {
      const x = e.x(latido.finMs);
      const y = e.y(latido.rrMs);
      // La línea solo une latidos consecutivos aceptados; se corta en descartes y huecos.
      if (anterior?.aceptado === true && latido.contiguoAlAnterior) {
        ctx.lineTo(x, y);
      } else {
        ctx.moveTo(x, y);
      }
    }
    anterior = latido;
  }
  ctx.stroke();
}

function dibujarDescartados(
  ctx: ContextoDibujo,
  e: Escalas,
  latidos: readonly LatidoClasificado[],
  paleta: PaletaGrafica,
): void {
  ctx.strokeStyle = paleta.descartado;
  ctx.lineWidth = 1.5;
  for (const latido of latidos) {
    if (latido.aceptado) {
      continue;
    }
    const x = e.x(latido.finMs);
    const y = e.y(latido.rrMs);
    ctx.beginPath();
    ctx.moveTo(x - TAMANO_CRUZ_PX, y - TAMANO_CRUZ_PX);
    ctx.lineTo(x + TAMANO_CRUZ_PX, y + TAMANO_CRUZ_PX);
    ctx.moveTo(x - TAMANO_CRUZ_PX, y + TAMANO_CRUZ_PX);
    ctx.lineTo(x + TAMANO_CRUZ_PX, y - TAMANO_CRUZ_PX);
    ctx.stroke();
  }
}

/**
 * Dibuja el tacograma: intervalos RR de la ventana de 5 min frente al tiempo
 * de señal. Los tramos de baja calidad llevan fondo y rayado, y los latidos
 * descartados una ×, para no depender solo del color (WCAG 1.4.1).
 * Todos los colores vienen de la paleta.
 */
export function dibujarTacograma(
  ctx: ContextoDibujo,
  instantanea: InstantaneaVentana,
  paleta: PaletaGrafica,
  dims: DimensionesLienzo,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, dims.anchoCss * dims.escala, dims.altoCss * dims.escala);
  // Se dibuja en píxeles CSS; la escala adapta el resultado a la densidad de la pantalla.
  ctx.setTransform(dims.escala, 0, 0, dims.escala, 0, 0);

  const escalas = calcularEscalas(instantanea, dims);
  dibujarTramos(ctx, escalas, instantanea, paleta);
  dibujarEjes(ctx, escalas, paleta);
  dibujarSerie(ctx, escalas, instantanea.latidos, paleta);
  dibujarDescartados(ctx, escalas, instantanea.latidos, paleta);
}
