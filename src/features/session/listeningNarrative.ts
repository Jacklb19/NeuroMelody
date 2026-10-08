import type { ConnectionState } from '../acquisition/contract';
import type { ActivationState } from '../adaptation/AdaptationEngine';

/** What the listener needs to know about the moment, in plain words. */
export interface ListeningNarrative {
  readonly title: string;
  readonly detail: string;
}

export interface NarrativeInput {
  readonly connection: ConnectionState;
  readonly state: ActivationState | null;
  readonly qualityGood: boolean;
  readonly musicPlaying: boolean;
}

/**
 * Describes the current moment of the session for the simple view (ADR-24).
 *
 * The wording is descriptive, never clinical: it compares the body with its
 * own starting point and says what the music does, without naming pain,
 * stress or any diagnosis. The connection comes first because nothing else
 * is meaningful without a signal. Stopping the music pauses the adaptation,
 * which must not read as a problem with the sensor.
 */
export function describeListening({ connection, state, qualityGood, musicPlaying }: NarrativeInput): ListeningNarrative {
  if (connection === 'reconnecting') {
    return {
      title: 'Recuperando la conexión',
      detail: 'La música sigue sonando y conserva su ritmo mientras vuelve la señal.',
    };
  }
  if (connection !== 'connected') {
    return {
      title: 'Conecta una fuente de señal',
      detail: 'La música puede sonar sin señal, pero solo se adapta a ti cuando hay una fuente conectada.',
    };
  }
  if (state === null) {
    return {
      title: 'Tomando tu referencia',
      detail: 'Durante los primeros minutos la música se mantiene estable mientras aprende tu ritmo de partida.',
    };
  }
  if (!musicPlaying) {
    return {
      title: 'La música está detenida',
      detail: 'La señal sigue llegando. Cuando inicies la música, volverá a acompañar tu ritmo.',
    };
  }
  if (!qualityGood) {
    return {
      title: 'Esperando una señal clara',
      detail: 'La música conserva su paso. Revisa que el sensor esté bien colocado.',
    };
  }
  switch (state) {
    case 'high':
      return {
        title: 'Tu ritmo está más activo que al empezar',
        detail: 'La música baja el paso poco a poco para acompañarte.',
      };
    case 'low':
      return {
        title: 'Tu ritmo está más tranquilo que al empezar',
        detail: 'La música sigue esa calma y avanza hacia un paso más lento.',
      };
    case 'uncertain':
      return {
        title: 'Tu ritmo se mantiene cerca del inicio',
        detail: 'La música avanza despacio, sin cambios bruscos.',
      };
  }
}
