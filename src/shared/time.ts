/**
 * Unit conversions shared by clocks, plans and session records. They are
 * fixed by definition, so they live apart from any tunable value.
 */
export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
