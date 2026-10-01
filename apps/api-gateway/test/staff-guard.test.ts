import { describe, expect, it } from 'vitest';
import type { DecodedIdToken } from '@blog/firebase';
import { StaffGuard, StaffGuardError, type StaffTool } from '../src/staff/staff-guard';

const staff_id = '018f3c2a-7b10-7c3e-8f21-000000000001';

function token(second_factor: string | null): DecodedIdToken {
  return {
    uid: 'firebase-staff',
    firebase: second_factor ? { sign_in_second_factor: second_factor } : {},
  };
}

function guard(role: string, tools: StaffTool[] = []) {
  return new StaffGuard(
    async () => token(role === 'user' ? null : 'phone'),
    {
      async findByFirebaseUid() {
        return { id: staff_id, role };
      },
    },
    {
      async run(tool) {
        tools.push(tool);
      },
    },
  );
}

describe('staff second factor', () => {
  it('refuses a user and returns no admin payload', async () => {
    const tools: StaffTool[] = [];
    const access = guard('user', tools);

    await expect(access.me({ token: 'public', now_ms: 0 })).rejects.toMatchObject({
      code: 'STAFF_FORBIDDEN',
    });
    await expect(access.use({ token: 'public', now_ms: 0, tool: 'hide' })).rejects.toBeInstanceOf(
      StaffGuardError,
    );
    expect(tools).toEqual([]);
  });

  it('blocks staff tools until the second factor is confirmed', async () => {
    const tools: StaffTool[] = [];
    const access = new StaffGuard(
      async () => token(null),
      { async findByFirebaseUid() { return { id: staff_id, role: 'moderator' }; } },
      { async run(tool) { tools.push(tool); } },
    );

    await expect(access.use({ token: 'staff', now_ms: 0, tool: 'hide' })).rejects.toMatchObject({
      code: 'STAFF_MFA_REQUIRED',
    });
    await expect(access.use({ token: 'staff', now_ms: 0, tool: 'block' })).rejects.toMatchObject({
      code: 'STAFF_MFA_REQUIRED',
    });
    expect(tools).toEqual([]);
  });

  it('requires sign-in again after 30 idle minutes', async () => {
    const access = guard('administrator');
    await access.me({ token: 'staff', now_ms: 0 });

    await expect(access.me({ token: 'staff', now_ms: 30 * 60 * 1000 + 1 })).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
    });
  });
});
