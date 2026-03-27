import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware.js';
import {
    checkLLMStatus,
    analyzeSymptoms,
    generateClinicalNotes,
    healthChat,
    triageAppointment,
    generatePrescriptionSummary,
} from '../controllers/llm.controller.js';

const router = Router();

// Public route - check LLM status
router.get('/status', (req: Request, res: Response) => checkLLMStatus(req as AuthRequest, res));

// Protected routes - require authentication
router.post('/symptoms', authenticate, (req: AuthRequest, res: Response) => analyzeSymptoms(req, res));
router.post('/scribe', authenticate, (req: AuthRequest, res: Response) => generateClinicalNotes(req, res));
router.post('/chat', authenticate, (req: AuthRequest, res: Response) => healthChat(req, res));
router.post('/triage', authenticate, (req: AuthRequest, res: Response) => triageAppointment(req, res));
router.post('/prescriptions/summary', authenticate, (req: AuthRequest, res: Response) => generatePrescriptionSummary(req, res));

export default router;
