import mongoose, { Schema, Document } from 'mongoose';

export interface IConsent extends Document {
    patient: mongoose.Types.ObjectId;
    type: 'treatment' | 'privacy' | 'data_sharing' | 'video_call' | 'research';
    status: 'granted' | 'revoked' | 'pending';
    grantedAt?: Date;
    revokedAt?: Date;
    expiresAt?: Date;
    version: string;
    ipAddress?: string;
    userAgent?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ConsentSchema = new Schema<IConsent>({
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['treatment', 'privacy', 'data_sharing', 'video_call', 'research'],
        required: true,
    },
    status: {
        type: String,
        enum: ['granted', 'revoked', 'pending'],
        default: 'pending',
    },
    grantedAt: {
        type: Date,
    },
    revokedAt: {
        type: Date,
    },
    expiresAt: {
        type: Date,
    },
    version: {
        type: String,
        required: true,
        default: '1.0',
    },
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
    notes: {
        type: String,
    },
}, {
    timestamps: true,
});

// Index for efficient queries
ConsentSchema.index({ patient: 1, type: 1 }, { unique: true });
ConsentSchema.index({ status: 1, expiresAt: 1 });

export const Consent = mongoose.model<IConsent>('Consent', ConsentSchema);

// Default consent types with descriptions
export const CONSENT_TYPES = {
    treatment: {
        name: 'Treatment Consent',
        description: 'Consent to receive medical treatment and care',
        required: true,
        version: '1.0',
    },
    privacy: {
        name: 'Privacy Policy',
        description: 'Acknowledgment of privacy practices and data handling',
        required: true,
        version: '1.0',
    },
    data_sharing: {
        name: 'Data Sharing',
        description: 'Consent to share medical records with other healthcare providers',
        required: false,
        version: '1.0',
    },
    video_call: {
        name: 'Video Consultation',
        description: 'Consent to participate in video consultations',
        required: true,
        version: '1.0',
    },
    research: {
        name: 'Research Participation',
        description: 'Consent to participate in medical research studies',
        required: false,
        version: '1.0',
    },
} as const;

// Helper to check if patient has granted consent
export const hasConsent = async (
    patientId: string | mongoose.Types.ObjectId,
    consentType: IConsent['type']
): Promise<boolean> => {
    const consent = await Consent.findOne({
        patient: patientId,
        type: consentType,
        status: 'granted',
    });

    if (!consent) return false;

    // Check if expired
    if (consent.expiresAt && consent.expiresAt < new Date()) {
        return false;
    }

    return true;
};

// Helper to grant consent
export const grantConsent = async (
    patientId: string | mongoose.Types.ObjectId,
    consentType: IConsent['type'],
    options?: {
        version?: string;
        expiresAt?: Date;
        ipAddress?: string;
        userAgent?: string;
        notes?: string;
    }
): Promise<IConsent> => {
    const consentInfo = CONSENT_TYPES[consentType];

    const consent = await Consent.findOneAndUpdate(
        { patient: patientId, type: consentType },
        {
            $set: {
                status: 'granted',
                grantedAt: new Date(),
                version: options?.version || consentInfo.version,
                expiresAt: options?.expiresAt,
                ipAddress: options?.ipAddress,
                userAgent: options?.userAgent,
                notes: options?.notes,
            },
        },
        { upsert: true, new: true }
    );

    return consent!;
};

// Helper to revoke consent
export const revokeConsent = async (
    patientId: string | mongoose.Types.ObjectId,
    consentType: IConsent['type'],
    options?: {
        notes?: string;
    }
): Promise<IConsent> => {
    const consent = await Consent.findOneAndUpdate(
        { patient: patientId, type: consentType },
        {
            $set: {
                status: 'revoked',
                revokedAt: new Date(),
                notes: options?.notes,
            },
        },
        { new: true }
    );

    return consent!;
};
