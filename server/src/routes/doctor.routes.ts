import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';
import { UserRole } from '../models/User.js';
import { AppointmentStatus } from '../models/Appointment.js';
import {
    getDoctorDashboard,
    updateDoctorProfile,
    getMyPatients,
    getDoctorAppointments,
    updateAppointmentStatus,
    getPatientEHR,
} from '../controllers/doctor.controller.js';
import {
    createPrescription,
    getDoctorPrescriptions,
    getDoctorPrescriptionById,
    updateDoctorPrescription,
    cancelDoctorPrescription,
} from '../controllers/prescription.controller.js';
import { getDoctorPatientPurchases } from '../controllers/inventory.controller.js';
import { PrescriptionStatus } from '../models/Prescription.js';

const router = express.Router();

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

router.use(verifyToken, authorizeRoles(UserRole.DOCTOR));

const listQueryValidators = [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
    query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
];

router.get('/dashboard', getDoctorDashboard);
router.put(
    '/profile',
    [
        body('specialization').trim().notEmpty().withMessage('specialization is required').isLength({ max: 100 }).withMessage('specialization is too long'),
        body('qualifications').optional().isArray({ max: 20 }).withMessage('qualifications must be an array with at most 20 items'),
        body('qualifications.*').optional().trim().isLength({ min: 2, max: 100 }).withMessage('each qualification must be 2-100 characters'),
        body('experienceYears').isInt({ min: 0, max: 80 }).withMessage('experienceYears must be between 0 and 80').toInt(),
        body('consultationFee').isFloat({ min: 0, max: 100000 }).withMessage('consultationFee must be between 0 and 100000').toFloat(),
        body('bio').optional().trim().isLength({ max: 1000 }).withMessage('bio is too long'),
        body('clinicAddress').optional().trim().isLength({ max: 300 }).withMessage('clinicAddress is too long'),
        body('availability').optional().isArray({ max: 30 }).withMessage('availability must be an array with at most 30 slots'),
        body('availability.*.dayOfWeek').optional().isIn(weekDays).withMessage('availability dayOfWeek is invalid'),
        body('availability.*.startTime')
            .optional()
            .matches(timePattern)
            .withMessage('availability startTime must use HH:mm'),
        body('availability.*.endTime')
            .optional()
            .matches(timePattern)
            .withMessage('availability endTime must use HH:mm'),
        body('availability').optional().custom((slots: Array<{ startTime?: string; endTime?: string }>) => {
            if (!Array.isArray(slots)) {
                return true;
            }

            for (const slot of slots) {
                if (!slot?.startTime || !slot?.endTime) {
                    throw new Error('availability slots must include startTime and endTime');
                }

                if (slot.startTime >= slot.endTime) {
                    throw new Error('availability endTime must be later than startTime');
                }
            }

            return true;
        }),
    ],
    handleValidationErrors,
    updateDoctorProfile
);

router.get('/patients', listQueryValidators, handleValidationErrors, getMyPatients);
router.get('/patients/:patientId/ehr', [param('patientId').isMongoId().withMessage('patientId must be valid')], handleValidationErrors, getPatientEHR);

router.get(
    '/appointments',
    [
        ...listQueryValidators,
        query('status').optional().isIn(['all', 'pending', 'confirmed', 'completed', 'cancelled']).withMessage('status is invalid'),
    ],
    handleValidationErrors,
    getDoctorAppointments
);
router.patch(
    '/appointments/:appointmentId/status',
    [
        param('appointmentId').isMongoId().withMessage('appointmentId must be valid'),
        body('status').isIn(Object.values(AppointmentStatus)).withMessage('status is invalid'),
        body('notes').optional().trim().isLength({ max: 1000 }).withMessage('notes are too long'),
    ],
    handleValidationErrors,
    updateAppointmentStatus
);

