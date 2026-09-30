import { uuidV7 } from '../profile/uuid-v7';
import { RoleError } from './role-error';
import type { RoleName, RoleStore } from './role-store';

export type RoleAssignment = {
  actor_firebase_uid: string;
  user_id: string;
  role: RoleName;
  reason: string;
};

export class RoleService {
  now: () => Date = () => new Date();

  constructor(private readonly store: RoleStore) {}

  async assignRole(input: RoleAssignment): Promise<{ id: string; role: RoleName }> {
    const administrator_count = await this.store.countAdministrators();
    if (administrator_count === 0 && input.role === 'administrator') {
      throw new RoleError('FIRST_ADMINISTRATOR_FORBIDDEN');
    }

    const actor = await this.store.findByFirebaseUid(input.actor_firebase_uid);
    if (!actor || actor.role !== 'administrator') {
      throw new RoleError('ADMIN_ONLY');
    }

    const reason = input.reason.trim();
    if (reason.length === 0) {
      throw new RoleError('REASON_REQUIRED');
    }

    const target = await this.store.findById(input.user_id);
    if (!target) {
      throw new RoleError('USER_NOT_FOUND');
    }

    const removes_last_administrator =
      target.role === 'administrator' &&
      input.role !== 'administrator' &&
      administrator_count === 1;
    if (removes_last_administrator) {
      throw new RoleError('LAST_ADMINISTRATOR');
    }

    const previous_role = target.role;
    await this.store.assignRole(input.user_id, input.role, {
      id: uuidV7(this.now().getTime()),
      actor_id: actor.id,
      action: 'user.role.change',
      entity_type: 'user',
      entity_id: input.user_id,
      reason,
      before_state: { role: previous_role },
      after_state: { role: input.role },
    });

    return { id: input.user_id, role: input.role };
  }
}
