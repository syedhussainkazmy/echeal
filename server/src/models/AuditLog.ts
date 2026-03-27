import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    userId: mongoose.Types.ObjectId;
    userRole: 'patient' | 'doctor' | 'admin';
    userName: string;
    action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'video_call';
    resource: 'patient' | 'appointment' | 'prescription' | 'vital' | 'medical_record' | 'video' | 'auth' | 'inventory';
    resourceId?: mongoose.Types.ObjectId;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
    success: boolean;
    errorMessage?: string;
}

export const AuditLogSchema = new Schema<IAuditLog>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    userRole: {
        type: String,
        enum: ['patient', 'doctor', 'admin'],
        required: true,
    },
    userName: {
        type: String,
        required: true,
    },
    action: {
        type: String,
        enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'video_call'],
        required: true,
    },
    resource: {
        type: String,
        enum: ['patient', 'appointment', 'prescription', 'vital', 'medical_record', 'video', 'auth', 'inventory'],
        required: true,
    },
    resourceId: {
        type: Schema.Types.ObjectId,
        index: true,
    },
    details: {
        type: String,
    },
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
    metadata: {
        type: Schema.Types.Mixed,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    success: {
        type: Boolean,
        default: true,
    },
    errorMessage: {
        type: String,
    },
});

// Indexes for efficient querying
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

// Auto-delete logs older than 7 years (HIPAA requirement: retain for 6 years)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 220752000 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// Helper function to create audit log (fire-and-forget, non-blocking)
export const createAuditLog = (
    userId: mongoose.Types.ObjectId | string,
    userRole: 'patient' | 'doctor' | 'admin',
    userName: string,
    action: IAuditLog['action'],
    resource: IAuditLog['resource'],
    options?: {
        resourceId?: mongoose.Types.ObjectId | string;
        details?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
        success?: boolean;
        errorMessage?: string;
    }
) => {
    // Fire and forget - don't await, don't block the main request
    setImmediate(async () => {
        try {
            const log = new AuditLog({
                userId: new mongoose.Types.ObjectId(userId),
                userRole,
                userName,
                action,
                resource,
                resourceId: options?.resourceId ? new mongoose.Types.ObjectId(options.resourceId) : undefined,
                details: options?.details,
                ipAddress: options?.ipAddress,
                userAgent: options?.userAgent,
                metadata: options?.metadata,
                success: options?.success ?? true,
                errorMessage: options?.errorMessage,
                timestamp: new Date(),
            });
            await log.save();
        } catch (error) {
            console.error('Failed to create audit log:', error);
        }
    });
};
