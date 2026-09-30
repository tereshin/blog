import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import { errorEnvelope } from '@blog/contracts';
import { RoleError } from '../role/role-error';
import { ProfileError } from './profile-error';

type StatusReply = {
  status: (code: number) => { send: (body: unknown) => void };
};

@Catch(ProfileError, RoleError)
export class ProfileExceptionFilter implements ExceptionFilter {
  catch(error: ProfileError | RoleError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<StatusReply>();
    response.status(error.status_code).send(errorEnvelope(error.code));
  }
}
