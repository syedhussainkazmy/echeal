import { Request, Response, NextFunction } from 'express';
import { createAuditLog } from '../models/AuditLog.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: 'patient' | 'doctor' | 'admin';
        firstName: string;
        lastName: string;
    };
}

// Type for audit action
type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'video_call';
type AuditResource = 'patient' | 'appointment' | 'prescription' | 'vital' | 'medical_record' | 'video' | 'auth' | 'inventory';

// Helper to get client IP
const getClientIp = (req: Request): string => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || 'unknown';
};

// Helper to get user agent
const getUserAgent = (req: Request): string => {
    return req.headers['user-agent'] || 'unknown';
};

// Helper to get user full name
const getUserName = (user: AuthRequest['user']): string => {
    if (!user) return 'Unknown';
    return `${user.firstName} ${user.lastName}`;
};

// Middleware to auto-log specific actions
export const auditMiddleware = (resource: AuditResource, action: AuditAction) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json to log after successful response
        (res as any).json = (body: any) => {
            // Only log if user is authenticated and request was successful
            if (req.user && res.statusCode >= 200 && res.statusCode < 400) {
                const resourceId = req.params.id || req.params.appointmentId || req.params.prescriptionId;
                const details = `${action.toUpperCase()} ${resource} - ${req.method} ${req.originalUrl}`;

                createAuditLog(
                    req.user.id,
                    req.user.role,
                    getUserName(req.user),
                    action,
                    resource,
                    {
                        resourceId,
                        details,
                        ipAddress: getClientIp(req),
                        userAgent: getUserAgent(req),
                        metadata: {
                            method: req.method,
                            path: req.originalUrl,
                            statusCode: res.statusCode,
                        },
                        success: res.statusCode >= 200 && res.statusCode < 400,
                    }
                );
            }

            return originalJson(body);
        };

        next();
    };
};

// Manual audit log function for use in controllers
export const logAudit = async (
    req: AuthRequest,
    action: AuditAction,
    resource: AuditResource,
    options?: {
        resourceId?: string;
        details?: string;
        success?: boolean;
        errorMessage?: string;
        metadata?: Record<string, any>;
    }
) => {
    if (req.user) {
        createAuditLog(
            req.user.id,
            req.user.role,
            getUserName(req.user),
            action,
            resource,
            {
                resourceId: options?.resourceId,
                details: options?.details,
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
                success: options?.success ?? true,
                errorMessage: options?.errorMessage,
                metadata: options?.metadata,
            }
        );
    }
};