router.post(
    '/prescriptions',
    [
        body('patientId').isMongoId().withMessage('patientId must be a valid id'),
        body('appointmentId').optional().isMongoId().withMessage('appointmentId must be a valid id'),
        body('status')
            .optional()
            .isIn([PrescriptionStatus.DRAFT, PrescriptionStatus.ISSUED])
            .withMessage('status must be draft or issued'),
        body('notes').optional().trim().isLength({ max: 1500 }).withMessage('notes are too long'),
        body('medications').isArray({ min: 1, max: 50 }).withMessage('medications must contain 1-50 items'),
        body('medications.*.medicationName')
            .trim()
            .notEmpty()
            .withMessage('medicationName is required')
            .isLength({ max: 120 })
            .withMessage('medicationName is too long'),
        body('medications.*.dosage')
            .trim()
            .notEmpty()
            .withMessage('dosage is required')
            .isLength({ max: 120 })
            .withMessage('dosage is too long'),
        body('medications.*.frequency')
            .trim()
            .notEmpty()
            .withMessage('frequency is required')
            .isLength({ max: 120 })
            .withMessage('frequency is too long'),
        body('medications.*.durationDays')
            .isInt({ min: 1, max: 365 })
            .withMessage('durationDays must be between 1 and 365')
            .toInt(),
        body('medications.*.quantity')
            .isInt({ min: 1, max: 10000 })
            .withMessage('quantity must be between 1 and 10000')
            .toInt(),
        body('medications.*.instructions')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('instructions are too long'),
        body('medications.*.inventoryItem').optional().isMongoId().withMessage('inventoryItem must be a valid id'),
    ],
    handleValidationErrors,
    createPrescription
);

router.get(
    '/prescriptions',
    [
        ...listQueryValidators,
        query('status')
            .optional()
            .isIn(['all', PrescriptionStatus.DRAFT, PrescriptionStatus.ISSUED, PrescriptionStatus.DISPENSED, PrescriptionStatus.CANCELLED])
            .withMessage('status is invalid'),
    ],
    handleValidationErrors,
    getDoctorPrescriptions
);

router.get(
    '/prescriptions/:prescriptionId',
    [param('prescriptionId').isMongoId().withMessage('prescriptionId must be valid')],
    handleValidationErrors,
    getDoctorPrescriptionById
);

router.patch(
    '/prescriptions/:prescriptionId',
    [
        param('prescriptionId').isMongoId().withMessage('prescriptionId must be valid'),
        body().custom((payload: Record<string, unknown>) => {
            if (!payload || Object.keys(payload).length === 0) {
                throw new Error('At least one field must be provided');
            }
            return true;
        }),
        body('notes').optional().trim().isLength({ max: 1500 }).withMessage('notes are too long'),
        body('status')
            .optional()
            .isIn([PrescriptionStatus.DRAFT, PrescriptionStatus.ISSUED, PrescriptionStatus.CANCELLED])
            .withMessage('status is invalid for doctor update'),
        body('medications').optional().isArray({ min: 1, max: 50 }).withMessage('medications must contain 1-50 items'),
        body('medications.*.medicationName')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('medicationName cannot be empty')
            .isLength({ max: 120 })
            .withMessage('medicationName is too long'),
        body('medications.*.dosage')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('dosage cannot be empty')
            .isLength({ max: 120 })
            .withMessage('dosage is too long'),
        body('medications.*.frequency')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('frequency cannot be empty')
            .isLength({ max: 120 })
            .withMessage('frequency is too long'),
        body('medications.*.durationDays')
            .optional()
            .isInt({ min: 1, max: 365 })
            .withMessage('durationDays must be between 1 and 365')
            .toInt(),
        body('medications.*.quantity')
            .optional()
            .isInt({ min: 1, max: 10000 })
            .withMessage('quantity must be between 1 and 10000')
            .toInt(),
        body('medications.*.instructions')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('instructions are too long'),
        body('medications.*.inventoryItem').optional().isMongoId().withMessage('inventoryItem must be a valid id'),
    ],
    handleValidationErrors,
    updateDoctorPrescription
);

router.patch(
    '/prescriptions/:prescriptionId/cancel',
    [param('prescriptionId').isMongoId().withMessage('prescriptionId must be valid')],
    handleValidationErrors,
    cancelDoctorPrescription
);

router.get('/patient-purchases', listQueryValidators, handleValidationErrors, getDoctorPatientPurchases);

export default router;
