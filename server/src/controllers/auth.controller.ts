import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { generateToken } from '../utils/jwt.js';

export const register = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;
        const normalizedEmail = String(email).toLowerCase();

        // Check if user exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Self-registration is restricted to patient and doctor roles.
        if (![UserRole.PATIENT, UserRole.DOCTOR].includes(role)) {
            return res.status(400).json({ message: 'Invalid role provided' });
        }

        // Create User
        const user = new User({
            firstName,
            lastName,
            email: normalizedEmail,
            passwordHash,
            role,
        });
        const savedUser = await user.save();

        // Create related profile based on role
        if (role === UserRole.PATIENT) {
            const patientProfile = new PatientProfile({ user: savedUser._id });
            await patientProfile.save();
        } else if (role === UserRole.DOCTOR) {
            const doctorProfile = new DoctorProfile({
                user: savedUser._id,
                specialization: 'General', // Default value, will be updated later
            });
            await doctorProfile.save();
        }

        const token = generateToken(savedUser.id);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: savedUser._id,
                firstName: savedUser.firstName,
                lastName: savedUser.lastName,
                email: savedUser.email,
                role: savedUser.role,
            },
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = String(email).toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        const token = generateToken(user.id);

        res.status(200).json({
            message: 'Logged in successfully',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};
