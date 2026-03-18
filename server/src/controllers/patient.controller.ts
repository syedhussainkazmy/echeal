import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { Vital } from '../models/Vital.js';
import { Appointment } from '../models/Appointment.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { User } from '../models/User.js';
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js';

export const getPatientDashboard = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;

        const profile = await PatientProfile.findOne({ user: patientId }).populate('user', '-passwordHash');
        const recentVitals = await Vital.find({ patient: patientId }).sort({ recordedAt: -1 }).limit(5);
        const upcomingAppointments = await Appointment.find({
            patient: patientId,
            appointmentDate: { $gte: new Date() },
        })
            .populate('doctor', 'firstName lastName')
            .sort({ appointmentDate: 1 })
            .limit(5);

        res.status(200).json({ profile, recentVitals, upcomingAppointments });
    } catch (error) {
        console.error('Error fetching patient dashboard:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updatePatientProfile = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { dateOfBirth, gender, bloodGroup, contactNumber, address, emergencyContact } = req.body;

        const updated = await PatientProfile.findOneAndUpdate(
            { user: patientId },
            { dateOfBirth, gender, bloodGroup, contactNumber, address, emergencyContact },
            { new: true, runValidators: true }
        ).populate('user', '-passwordHash');

        if (!updated) return res.status(404).json({ message: 'Patient profile not found' });

        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating patient profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const addVital = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { bloodPressure, heartRate, bloodSugar, weight, height, temperature, notes } = req.body;

        const newVital = new Vital({
            patient: patientId,
            bloodPressure,
            heartRate,
            bloodSugar,
            weight,
            height,
            temperature,
            notes,
        });

        const savedVital = await newVital.save();
        res.status(201).json(savedVital);
    } catch (error) {
        console.error('Error adding vital:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getVitalsHistory = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });

        const filters = { patient: patientId };
        const [vitals, total] = await Promise.all([
            Vital.find(filters)
                .sort({ recordedAt: sortOrder })
                .skip(skip)
                .limit(limit),
            Vital.countDocuments(filters),
        ]);

        res.status(200).json(buildPaginatedResponse(vitals, total, page, limit));
    } catch (error) {
        console.error('Error fetching vitals history:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAllDoctors = async (req: AuthRequest, res: Response) => {
    try {
        const { page, limit, skip } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();
        const specialization = String(req.query.specialization || 'all').trim();

        const filters: any = { isVerified: true };

        if (specialization && specialization !== 'all') {
            filters.specialization = specialization;
        }

        if (search) {
            const matchedUsers = await User.find(
                {
                    $or: [
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                    ],
                },
                { _id: 1 }
            );
            const userIds = matchedUsers.map((user) => user._id);
            filters.$or = [
                { user: { $in: userIds } },
                { specialization: { $regex: search, $options: 'i' } },
            ];
        }

        const [doctors, total] = await Promise.all([
            DoctorProfile.find(filters)
                .populate('user', 'firstName lastName email')
                .sort({ specialization: 1 })
                .skip(skip)
                .limit(limit),
            DoctorProfile.countDocuments(filters),
        ]);

        res.status(200).json(buildPaginatedResponse(doctors, total, page, limit));
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const bookAppointment = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { doctorId, appointmentDate, reasonForVisit } = req.body;

        // doctorId may be the DoctorProfile's _id (sent by frontend from /patient/doctors)
        // Resolve the actual user._id for the Appointment
        const doctorProfile = await DoctorProfile.findById(doctorId);
        const resolvedDoctorUserId = doctorProfile ? doctorProfile.user : doctorId;

        const newAppointment = new Appointment({
            patient: patientId,
            doctor: resolvedDoctorUserId,
            appointmentDate,
            reasonForVisit,
        });

        const savedAppointment = await newAppointment.save();
        res.status(201).json(savedAppointment);
    } catch (error) {
        console.error('Error booking appointment:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPatientAppointments = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || 'all').toLowerCase();

        const filters: any = { patient: patientId };
        if (status !== 'all') {
            filters.status = status;
        }

        if (search) {
            const matchingDoctors = await User.find(
                {
                    $or: [
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                    ],
                },
                { _id: 1 }
            );
            const doctorIds = matchingDoctors.map((doctor) => doctor._id);
            filters.$or = [
                { doctor: { $in: doctorIds } },
                { reasonForVisit: { $regex: search, $options: 'i' } },
            ];
        }

        const [appointments, total] = await Promise.all([
            Appointment.find(filters)
                .populate('doctor', 'firstName lastName email')
                .sort({ appointmentDate: sortOrder })
                .skip(skip)
                .limit(limit),
            Appointment.countDocuments(filters),
        ]);

        res.status(200).json(buildPaginatedResponse(appointments, total, page, limit));
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
