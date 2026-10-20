import { useId, useRef, useState, type FormEvent } from 'react';
import { AVATARS, type AvatarId } from '../domain/avatars';
import { NICKNAME_MAX_LENGTH, type Profile } from '../domain/profile';
import { validateNewProfile } from '../domain/profileValidation';
import type { Result } from '../persistence/profileRepository';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { TextField } from './TextField';
import styles from './NewProfileForm.module.css';

export const SAVE_FAILED = 'לא הצלחנו לשמור את הפרופיל במכשיר. אפשר לנסות שוב.';

export function NewProfileForm({
  onCreate,
  onCreated,
  autoFocus = false,
}: {
  onCreate: (input: { nickname: string; avatarId: AvatarId }) => Promise<Result<Profile>>;
  onCreated: (profile: Profile) => void;
  /** Focus the nickname field on mount (when the form was opened on request). */
  autoFocus?: boolean;
}) {
  const ids = useId();
  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [errors, setErrors] = useState<{ nickname?: string; avatar?: string }>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  // Synchronous guard so a fast double click cannot start two writes before the next render.
  const savingRef = useRef(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current) return;
    setSaveFailed(false);
    const validation = validateNewProfile(nickname, avatarId);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    savingRef.current = true;
    setSaving(true);
    const result = await onCreate(validation.value);
    savingRef.current = false;
    setSaving(false);
    if (result.ok) {
      setNickname('');
      setAvatarId(null);
      onCreated(result.value);
    } else {
      setSaveFailed(true);
    }
  }

  const nicknameErrorId = `${ids}-nickname-error`;
  const avatarErrorId = `${ids}-avatar-error`;

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate aria-labelledby={`${ids}-title`}>
      <h2 id={`${ids}-title`} className={styles.title}>
        פרופיל חדש
      </h2>

      <div>
        <TextField
          label="כינוי"
          className={styles.nicknameField}
          value={nickname}
          maxLength={NICKNAME_MAX_LENGTH}
          autoComplete="off"
          autoFocus={autoFocus}
          onChange={(e) => setNickname(e.target.value)}
          aria-invalid={errors.nickname ? true : undefined}
          aria-describedby={errors.nickname ? nicknameErrorId : undefined}
        />
        {errors.nickname && (
          <p id={nicknameErrorId} className={styles.error}>
            {errors.nickname}
          </p>
        )}
      </div>

      <fieldset
        className={styles.avatars}
        aria-describedby={errors.avatar ? avatarErrorId : undefined}
      >
        <legend className={styles.legend}>בחירת אווטאר</legend>
        <div className={styles.avatarRow}>
          {AVATARS.map((avatar) => (
            <label key={avatar.id} className={styles.avatarOption}>
              <input
                type="radio"
                name={`${ids}-avatar`}
                value={avatar.id}
                className="visually-hidden"
                checked={avatarId === avatar.id}
                onChange={() => setAvatarId(avatar.id)}
              />
              <Avatar avatarId={avatar.id} size={72} />
            </label>
          ))}
        </div>
        {errors.avatar && (
          <p id={avatarErrorId} className={styles.error}>
            {errors.avatar}
          </p>
        )}
      </fieldset>

      <Button type="submit" variant="secondary" disabled={saving}>
        יצירת פרופיל
      </Button>

      {saveFailed && (
        <p role="alert" className={styles.error}>
          {SAVE_FAILED}
        </p>
      )}
    </form>
  );
}
