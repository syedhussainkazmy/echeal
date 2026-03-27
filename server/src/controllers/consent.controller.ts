import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { Consent, CONSENT_TYPES, hasConsent, grantConsent, revokeConsent } from '../models/Consent.js';
import { createAuditLog } from '../models/AuditLog.js';

// Helper to get user full name
const getUserName = (user: AuthRequest['user']): string => {
    if (!user) return 'Unknown';
    return `${user.firstName} ${user.lastName}`;
};

// Get all consent types (public - for displaying consent forms)
export const getConsentTypes = async (req: Request, res: Response) => {
    try {
        const consents = Object.entries(CONSENT_TYPES).map(([key, value]) => ({
            type: key,
            ...value,
        }));
        res.status(200).json(consents);
    } catch (error) {
        console.error('Error fetching consent types:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get patient's consent status
export const getPatientConsents = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;

        const consents = await Consent.find({ patient: patientId });
        const consentStatus = Object.keys(CONSENT_TYPES).map((type) => {
            const patientConsent = consents.find((c) => c.type === type);
            return {
                type,
                ...CONSENT_TYPES[type as keyof typeof CONSENT_TYPES],
                status: patientConsent?.status || 'pending',
                grantedAt: patientConsent?.grantedAt,
                revokedAt: patientConsent?.revokedAt,
                version: patientConsent?.version,
            };
        });

        // Check if all required consents are granted
        const requiredConsents = consentStatus.filter((c) => c.required);
        const allRequiredGranted = requiredConsents.every((c) => c.status === 'granted');

        res.status(200).json({
            consents: consentStatus,
            allRequiredGranted,
        });
    } catch (error) {
        console.error('Error fetching patient consents:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Grant consent
export const grantPatientConsent = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { type, version, expiresInDays } = req.body;

        // Validate consent type
        if (!CONSENT_TYPES[type as keyof typeof CONSENT_TYPES]) {
            return res.status(400).json({ message: 'Invalid consent type' });
        }

        // Check if already granted
        const alreadyGranted = await hasConsent(patientId!, type);
        if (alreadyGranted) {
            return res.status(400).json({ message: 'Consent already granted' });
        }

        // Calculate expiration date if specified
        let expiresAt;
        if (expiresInDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        }

        const consent = await grantConsent(patientId!, type, {
            version,
            expiresAt,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
        });

        // Audit log
        createAuditLog(
            patientId!.toString(),
            req.user!.role,
            getUserName(req.user),
            'create',
            'patient',
            {
                resourceId: patientId,
                details: `Granted consent: ${type}`,
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            message: 'Consent granted successfully',
            consent,
        });
    } catch (error) {
        console.error('Error granting consent:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Revoke consent
export const revokePatientConsent = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { type, notes } = req.body;

        // Check if required consent
        if (CONSENT_TYPES[type as keyof typeof CONSENT_TYPES]?.required) {
            return res.status(400).json({
                message: 'Cannot revoke required consent. Please contact support.',
            });
        }

        const consent = await revokeConsent(patientId!, type, { notes });

        // Audit log
        createAuditLog(
            patientId!.toString(),
            req.user!.role,
            getUserName(req.user),
            'update',
            'patient',
            {
                resourceId: patientId,
                details: `Revoked consent: ${type}`,
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            message: 'Consent revoked successfully',
            consent,
        });
    } catch (error) {
        console.error('Error revoking consent:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Check specific consent (for use in other controllers)
export const checkConsent = async (
    patientId: string,
    consentType: 'treatment' | 'privacy' | 'data_sharing' | 'video_call' | 'research'
): Promise<boolean> => {
    return hasConsent(patientId, consentType);
};
