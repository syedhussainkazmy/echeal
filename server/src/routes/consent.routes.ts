import { Router, Request, Response } from 'express';
import {
    getConsentTypes,
    getPatientConsents,
    grantPatientConsent,
    revokePatientConsent,
} from '../controllers/consent.controller.js';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware.js';

const router = Router();

// Public route - get all consent types
router.get('/types', (req: Request, res: Response) => getConsentTypes(req as any, res));

// Protected routes - patient consent management
router.get('/', authenticate, (req: AuthRequest, res: Response) => getPatientConsents(req, res));
router.post('/grant', authenticate, (req: AuthRequest, res: Response) => grantPatientConsent(req, res));
router.post('/revoke', authenticate, (req: AuthRequest, res: Response) => revokePatientConsent(req, res));

export default router;
