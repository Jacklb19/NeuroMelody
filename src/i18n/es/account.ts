/** Spanish copy of the account screen (ADR-10, ADR-18, ADR-25). */
export const account = {
  pageTitle: 'Cuenta',
  eyebrow: 'Opcional',
  introduction:
    'Escuchar no requiere cuenta. Con una cuenta, protegida con un segundo factor, podrás sincronizar tus sesiones entre dispositivos y pedir el resumen automático.',
  loading: 'Comprobando tu sesión…',
  unavailable: 'Las cuentas no están configuradas en esta versión de la app. Puedes seguir escuchando sin cuenta.',
  /** Tabs of the signed-out view; keys mirror `AUTH_FORM_IDS`. */
  forms: {
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    reset: 'Recuperar contraseña',
  },
  formsLabel: 'Acceso a la cuenta',
  email: 'Correo electrónico',
  password: 'Contraseña',
  newPassword: 'Contraseña nueva',
  /** Hint under a new password; the length comes from `MIN_PASSWORD_LENGTH`. */
  passwordHint: (minLength: number): string => `Al menos ${String(minLength)} caracteres.`,
  passwordTooShort: (minLength: number): string => `La contraseña debe tener al menos ${String(minLength)} caracteres.`,
  submit: {
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    reset: 'Enviar enlace',
    updatePassword: 'Guardar contraseña',
  },
  working: 'Un momento…',
  signUpSent: (email: string): string =>
    `Te enviamos un enlace a ${email}. Ábrelo para confirmar tu cuenta y después entra con tu contraseña.`,
  resetSent: (email: string): string =>
    `Si ${email} tiene una cuenta, recibirás un enlace para elegir una contraseña nueva.`,
  recoveryTitle: 'Elige una contraseña nueva',
  passwordUpdated: 'Tu contraseña se guardó.',
  consentNotice: 'Al crear una cuenta aceptas el tratamiento de datos descrito en',
  privacyLink: 'Privacidad',
  /** Keys mirror `AccountErrorCode`. */
  errors: {
    invalid_credentials: 'El correo o la contraseña no coinciden.',
    email_not_confirmed: 'Primero confirma tu cuenta con el enlace que te enviamos por correo.',
    user_already_exists: 'Ya existe una cuenta con ese correo. Prueba a entrar o a recuperar la contraseña.',
    weak_password: 'Esa contraseña es demasiado fácil de adivinar. Prueba con una más larga.',
    same_password: 'La contraseña nueva debe ser distinta de la anterior.',
    rate_limited: 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.',
    invalid_code: 'El código no es correcto. Revisa la hora del dispositivo y escribe el código actual.',
    code_expired: 'El código caducó. Escribe el que muestra ahora tu aplicación.',
    too_many_factors: 'Ya tienes el máximo de dispositivos. Quita uno antes de añadir otro.',
    session_expired: 'Tu sesión caducó. Entra de nuevo.',
    network: 'No hay conexión con el servidor de cuentas. Revisa tu conexión y vuelve a probar.',
    unknown: 'No se pudo completar la acción. Vuelve a probar en un momento.',
  },
  signedIn: {
    title: 'Tu cuenta',
    emailLabel: 'Correo',
    signOut: 'Salir',
    secondFactorOn: 'Segundo factor activo',
    secondFactorOff: 'Segundo factor sin activar',
    syncNeedsFactor: 'Para sincronizar tus sesiones activa el segundo factor.',
    privacyAction: 'Revisar privacidad y consentimiento',
    deleteAccount: 'Borrar la cuenta',
    deletePending: 'El borrado de la cuenta llega con la sincronización de sesiones.',
  },
  totp: {
    title: 'Segundo factor',
    description:
      (digits: number): string =>
        `Usa una aplicación de autenticación (por ejemplo, Google Authenticator o Microsoft Authenticator). Te pedirá un código de ${String(digits)} dígitos al entrar.`,
    recoveryAdvice:
      'Añade un segundo dispositivo como respaldo: si pierdes uno, podrás entrar con el otro.',
    devicesLabel: 'Dispositivos',
    noDevices: 'Todavía no hay dispositivos.',
    deviceName: (index: number): string => `Dispositivo ${String(index)}`,
    addedOn: (date: string): string => `Añadido el ${date}`,
    add: 'Añadir dispositivo',
    addAnother: 'Añadir otro dispositivo',
    remove: 'Quitar',
    confirmRemove: 'Sí, quitar',
    scan: 'Escanea este código con la aplicación de autenticación.',
    qrAlt: 'Código QR para la aplicación de autenticación',
    secretLabel: 'Si no puedes escanearlo, escribe esta clave:',
    codeLabel: (digits: number): string => `Código de ${String(digits)} dígitos`,
    verify: 'Verificar',
    cancel: 'Cancelar',
    added: 'Dispositivo añadido.',
    challengeTitle: 'Confirma que eres tú',
    challengeText: 'Escribe el código que muestra tu aplicación de autenticación.',
    invalidFormat: (digits: number): string => `Escribe los ${String(digits)} dígitos del código.`,
  },
};
