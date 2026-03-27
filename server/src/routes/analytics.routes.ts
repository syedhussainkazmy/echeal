import { Router, Request, Response } from 'express';
import {
    authenticate,
    AuthRequest,
} from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import {
    getVitalsWithAlerts,
    getVitalTrends,
    getAlertsSummary,
    getPatientsWithAlerts,
    getPatientVitals,
    getDoctorAnalytics,
    getAdminAnalytics,
} from '../controllers/analytics.controller.js';

const router = Router();

// Patient routes
router.get('/vitals/alerts', authenticate, getVitalsWithAlerts);
router.get('/vitals/trends', authenticate, getVitalTrends);
router.get('/vitals/alerts-summary', authenticate, getAlertsSummary);

// Doctor routes
router.get(
    '/patients/alerts',
    authenticate,
    requirePermission('patient:vitals:read:all'),
    getPatientsWithAlerts
);
router.get(
    '/patients/:patientId/vitals',
    authenticate,
    requirePermission('patient:vitals:read:all'),
    getPatientVitals
);
router.get('/doctor', authenticate, requirePermission('appointment:read:all'), getDoctorAnalytics);

// Admin routes
router.get('/admin', authenticate, requirePermission('admin:audit_logs:read'), getAdminAnalytics);

export default router;
