import { describe, expect, it } from 'vitest';
import { AVATAR_REQUIRED, NICKNAME_REQUIRED, validateNewProfile } from './profileValidation';

describe('validateNewProfile', () => {
  it('rejects an empty nickname', () => {
    expect(validateNewProfile('', 'avatar-1')).toEqual({
      ok: false,
      errors: { nickname: NICKNAME_REQUIRED },
    });
  });

  it('rejects a whitespace-only nickname', () => {
    expect(validateNewProfile('   ', 'avatar-1')).toEqual({
      ok: false,
      errors: { nickname: NICKNAME_REQUIRED },
    });
  });

  it('rejects a missing avatar', () => {
    expect(validateNewProfile('נועה', null)).toEqual({
      ok: false,
      errors: { avatar: AVATAR_REQUIRED },
    });
  });

  it('rejects an avatar that is not built in', () => {
    expect(validateNewProfile('נועה', 'avatar-9')).toEqual({
      ok: false,
      errors: { avatar: AVATAR_REQUIRED },
    });
  });

  it('reports both errors together', () => {
    expect(validateNewProfile('', null)).toEqual({
      ok: false,
      errors: { nickname: NICKNAME_REQUIRED, avatar: AVATAR_REQUIRED },
    });
  });

  it('accepts valid input and trims the nickname', () => {
    expect(validateNewProfile('  דני ', 'avatar-2')).toEqual({
      ok: true,
      value: { nickname: 'דני', avatarId: 'avatar-2' },
    });
  });
});
