import { TokenRejected, verifyAccessToken, type TokenVerifier } from '@blog/firebase';

export type StaffRole = 'moderator' | 'administrator';

export type StaffMember = {
  id: string;
  role: string;
};

export interface StaffDirectory {
  findByFirebaseUid(firebase_uid: string): Promise<StaffMember | null>;
}

export type StaffTool = 'hide' | 'block' | 'category' | 'role' | 'dismiss' | 'soft_remove';

export interface StaffTools {
  run(tool: StaffTool, actor_id: string): Promise<void>;
}

const idle_ms = 30 * 60 * 1000;

const status_by_code = {
  AUTH_REQUIRED: 401,
  STAFF_MFA_REQUIRED: 403,
  STAFF_FORBIDDEN: 403,
} as const;

export class StaffGuardError extends Error {
  readonly status_code: number;

  constructor(readonly code: keyof typeof status_by_code) {
    super(code);
    this.status_code = status_by_code[code];
  }
}

export class StaffGuard {
  private readonly last_seen = new Map<string, number>();

  constructor(
    private readonly verify: TokenVerifier,
    private readonly directory: StaffDirectory,
    private readonly tools: StaffTools,
  ) {}

  async me(input: { token?: string; now_ms: number }): Promise<{ id: string; role: StaffRole }> {
    return this.admit(input);
  }

  async use(input: { token?: string; now_ms: number; tool: StaffTool }): Promise<void> {
    const staff = await this.admit(input);
    await this.tools.run(input.tool, staff.id);
  }

  private async admit(input: { token?: string; now_ms: number }): Promise<{ id: string; role: StaffRole }> {
    let access: { firebase_uid: string; second_factor: string | null };
    try {
      access = await verifyAccessToken(input.token, this.verify);
    } catch (error) {
      if (error instanceof TokenRejected) {
        throw new StaffGuardError('AUTH_REQUIRED');
      }
      throw error;
    }
    const member = await this.directory.findByFirebaseUid(access.firebase_uid);
    if (!member || (member.role !== 'moderator' && member.role !== 'administrator')) {
      throw new StaffGuardError('STAFF_FORBIDDEN');
    }
    if (!access.second_factor) {
      throw new StaffGuardError('STAFF_MFA_REQUIRED');
    }
    const previous = this.last_seen.get(member.id);
    if (previous !== undefined && input.now_ms - previous > idle_ms) {
      this.last_seen.delete(member.id);
      throw new StaffGuardError('AUTH_REQUIRED');
    }
    this.last_seen.set(member.id, input.now_ms);
    return { id: member.id, role: member.role };
  }
}
