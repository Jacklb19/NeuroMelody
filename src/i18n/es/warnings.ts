/**
 * Usage warnings (RF-17). The text follows the "Advertencias de uso
 * incorporadas al producto" section of the definition document, in
 * descriptive language and without clinical claims (R-06). It is legally
 * required: its wording changes only together with that document.
 */
const items: readonly string[] = [
  'NeuroMelody es una herramienta de bienestar y acompañamiento. No es un dispositivo médico ni está certificada como tal.',
  'No mide el dolor ni sugiere modificar, suspender o sustituir un tratamiento prescrito.',
  'Su uso es complementario al seguimiento de tu profesional de la salud.',
  'No emite alertas clínicas ni interpreta la señal. Si una lectura no es fiable, te lo indicará y te recomendará revisar el dispositivo.',
];

/** Spanish copy of the warnings screen (ADR-25). */
export const warnings = {
  pageTitle: 'Antes de empezar',
  eyebrow: 'Una escucha consciente',
  items,
  /**
   * Last warning. It names the stop button and the stop key through
   * parameters (the audio area's label and `STOP_SHORTCUT_KEY`) so the
   * warning cannot describe a control that no longer exists.
   */
  stopHint: (stopLabel: string, keyName: string): string =>
    `Puedes detener la música en cualquier momento con el botón «${stopLabel}», siempre visible, o con la tecla ${keyName}.`,
  /** How each stop key is named to the person; keys mirror `STOP_SHORTCUT_KEY`. */
  keyNames: {
    Escape: 'Esc',
  },
  confirmation:
    'He leído estas condiciones y entiendo que el uso de NeuroMelody es complementario al seguimiento de mi profesional de la salud.',
  accept: 'Aceptar y continuar',
};
