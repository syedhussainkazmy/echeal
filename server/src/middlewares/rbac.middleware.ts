import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';

// Permission types
export type Permission =
    // Patient permissions
    | 'patient:read:own'
    | 'patient:update:own'
    | 'patient:vitals:read:own'
    | 'patient:vitals:write:own'
    | 'patient:appointments:read:own'
    | 'patient:appointments:write:own'
    | 'patient:prescriptions:read:own'
    | 'patient:medical_records:read:own'
    // Doctor permissions
    | 'patient:read:all'
    | 'patient:vitals:read:all'
    | 'patient:vitals:write:all'
    | 'patient:appointments:read:all'
    | 'patient:appointments:write:all'
    | 'patient:prescriptions:read:all'
    | 'patient:prescriptions:write:all'
    | 'patient:medical_records:read:all'
    | 'patient:medical_records:write:all'
    // Admin permissions
    | 'admin:users:read'
    | 'admin:users:write'
    | 'admin:inventory:read'
    | 'admin:inventory:write'
    | 'admin:appointments:read'
    | 'admin:appointments:write'
    | 'admin:reports:read'
    | 'admin:audit_logs:read'
    // Video permissions
    | 'video:create'
    | 'video:join'
    // Appointment permissions
    | 'appointment:read:own'
    | 'appointment:read:all'
    // Prescription permissions
    | 'prescription:read:own'
    | 'prescription:read:all';

// Role to permissions mapping
const rolePermissions: Record<string, Permission[]> = {
    patient: [
        'patient:read:own',
        'patient:update:own',
        'patient:vitals:read:own',
        'patient:vitals:write:own',
        'patient:appointments:read:own',
        'patient:appointments:write:own',
        'patient:prescriptions:read:own',
        'patient:medical_records:read:own',
        'video:join',
    ],
    doctor: [
        'patient:read:own',
        'patient:update:own',
        'patient:vitals:read:own',
        'patient:vitals:read:all',
        'patient:vitals:write:all',
        'patient:appointments:read:own',
        'patient:appointments:read:all',
        'patient:appointments:write:all',
        'patient:prescriptions:read:own',
        'patient:prescriptions:read:all',
        'patient:prescriptions:write:all',
        'patient:medical_records:read:own',
        'patient:medical_records:read:all',
        'patient:medical_records:write:all',
        'video:create',
        'video:join',
        'appointment:read:own',
        'appointment:read:all',
        'prescription:read:own',
        'prescription:read:all',
    ],
    admin: [
        'patient:read:own',
        'patient:read:all',
        'patient:update:own',
        'patient:vitals:read:own',
        'patient:vitals:read:all',
        'patient:appointments:read:own',
        'patient:appointments:read:all',
        'patient:appointments:write:own',
        'patient:appointments:write:all',
        'patient:prescriptions:read:own',
        'patient:prescriptions:read:all',
        'patient:medical_records:read:own',
        'patient:medical_records:read:all',
        'admin:users:read',
        'admin:users:write',
        'admin:inventory:read',
        'admin:inventory:write',
        'admin:appointments:read',
        'admin:appointments:write',
        'admin:reports:read',
        'admin:audit_logs:read',
        'video:create',
        'video:join',
        'appointment:read:own',
        'appointment:read:all',
        'prescription:read:own',
        'prescription:read:all',
    ],
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: string, permission: Permission): boolean => {
    const permissions = rolePermissions[role] || [];
    return permissions.includes(permission);
};

/**
 * Check if a role has any of the specified permissions
 */
export const hasAnyPermission = (role: string, permissions: Permission[]): boolean => {
    const userPermissions = rolePermissions[role] || [];
    return permissions.some((p) => userPermissions.includes(p));
};

/**
 * Check if a role has all of the specified permissions
 */
export const hasAllPermissions = (role: string, permissions: Permission[]): boolean => {
    const userPermissions = rolePermissions[role] || [];
    return permissions.every((p) => userPermissions.includes(p));
};

/**
 * Middleware factory for checking permissions
 * @param permissions - Single permission or array of permissions
 * @param options - Options like requireAll, resourceCheck
 */
export const requirePermission = (
    permissions: Permission | Permission[],
    options?: {
        requireAll?: boolean; // If true, require ALL permissions. If false, require ANY permission
        resourceOwnerCheck?: boolean; // If true, check if user owns the resource
    }
) => {
    const permissionList = Array.isArray(permissions) ? permissions : [permissions];
    const requireAll = options?.requireAll ?? false;
    const checkResourceOwner = options?.resourceOwnerCheck ?? false;

    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Check permissions
        const hasAccess = requireAll
            ? hasAllPermissions(user.role, permissionList)
            : hasAnyPermission(user.role, permissionList);

        if (!hasAccess) {
            // Log unauthorized access attempt
            console.warn(`User ${user.id} (${user.role}) denied access to ${permissionList.join(', ')}`);

            return res.status(403).json({
                message: 'You do not have permission to perform this action',
                required: permissionList,
                userRole: user.role,
            });
        }

        // Optional: Resource owner check
        if (checkResourceOwner && user.role === 'patient') {
            const resourceId = req.params.id || req.params.patientId;
            if (resourceId && resourceId !== user.id) {
                return res.status(403).json({
                    message: 'You can only access your own resources',
                });
            }
        }

        next();
    };
};

/**
 * Middleware for requiring specific roles
 */
export const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!roles.includes(user.role)) {
            return res.status(403).json({
                message: `Access denied. Required roles: ${roles.join(', ')}`,
                yourRole: user.role,
            });
        }

        next();
    };
};

/**
 * Get all permissions for a role (for UI purposes)
 */
export const getPermissions = (role: string): Permission[] => {
    return rolePermissions[role] || [];
};

/**
 * Check if user can access a specific resource
 */
export const canAccessResource = (
    userRole: string,
    userId: string,
    resourceType: 'patient' | 'appointment' | 'prescription' | 'vital' | 'medical_record',
    resourceOwnerId: string
): boolean => {
    // Admins can access everything
    if (userRole === 'admin') return true;

    // Doctors can access all patients
    if (userRole === 'doctor') {
        const doctorPermissions = rolePermissions[userRole] || [];
        return doctorPermissions.some((p) => p.includes(`${resourceType}:read`));
    }

    // Patients can only access their own resources
    return userId === resourceOwnerId;
};

/**
 * Permission groups for UI (checkboxes, etc.)
 */
export const permissionGroups = {
    patient: {
        label: 'Patient Management',
        permissions: ['patient:read:own', 'patient:read:all', 'patient:update:own'],
    },
    vitals: {
        label: 'Vital Signs',
        permissions: ['patient:vitals:read:own', 'patient:vitals:read:all', 'patient:vitals:write:own', 'patient:vitals:write:all'],
    },
    appointments: {
        label: 'Appointments',
        permissions: ['patient:appointments:read:own', 'patient:appointments:read:all', 'patient:appointments:write:own', 'patient:appointments:write:all'],
    },
    prescriptions: {
        label: 'Prescriptions',
        permissions: ['patient:prescriptions:read:own', 'patient:prescriptions:read:all', 'patient:prescriptions:write:all'],
    },
    medical_records: {
        label: 'Medical Records',
        permissions: ['patient:medical_records:read:own', 'patient:medical_records:read:all', 'patient:medical_records:write:all'],
    },
    admin: {
        label: 'Administration',
        permissions: ['admin:users:read', 'admin:users:write', 'admin:inventory:read', 'admin:inventory:write', 'admin:reports:read', 'admin:audit_logs:read'],
    },
};
