import { useMessages } from '../../i18n/messages';
import { MIN_PASSWORD_LENGTH, PASSWORD_REQUIREMENTS } from './config';
import { passwordRequirements } from './validateAuth';

/** What a new password needs, each item marked as soon as the typed password meets it (ADR-55). */
export function PasswordRequirements({ id, password }: { readonly id: string; readonly password: string }): React.JSX.Element {
  const copy = useMessages().account.auth.passwordRequirements;
  const met = passwordRequirements(password);
  return (
    <div id={id} className="password-requirements" data-empty={password === ''}>
      <p className="field-hint">{copy.title}</p>
      <ul>
        {PASSWORD_REQUIREMENTS.map((requirement) => (
          <li key={requirement} data-met={met[requirement]}>
            {requirement === 'length' ? copy.length(MIN_PASSWORD_LENGTH) : copy[requirement]}
            <span className="visually-hidden">{`, ${met[requirement] ? copy.met : copy.missing}`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
