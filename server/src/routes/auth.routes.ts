import express from 'express';
import { body } from 'express-validator';
import { register, login } from '../controllers/auth.controller.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';
import { UserRole } from '../models/User.js';

const router = express.Router();

router.post(
    '/register',
    [
        body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }).withMessage('First name is too long'),
        body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }).withMessage('Last name is too long'),
        body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
        body('password')
            .isString()
            .withMessage('Password is required')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/[A-Z]/)
            .withMessage('Password must include at least one uppercase letter')
            .matches(/[a-z]/)
            .withMessage('Password must include at least one lowercase letter')
            .matches(/\d/)
            .withMessage('Password must include at least one number')
            .matches(/[^A-Za-z0-9]/)
            .withMessage('Password must include at least one special character'),
        body('role').isIn([UserRole.PATIENT, UserRole.DOCTOR]).withMessage('Role must be patient or doctor'),
    ],
    handleValidationErrors,
    register
);

router.post(
    '/login',
    [
        body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
        body('password').isString().withMessage('Password is required').notEmpty().withMessage('Password is required'),
    ],
    handleValidationErrors,
    login
);

// Example of a protected route
router.get('/me', verifyToken, (req, res) => {
    res.status(200).json({ user: (req as any).user });
});

// Example of an admin-only route
router.get('/admin-only', verifyToken, authorizeRoles(UserRole.ADMIN), (req, res) => {
    res.status(200).json({ message: 'Welcome Admin' });
});

export default router;
