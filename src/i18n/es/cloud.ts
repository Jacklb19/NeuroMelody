/** Spanish copy of syncing with the account (RF-14, ADR-10, ADR-18). Plain words: where the sessions are and why. */
export const cloud = {
  /** Keys mirror `CloudSyncStatus`, except `failed`, which carries its reason. */
  status: {
    unavailable: 'Tus sesiones se guardan solo en este dispositivo.',
    signed_out: 'Tus sesiones están solo en este dispositivo. Con una cuenta puedes tenerlas también en la nube.',
    needs_second_factor: 'Tus sesiones están solo en este dispositivo. Para guardarlas en la nube hace falta la verificación en dos pasos.',
    needs_consent: 'Tus sesiones están solo en este dispositivo. Para guardarlas en la nube falta tu consentimiento.',
    syncing: 'Sincronizando con tu cuenta…',
    synced: 'Tus sesiones están en este dispositivo y en tu cuenta.',
  },
  /** Link that solves each reason for not syncing; keys mirror the statuses that have one. */
  actions: {
    signed_out: 'Entrar',
    needs_second_factor: 'Ir a tu perfil',
    needs_consent: 'Ir a privacidad',
  },
  /** `reason` is one of `errors`. */
  failed: (reason: string): string => `No se pudo sincronizar: ${reason} Tus sesiones siguen en este dispositivo.`,
  retry: 'Reintentar',
  /** Keys mirror `CloudErrorCode`. */
  errors: {
    unauthenticated: 'tu sesión caducó; vuelve a entrar.',
    second_factor_required: 'falta la verificación en dos pasos.',
    consent_required: 'falta tu consentimiento de sincronización.',
    session_conflict: 'una sesión ya existe con otra cuenta.',
    not_found: 'la sesión ya no está en la nube.',
    invalid_request: 'una sesión no tiene un formato que el servicio acepte.',
    storage_unavailable: 'el servicio no responde ahora mismo.',
    network: 'no hay conexión.',
    unknown: 'ocurrió un error inesperado.',
  },
  /** A session could not be deleted because the cloud did not confirm it; `reason` is one of `errors`. */
  deleteFailed: (reason: string): string => `No se borró nada: ${reason} Inténtalo de nuevo cuando haya conexión.`,
};
