import { Request, Response, NextFunction } from "express";
import { AppError } from "./appError";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    permissions: string[];
  };
  tenantId?: string;
}

// Role-based permissions mapping
const rolePermissions: Record<string, string[]> = {
  admin: [
    "bikes:create",
    "bikes:read",
    "bikes:update",
    "bikes:delete",
    "riders:create",
    "riders:read",
    "riders:update",
    "riders:delete",
    "rentals:create",
    "rentals:read",
    "rentals:update",
    "rentals:delete",
    "maintenance:create",
    "maintenance:read",
    "maintenance:update",
    "maintenance:delete",
    "users:manage",
    "reports:view",
    "analytics:view",
    "settings:manage",
  ],
  manager: [
    "bikes:create",
    "bikes:read",
    "bikes:update",
    "riders:create",
    "riders:read",
    "riders:update",
    "rentals:create",
    "rentals:read",
    "rentals:update",
    "maintenance:create",
    "maintenance:read",
    "maintenance:update",
    "reports:view",
    "analytics:view",
  ],
  staff: [
    "bikes:read",
    "bikes:update",
    "riders:read",
    "rentals:create",
    "rentals:read",
    "rentals:update",
    "maintenance:read",
  ],
  rider: ["bikes:read", "rentals:read", "rentals:create"],
};

/**
 * Authenticate middleware - verifies JWT token and attaches user to request
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Token tidak ditemukan", 401, "UNAUTHORIZED");
    }

    const token = authHeader.substring(7);

    // In production, verify JWT token here
    // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    // req.user = decoded;

    // Mock user for development
    req.user = {
      id: "user-1",
      email: "admin@company.com",
      name: "Admin User",
      role: "admin",
      tenantId: "tenant-1",
      permissions: rolePermissions["admin"],
    };

    req.tenantId = req.user.tenantId;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Token tidak valid", 401, "INVALID_TOKEN");
  }
};

/**
 * Authorization middleware - checks if user has required role
 */
export const authorize =
  (...allowedRoles: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError("User tidak terautentikasi", 401, "UNAUTHORIZED");
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(
          "Anda tidak memiliki akses ke resource ini",
          403,
          "FORBIDDEN"
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Kesalahan otorisasi", 403, "FORBIDDEN");
    }
  };

/**
 * Permission-based middleware - checks if user has specific permission
 */
export const permission =
  (...requiredPermissions: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError("User tidak terautentikasi", 401, "UNAUTHORIZED");
      }

      const userPermissions = req.user.permissions || [];
      const hasPermission = requiredPermissions.some((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasPermission) {
        throw new AppError(
          "Anda tidak memiliki izin untuk melakukan aksi ini",
          403,
          "INSUFFICIENT_PERMISSION"
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Kesalahan izin", 403, "FORBIDDEN");
    }
  };

/**
 * Tenant isolation middleware - ensures user can only access their tenant's data
 */
export const tenantMiddleware =
  (paramName: string = "tenantId") =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError("User tidak terautentikasi", 401, "UNAUTHORIZED");
      }

      const requestedTenantId =
        req.params[paramName] || req.query.tenantId || req.body.tenantId;

      if (
        requestedTenantId &&
        requestedTenantId !== req.user.tenantId &&
        req.user.role !== "admin"
      ) {
        throw new AppError(
          "Anda tidak dapat mengakses tenant ini",
          403,
          "TENANT_FORBIDDEN"
        );
      }

      // Ensure tenantId is set for scoped queries
      req.tenantId = req.user.tenantId;

      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Kesalahan tenant validation", 403, "FORBIDDEN");
    }
  };

/**
 * Get permissions for a specific role
 */
export const getPermissionsForRole = (role: string): string[] => {
  return rolePermissions[role] || [];
};

/**
 * Check if user has permission
 */
export const hasPermission = (
  userPermissions: string[],
  requiredPermission: string
): boolean => {
  return userPermissions.includes(requiredPermission);
};

/**
 * Check if user has any of the permissions
 */
export const hasAnyPermission = (
  userPermissions: string[],
  requiredPermissions: string[]
): boolean => {
  return requiredPermissions.some((perm) => userPermissions.includes(perm));
};

/**
 * Check if user has all of the permissions
 */
export const hasAllPermissions = (
  userPermissions: string[],
  requiredPermissions: string[]
): boolean => {
  return requiredPermissions.every((perm) => userPermissions.includes(perm));
};