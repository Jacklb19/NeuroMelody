/** English copy of the privacy screen (Ley 1581 de 2012, ADR-18, ADR-25). Descriptive, never clinical. */
export const privacy = {
  pageTitle: 'Privacy',
  eyebrow: 'Your data',
  introduction:
    'NeuroMelody handles data related to your health: the rhythm of your heart and how you feel. That is why everything works without an account and nothing leaves your device without your permission.',
  /** Sections in order; keys mirror `PRIVACY_SECTION_IDS`. */
  sections: {
    device: {
      title: 'On your device',
      /** `seconds` is how often a session stores its indicators. */
      text: (seconds: number): string =>
        `The signal is analyzed in the browser. Sessions (indicators every ${String(seconds)} seconds, ratings and goals) are saved on this device and you can delete them from the history.`,
    },
    camera: {
      title: 'Camera',
      text: 'If you use the camera as your source, each image is processed instantly to estimate your pulse and then discarded. Nothing is recorded or sent.',
    },
    cloud: {
      title: 'In the cloud, only with your consent',
      text: 'With an account and two-step verification turned on, you can sync the aggregated indicators of your sessions. The raw signal is never sent. The data is stored in Supabase with access limited to your account.',
    },
    summary: {
      title: 'Automatic summary',
      text: 'If you ask for it, a language model receives only aggregated figures from the session to write a summary in plain words, marked as automatically generated.',
    },
    rights: {
      title: 'Your rights',
      text: "Under Colombia's Law 1581 of 2012, you can access, update, correct and delete your data and withdraw your consent at any time, from this app or by writing to the people responsible for the project.",
    },
  },
  consent: {
    title: 'Sync consent',
    label: 'I agree to my aggregated indicators being stored in the cloud so they can be synced across my devices.',
    given: (date: string): string => `Consent given on ${date}.`,
    notGiven: 'No consent: your sessions stay only on this device.',
    withdrawn: 'You withdrew your consent. Your sessions stay only on this device.',
    /** Where the answer is kept, by whether someone is signed in. */
    stored: {
      device: 'Without an account, your answer stays on this device. Once you sign in, the one in your account applies.',
      account: 'Your answer is saved in your account. If you withdraw it, your sessions stop being sent; the ones already in the cloud can be deleted from the history.',
    },
    saveFailed: 'Your answer could not be saved in your account. Please try again.',
  },
  backToAccount: 'Go to account',
};
