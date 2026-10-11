/**
 * Usage warnings (RF-17). The text follows the "Advertencias de uso
 * incorporadas al producto" section of the definition document, in
 * descriptive language and without clinical claims (R-06). It is legally
 * required: its wording changes only together with that document.
 */
const items: readonly string[] = [
  'NeuroMelody is a wellbeing and companionship tool. It is not a medical device and is not certified as one.',
  'It does not measure pain or suggest modifying, stopping or replacing a prescribed treatment.',
  'Its use is complementary to the follow-up care provided by your healthcare professional.',
  'It does not issue clinical alerts or interpret the signal. If a reading is not reliable, it will tell you and recommend that you check the device.',
];

/** English copy of the warnings screen (ADR-25). */
export const warnings = {
  pageTitle: 'Before you start',
  eyebrow: 'Mindful listening',
  items,
  /**
   * Last warning. It names the stop button and the stop key through
   * parameters (the audio area's label and `STOP_SHORTCUT_KEY`) so the
   * warning cannot describe a control that no longer exists.
   */
  stopHint: (stopLabel: string, keyName: string): string =>
    `You can stop the music at any time with the “${stopLabel}” button, which is always visible, or with the ${keyName} key.`,
  /** How each stop key is named to the person; keys mirror `STOP_SHORTCUT_KEY`. */
  keyNames: {
    Escape: 'Esc',
  },
  confirmation:
    'I have read these conditions and I understand that the use of NeuroMelody is complementary to the follow-up care provided by my healthcare professional.',
  accept: 'Accept and continue',
};
