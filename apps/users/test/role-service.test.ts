import { describe, expect, it } from 'vitest';
import { MemoryRoleStore } from '../src/role/memory-role-store';
import { RoleService } from '../src/role/role-service';

const admin_id = '018f3c2a-7b10-7c3e-8f21-000000000001';
const other_admin_id = '018f3c2a-7b10-7c3e-8f21-0000000000a2';
const user_id = '018f3c2a-7b10-7c3e-8f21-0000000000b1';

function storeWithStaff(): MemoryRoleStore {
  const store = new MemoryRoleStore();
  store.users.push(
    { id: admin_id, firebase_uid: 'seed-admin', role: 'administrator' },
    { id: other_admin_id, firebase_uid: 'other-admin', role: 'administrator' },
    { id: user_id, firebase_uid: 'member', role: 'user' },
  );
  return store;
}

describe('role assignment', () => {
  it('refuses a role change that has no reason and leaves the role', async () => {
    const store = storeWithStaff();
    const roles = new RoleService(store);

    await expect(
      roles.assignRole({
        actor_firebase_uid: 'seed-admin',
        user_id,
        role: 'moderator',
        reason: '   ',
      }),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });

    expect(store.users.find((user) => user.id === user_id)?.role).toBe('user');
    expect(store.audits).toHaveLength(0);
  });

  it('replaces the previous role with exactly one new role', async () => {
    const store = storeWithStaff();
    const roles = new RoleService(store);

    const moderator = await roles.assignRole({
      actor_firebase_uid: 'seed-admin',
      user_id,
      role: 'moderator',
      reason: 'Staff rotation',
    });
    expect(moderator).toEqual({ id: user_id, role: 'moderator' });

    const administrator = await roles.assignRole({
      actor_firebase_uid: 'seed-admin',
      user_id,
      role: 'administrator',
      reason: 'Second administrator',
    });
    expect(administrator.role).toBe('administrator');

    const demoted = await roles.assignRole({
      actor_firebase_uid: 'seed-admin',
      user_id: other_admin_id,
      role: 'user',
      reason: 'Leave staff',
    });
    expect(demoted.role).toBe('user');
    expect(store.users.map((user) => user.role).sort()).toEqual([
      'administrator',
      'administrator',
      'user',
    ]);
    expect(store.audits.map((entry) => entry.action)).toEqual([
      'user.role.change',
      'user.role.change',
      'user.role.change',
    ]);
    expect(store.audits[0]).toMatchObject({
      actor_id: admin_id,
      entity_type: 'user',
      entity_id: user_id,
      reason: 'Staff rotation',
      before_state: { role: 'user' },
      after_state: { role: 'moderator' },
    });
  });

  it('keeps the last administrator', async () => {
    const store = new MemoryRoleStore();
    store.users.push({ id: admin_id, firebase_uid: 'seed-admin', role: 'administrator' });
    const roles = new RoleService(store);

    await expect(
      roles.assignRole({
        actor_firebase_uid: 'seed-admin',
        user_id: admin_id,
        role: 'user',
        reason: 'Step down',
      }),
    ).rejects.toMatchObject({ code: 'LAST_ADMINISTRATOR' });

    expect(store.users[0]?.role).toBe('administrator');
    expect(store.audits).toHaveLength(0);
  });

  it('does not create the first administrator from the panel', async () => {
    const store = new MemoryRoleStore();
    const roles = new RoleService(store);

    await expect(
      roles.assignRole({
        actor_firebase_uid: 'new-person',
        user_id: '018f3c2a-7b10-7c3e-8f21-0000000000c1',
        role: 'administrator',
        reason: 'Make me admin',
      }),
    ).rejects.toMatchObject({ code: 'FIRST_ADMINISTRATOR_FORBIDDEN' });

    expect(store.users).toHaveLength(0);
    expect(store.audits).toHaveLength(0);
  });

  it('refuses a moderator', async () => {
    const store = storeWithStaff();
    store.users.push({
      id: '018f3c2a-7b10-7c3e-8f21-0000000000d1',
      firebase_uid: 'moderator',
      role: 'moderator',
    });
    const roles = new RoleService(store);

    await expect(
      roles.assignRole({
        actor_firebase_uid: 'moderator',
        user_id,
        role: 'administrator',
        reason: 'Promote',
      }),
    ).rejects.toMatchObject({ code: 'ADMIN_ONLY' });
    expect(store.users.find((user) => user.id === user_id)?.role).toBe('user');
  });
});
