import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import {
    generatePatientSummary,
    generateMedicalHistoryReport,
    generateAppointmentReport,
    generatePrescriptionReport,
    exportPatientData,
} from '../controllers/reporting.controller.js';

const router = Router();

// Patient routes
router.get('/patient/summary', authenticate, generatePatientSummary);
router.get('/patient/export', authenticate, requirePermission('patient:read:own'), exportPatientData);

// Doctor routes
router.get(
    '/patient/:patientId/history',
    authenticate,
    requirePermission('patient:read:all'),
    generateMedicalHistoryReport
);
router.get('/appointments', authenticate, requirePermission('appointment:read:all'), generateAppointmentReport);
router.get('/prescriptions', authenticate, requirePermission('prescription:read:all'), generatePrescriptionReport);

export default router;
