import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';
import { UserRole } from '../models/User.js';
import {
    getPatientDashboard,
    updatePatientProfile,
    addVital,
    getVitalsHistory,
    getAllDoctors,
    bookAppointment,
    getPatientAppointments,
} from '../controllers/patient.controller.js';
import { getPatientPrescriptions, getPatientPrescriptionById } from '../controllers/prescription.controller.js';
import { getStoreInventory, createStorePurchase, getPatientStorePurchases } from '../controllers/inventory.controller.js';
import { PrescriptionStatus } from '../models/Prescription.js';

const router = express.Router();

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const listQueryValidators = [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
];

router.use(verifyToken, authorizeRoles(UserRole.PATIENT));

router.get('/dashboard', getPatientDashboard);

router.put(
    '/profile',
    [
        body('dateOfBirth')
            .optional()
            .isISO8601()
            .withMessage('dateOfBirth must be a valid ISO date')
            .toDate()
            .custom((value) => value < new Date())
            .withMessage('dateOfBirth must be in the past'),
        body('gender').optional().isIn(['male', 'female', 'other']).withMessage('gender must be male, female, or other'),
        body('bloodGroup').optional().isIn(bloodGroups).withMessage('bloodGroup is invalid'),
        body('contactNumber')
            .optional()
            .trim()
            .isLength({ min: 7, max: 20 })
            .withMessage('contactNumber must be between 7 and 20 characters')
            .matches(/^[0-9+\-()\s]+$/)
            .withMessage('contactNumber has invalid characters'),
        body('address').optional().trim().isLength({ max: 300 }).withMessage('address is too long'),
        body('emergencyContact')
            .optional()
            .custom((value) => {
                if (typeof value !== 'object' || Array.isArray(value) || value === null) {
                    throw new Error('emergencyContact must be an object');
                }

                const { name, relation, contactNumber } = value as {
                    name?: unknown;
                    relation?: unknown;
                    contactNumber?: unknown;
                };

                if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
                    throw new Error('emergencyContact.name must be 1-100 characters');
                }

                if (typeof relation !== 'string' || relation.trim().length === 0 || relation.trim().length > 50) {
                    throw new Error('emergencyContact.relation must be 1-50 characters');
                }

                if (
                    typeof contactNumber !== 'string' ||
                    contactNumber.trim().length < 7 ||
                    contactNumber.trim().length > 20 ||
                    !/^[0-9+\-()\s]+$/.test(contactNumber)
                ) {
                    throw new Error('emergencyContact.contactNumber is invalid');
                }

                return true;
            }),
    ],
    handleValidationErrors,
    updatePatientProfile
);

router.post(
    '/vitals',
    [
        body('bloodPressure').isObject().withMessage('bloodPressure is required'),
        body('bloodPressure.systolic')
            .isInt({ min: 70, max: 250 })
            .withMessage('bloodPressure.systolic must be between 70 and 250')
            .toInt(),
        body('bloodPressure.diastolic')
            .isInt({ min: 40, max: 150 })
            .withMessage('bloodPressure.diastolic must be between 40 and 150')
            .toInt(),
        body('bloodPressure').custom((bp: { systolic?: number; diastolic?: number }) => {
            if (!bp || typeof bp !== 'object') {
                return true;
            }

            if (Number(bp.systolic) <= Number(bp.diastolic)) {
                throw new Error('bloodPressure.systolic must be greater than diastolic');
            }

            return true;
        }),
        body('heartRate').isInt({ min: 30, max: 240 }).withMessage('heartRate must be between 30 and 240').toInt(),
        body('bloodSugar').optional().isFloat({ min: 20, max: 700 }).withMessage('bloodSugar must be between 20 and 700').toFloat(),
        body('weight').optional().isFloat({ min: 1, max: 500 }).withMessage('weight must be between 1 and 500').toFloat(),
        body('height').optional().isFloat({ min: 30, max: 300 }).withMessage('height must be between 30 and 300').toFloat(),
        body('temperature')
            .optional()
            .isFloat({ min: 30, max: 45 })
            .withMessage('temperature must be between 30 and 45')
            .toFloat(),
        body('notes').optional().trim().isLength({ max: 1000 }).withMessage('notes are too long'),
    ],
    handleValidationErrors,
    addVital
);
router.get('/vitals', listQueryValidators, handleValidationErrors, getVitalsHistory);

router.get(
    '/doctors',
    [
        ...listQueryValidators,
        query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
        query('specialization').optional().trim().isLength({ max: 100 }).withMessage('specialization is too long'),
    ],
    handleValidationErrors,
    getAllDoctors
);

router.post(
    '/appointments',
    [
        body('doctorId').isMongoId().withMessage('doctorId must be a valid id'),
        body('appointmentDate')
            .isISO8601()
            .withMessage('appointmentDate must be a valid date-time')
            .toDate()
            .custom((value) => value > new Date())
            .withMessage('appointmentDate must be in the future'),
        body('reasonForVisit')
            .trim()
            .notEmpty()
            .withMessage('reasonForVisit is required')
            .isLength({ min: 5, max: 500 })
            .withMessage('reasonForVisit must be between 5 and 500 characters'),
    ],
    handleValidationErrors,
    bookAppointment
);
router.get(
    '/appointments',
    [
        ...listQueryValidators,
        query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
        query('status').optional().isIn(['all', 'pending', 'confirmed', 'completed', 'cancelled']).withMessage('status is invalid'),
    ],
    handleValidationErrors,
    getPatientAppointments
);

router.get(
    '/prescriptions',
    [
        ...listQueryValidators,
        query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
        query('status')
            .optional()
            .isIn(['all', PrescriptionStatus.DRAFT, PrescriptionStatus.ISSUED, PrescriptionStatus.DISPENSED, PrescriptionStatus.CANCELLED])
            .withMessage('status is invalid'),
    ],
    handleValidationErrors,
    getPatientPrescriptions
);

router.get(
    '/prescriptions/:prescriptionId',
    [param('prescriptionId').isMongoId().withMessage('prescriptionId must be valid')],
    handleValidationErrors,
    getPatientPrescriptionById
);

router.get(
    '/store/items',
    [
        ...listQueryValidators,
        query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
        query('category').optional().isIn(['all', 'medicine', 'equipment', 'supplies']).withMessage('category is invalid'),
    ],
    handleValidationErrors,
    getStoreInventory
);

router.post(
    '/store/purchases',
    [
        body('items').isArray({ min: 1 }).withMessage('items must contain at least one item'),
        body('items.*.inventoryItemId').isMongoId().withMessage('items.inventoryItemId must be valid'),
        body('items.*.quantity').isInt({ min: 1, max: 1000000 }).withMessage('items.quantity must be between 1 and 1000000').toInt(),
        body('notes').optional().trim().isLength({ max: 500 }).withMessage('notes are too long'),
    ],
    handleValidationErrors,
    createStorePurchase
);

router.get('/store/purchases', listQueryValidators, handleValidationErrors, getPatientStorePurchases);

export default router;
