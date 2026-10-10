/**
 * Line icons drawn for NeuroMelody, one visual family: 24px grid, round
 * joins, stroke in the current text colour. Decorative by default; the text
 * next to each one carries the meaning.
 */
interface IconProps {
  readonly className?: string;
}

function Icon({ className, children }: IconProps & { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <svg
      className={className === undefined ? 'icon' : `icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const UserIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.6 4.4-5.4 8-5.4s6.500 1.800 8 5.400" /></Icon>
);
export const PlayIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M8 5.500v13l10.500-6.500z" /></Icon>
);
export const ArrowRightIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
);
export const ClockIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><circle cx="12" cy="12" r="8.500" /><path d="M12 7.500V12l3 2" /></Icon>
);
export const HistoryIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M4 12a8 8 0 1 0 2.600-5.900M4 5v4h4" /><path d="M12 8v4l2.500 2" /></Icon>
);
export const ShieldIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M12 3.500l7 2.500v5.500c0 4.300-2.900 7.400-7 9-4.100-1.600-7-4.700-7-9V6z" /><path d="M9 12l2.200 2.200L15 10.400" /></Icon>
);
export const HeartIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M12 20s-7.500-4.600-7.500-10.200A4.300 4.300 0 0 1 12 7.200a4.300 4.300 0 0 1 7.500 2.600C19.500 15.400 12 20 12 20z" /></Icon>
);
export const WaveIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M3 12h3l2-6 3.500 12L14 8l1.500 4H21" /></Icon>
);
export const NoteIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M9 18V5.500l10-2V16" /><ellipse cx="6.500" cy="18" rx="2.500" ry="2" /><ellipse cx="16.500" cy="16" rx="2.500" ry="2" /></Icon>
);
export const SparkIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M12 3.500v4M12 16.500v4M3.500 12h4M16.500 12h4M6.300 6.300l2.500 2.500M15.200 15.200l2.500 2.500M17.700 6.300l-2.500 2.500M8.800 15.200l-2.500 2.500" /></Icon>
);
export const LeafIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M5 19c0-8 5-13 14-14 0 9-4.500 14-12 14" /><path d="M5 19c2.500-4.500 5.500-7.500 9-9.500" /></Icon>
);
export const MoonIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M19.500 14.500A8 8 0 0 1 9.500 4.500a8 8 0 1 0 10 10z" /></Icon>
);
export const SunsetIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 6v3M5.600 9.600l1.800 1.800M18.400 9.600l-1.800 1.800" /></Icon>
);
export const WindIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M3 9h10.500a2.500 2.500 0 1 0-2.500-2.500M3 14h14.500a2.500 2.500 0 1 1-2.500 2.500M3 11.500h6" /></Icon>
);
export const PauseIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><circle cx="12" cy="12" r="8.500" /><path d="M10 9v6M14 9v6" /></Icon>
);
export const BluetoothIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M7 8l10 8-5 4V4l5 4-10 8" /></Icon>
);
export const CameraIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M4 8h3l1.500-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.200" /></Icon>
);
export const FileIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M7 3.500h7l4 4v13H7z" /><path d="M14 3.500v4h4M9.500 14h1.500l1-2.500 1.500 5 1-2.500h1" /></Icon>
);
export const LogOutIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M10 4.500H5v15h5M15 8l4 4-4 4M19 12H9" /></Icon>
);
export const KeyIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><circle cx="8" cy="15" r="3.500" /><path d="M10.500 12.500L19 4M15.500 7.500l2.500 2.500" /></Icon>
);
export const ChevronRightIcon = (props: IconProps): React.JSX.Element => (
  <Icon {...props}><path d="M9 6l6 6-6 6" /></Icon>
);

/** Google's mark, in the colours its brand guidelines require for sign-in buttons. */
export function GoogleIcon({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className === undefined ? 'icon' : `icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.500 12.200c0-.800-.100-1.500-.200-2.200H12v4.200h5.900a5 5 0 0 1-2.200 3.300v2.700h3.500c2.100-1.900 3.300-4.700 3.300-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.500-1 7.300-2.700l-3.500-2.700c-1 .700-2.200 1.100-3.800 1.100-2.900 0-5.400-2-6.300-4.600H2.100v2.800A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.700 14.100a6.600 6.600 0 0 1 0-4.200V7.100H2.100a11 11 0 0 0 0 9.800z" />
      <path fill="#EA4335" d="M12 5.400c1.600 0 3.100.600 4.200 1.600l3.100-3.100A11 11 0 0 0 2.100 7.100l3.600 2.800C6.600 7.300 9.100 5.400 12 5.400z" />
    </svg>
  );
}
