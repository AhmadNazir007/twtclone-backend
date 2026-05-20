import { Request } from 'express';
import { Role } from '../auth/enum/roles.enum';

export interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    role: Role;
    roles: Role;
  };
}
