import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const AdminOnly = () => SetMetadata(ROLES_KEY, [UserRole.ADMIN]);
export const AdminOrManager = () => SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.MANAGER]);
