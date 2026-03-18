import express from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';
import { UserRole } from '../models/User.js';
import {
    getAdminDashboardStats,
    getStaffList,
    toggleUserStatus,
    verifyDoctor,
    getAllAppointments,
    getInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
} from '../controllers/admin.controller.js';

const router = express.Router();

router.use(verifyToken, authorizeRoles(UserRole.ADMIN));

const listQueryValidators = [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
];

router.get('/dashboard', getAdminDashboardStats);

router.get(
    '/staff',
    [
        ...listQueryValidators,
        query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
        query('role').optional().isIn(['all', UserRole.DOCTOR, UserRole.ADMIN]).withMessage('role is invalid'),
        query('isActive').optional().isIn(['all', 'true', 'false']).withMessage('isActive is invalid'),
    ],
    handleValidationErrors,
    getStaffList
);
router.patch(
    '/users/:userId/status',
    [param('userId').isMongoId().withMessage('userId must be valid')],
    handleValidationErrors,
    toggleUserStatus
);
router.patch(
    '/doctors/:doctorId/verify',
    [param('doctorId').isMongoId().withMessage('doctorId must be valid')],
    handleValidationErrors,
    verifyDoctor
);

router.get(
    '/appointments',
    [
        ...listQueryValidators,
        query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
        query('status').optional().isIn(['all', 'pending', 'confirmed', 'completed', 'cancelled']).withMessage('status is invalid'),
    ],
    handleValidationErrors,
    getAllAppointments
);

router.get(
    '/inventory',
    [
        ...listQueryValidators,
        query('search').optional().trim().isLength({ max: 100 }).withMessage('search is too long'),
        query('category').optional().isIn(['all', 'medicine', 'equipment', 'supplies']).withMessage('category is invalid'),
    ],
    handleValidationErrors,
    getInventory
);
router.post(
    '/inventory',
    [
        body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 120 }).withMessage('name is too long'),
        body('category').isIn(['medicine', 'equipment', 'supplies']).withMessage('category is invalid'),
        body('quantity').isInt({ min: 0, max: 1000000 }).withMessage('quantity must be between 0 and 1000000').toInt(),
        body('unit').trim().notEmpty().withMessage('unit is required').isLength({ max: 30 }).withMessage('unit is too long'),
        body('lowStockThreshold')
            .optional()
            .isInt({ min: 0, max: 1000000 })
            .withMessage('lowStockThreshold must be between 0 and 1000000')
            .toInt(),
        body('supplierName').optional().trim().isLength({ max: 120 }).withMessage('supplierName is too long'),
    ],
    handleValidationErrors,
    addInventoryItem
);

router.patch(
    '/inventory/:itemId',
    [
        param('itemId').isMongoId().withMessage('itemId must be valid'),
        body().custom((payload: Record<string, unknown>) => {
            if (!payload || Object.keys(payload).length === 0) {
                throw new Error('At least one field must be provided');
            }
            return true;
        }),
        body('name').optional().trim().notEmpty().withMessage('name cannot be empty').isLength({ max: 120 }).withMessage('name is too long'),
        body('category').optional().isIn(['medicine', 'equipment', 'supplies']).withMessage('category is invalid'),
        body('quantity').optional().isInt({ min: 0, max: 1000000 }).withMessage('quantity must be between 0 and 1000000').toInt(),
        body('unit').optional().trim().notEmpty().withMessage('unit cannot be empty').isLength({ max: 30 }).withMessage('unit is too long'),
        body('lowStockThreshold')
            .optional()
            .isInt({ min: 0, max: 1000000 })
            .withMessage('lowStockThreshold must be between 0 and 1000000')
            .toInt(),
        body('supplierName').optional().trim().isLength({ max: 120 }).withMessage('supplierName is too long'),
    ],
    handleValidationErrors,
    updateInventoryItem
);

router.delete(
    '/inventory/:itemId',
    [param('itemId').isMongoId().withMessage('itemId must be valid')],
    handleValidationErrors,
    deleteInventoryItem
);

export default router;
