import { EventEmitter } from 'events';
import mongoose from 'mongoose';
import { IAuditLog, AuditLogSchema } from '../models/AuditLog.js';

// Audit event emitter for centralized logging
class AuditLogger extends EventEmitter {
    private static instance: AuditLogger;
    private buffer: Map<string, any> = new Map();
    private flushInterval: number = 5000; // Flush every 5 seconds
    private timer: NodeJS.Timeout | null = null;

    private constructor() {
        super();
        this.startFlushTimer();
    }

    static getInstance(): AuditLogger {
        if (!AuditLogger.instance) {
            AuditLogger.instance = new AuditLogger();
        }
        return AuditLogger.instance;
    }

    private startFlushTimer(): void {
        this.timer = setInterval(() => {
            this.flush().catch(console.error);
        }, this.flushInterval);
    }

    /**
     * Log an audit event (non-blocking, buffered)
     */
    log(data: {
        userId: string | mongoose.Types.ObjectId;
        userRole: 'patient' | 'doctor' | 'admin';
        userName: string;
        action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'video_call';
        resource: 'patient' | 'appointment' | 'prescription' | 'vital' | 'medical_record' | 'video' | 'auth' | 'inventory';
        resourceId?: string | mongoose.Types.ObjectId;
        details?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
        success?: boolean;
        errorMessage?: string;
    }): void {
        // Emit event for listeners (e.g., real-time alerts, external logging)
        this.emit('audit', data);

        // Fire and forget to database
        setImmediate(async () => {
            try {
                const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
                const log = new AuditLog({
                    userId: new mongoose.Types.ObjectId(data.userId),
                    userRole: data.userRole,
                    userName: data.userName,
                    action: data.action,
                    resource: data.resource,
                    resourceId: data.resourceId ? new mongoose.Types.ObjectId(data.resourceId) : undefined,
                    details: data.details,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    metadata: data.metadata,
                    success: data.success ?? true,
                    errorMessage: data.errorMessage,
                    timestamp: new Date(),
                });
                await log.save();
            } catch (error) {
                console.error('Failed to create audit log:', error);
            }
        });
    }

    /**
     * Log with promise (for when you need to ensure it's logged)
     */
    async logAsync(data: {
        userId: string | mongoose.Types.ObjectId;
        userRole: 'patient' | 'doctor' | 'admin';
        userName: string;
        action: IAuditLog['action'];
        resource: IAuditLog['resource'];
        resourceId?: string | mongoose.Types.ObjectId;
        details?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
        success?: boolean;
        errorMessage?: string;
    }): Promise<void> {
        const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
        const log = new AuditLog({
            userId: new mongoose.Types.ObjectId(data.userId),
            userRole: data.userRole,
            userName: data.userName,
            action: data.action,
            resource: data.resource,
            resourceId: data.resourceId ? new mongoose.Types.ObjectId(data.resourceId) : undefined,
            details: data.details,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            metadata: data.metadata,
            success: data.success ?? true,
            errorMessage: data.errorMessage,
            timestamp: new Date(),
        });
        await log.save();
    }

    /**
     * Batch flush (for high-throughput scenarios)
     */
    private async flush(): Promise<void> {
        // Could implement batch writing here for high-volume scenarios
        // For now, individual writes are fast enough
    }

    /**
     * Add event listener for real-time audit events
     */
    onAudit(callback: (data: any) => void): void {
        this.on('audit', callback);
    }

    /**
     * Remove event listener
     */
    offAudit(callback: (data: any) => void): void {
        this.off('audit', callback);
    }

    /**
     * Cleanup on shutdown
     */
    shutdown(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Export helper function for easy use
export const logAudit = (
    userId: string | mongoose.Types.ObjectId,
    userRole: 'patient' | 'doctor' | 'admin',
    userName: string,
    action: IAuditLog['action'],
    resource: IAuditLog['resource'],
    options?: {
        resourceId?: string | mongoose.Types.ObjectId;
        details?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
        success?: boolean;
        errorMessage?: string;
    }
): void => {
    auditLogger.log({
        userId,
        userRole,
        userName,
        action,
        resource,
        ...options,
    });
};
