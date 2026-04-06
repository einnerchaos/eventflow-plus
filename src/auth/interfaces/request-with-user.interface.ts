import { User, UserRole } from '@prisma/client';

export interface RequestWithUser {
  user: User;
  sourceId?: string;
}

export interface JwtUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}
