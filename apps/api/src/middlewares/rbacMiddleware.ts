import { Request, Response, NextFunction } from 'express';
import { AppError } from './appError';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  tenantId?: string;
  role?: string;
  permissions?: string[];
}

export type RolePermissionMap = Record<string, string[]>;

export const ROLE_PERMISSIONS: RolePermissionMap = {
  admin: [
    'items:create',
    'items:read',
    'items:update',
    'items:delete',
    'dashboard:view',
    'analytics:view',
    'users:manage',
    'roles:manage',
    'settings:manage',
  ],
  manager: [
    'items:create',
    'items:read',
    'items:update',
    'dashboard:view',
    'analytics:view',
    'reports:view',
  ],
  user: [
    'items:read',
    'dashboard:view',
  ],
  guest: [
    'items:read',
  ],
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.userId;
  const tenantId = req.tenantId;

  if (!userId || !tenantId) {
    throw new AppError('Autentikasi diperlukan', 401, 'AUTH_REQUIRED');
  }

  next();
};

export const requireRole = (...allowedRoles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const userRole = req.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new AppError(
        'Anda tidak memiliki izin untuk mengakses resource ini',
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};

export const requirePermission = (...permissions: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const userPermissions = req.permissions || [];
    const hasPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      throw new AppError(
        'Anda tidak memiliki izin untuk melakukan aksi ini',
        403,
        'PERMISSION_DENIED'
      );
    }

    next();
  };
};

export const tenantMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    throw new AppError('Tenant ID diperlukan', 400, 'TENANT_ID_MISSING');
  }

  req.tenantId = tenantId;
  next();
};

export const rbacMiddleware = (
  rolePermissions: RolePermissionMap = ROLE_PERMISSIONS
) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const role = req.role;

    if (!role) {
      throw new AppError('Role tidak ditemukan', 401, 'ROLE_NOT_FOUND');
    }

    const permissions = rolePermissions[role] || [];
    req.permissions = permissions;

    next();
  };
};

export const checkTenantAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const tenantId = req.tenantId;
  const requestedTenantId = req.headers['x-tenant-id'] as string;

  if (tenantId !== requestedTenantId) {
    throw new AppError(
      'Akses ke tenant ini ditolak',
      403,
      'TENANT_ACCESS_DENIED'
    );
  }

  next();
};