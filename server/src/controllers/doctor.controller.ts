import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Appointment, AppointmentStatus } from '../models/Appointment.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { Vital } from '../models/Vital.js';
import { User } from '../models/User.js';
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js';

export const getDoctorDashboard = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;

        const profile = await DoctorProfile.findOne({ user: doctorId }).populate('user', '-passwordHash');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaysAppointments = await Appointment.find({
            doctor: doctorId,
            appointmentDate: { $gte: today, $lt: tomorrow },
        }).populate('patient', 'firstName lastName');

        const upcomingAppointments = await Appointment.find({
            doctor: doctorId,
            appointmentDate: { $gte: tomorrow },
        })
            .populate('patient', 'firstName lastName')
            .sort({ appointmentDate: 1 })
            .limit(5);

        res.status(200).json({ profile, todaysAppointments, upcomingAppointments });
    } catch (error) {
        console.error('Error fetching doctor dashboard:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateDoctorProfile = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { specialization, qualifications, experienceYears, consultationFee, availability, bio, clinicAddress } =
            req.body;

        const updated = await DoctorProfile.findOneAndUpdate(
            { user: doctorId },
            { specialization, qualifications, experienceYears, consultationFee, availability, bio, clinicAddress },
            { new: true, runValidators: true }
        ).populate('user', '-passwordHash');

        if (!updated) return res.status(404).json({ message: 'Doctor profile not found' });

        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating doctor profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMyPatients = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { page, limit, skip } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();

        // Get distinct patient IDs from appointments with this doctor
        const appointments = await Appointment.find({ doctor: doctorId }).distinct('patient');

        const patientFilters: any = { _id: { $in: appointments } };
        if (search) {
            patientFilters.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const [patients, total] = await Promise.all([
            User.find(patientFilters)
                .select('-passwordHash')
                .sort({ firstName: 1, lastName: 1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(patientFilters),
        ]);

        const patientsWithProfiles = await Promise.all(
            patients.map(async (patient) => {
                const profile = await PatientProfile.findOne({ user: patient._id });
                return { ...patient.toObject(), profile };
            })
        );

        res.status(200).json(buildPaginatedResponse(patientsWithProfiles, total, page, limit));
    } catch (error) {
        console.error('Error fetching my patients:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getDoctorAppointments = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || 'all').toLowerCase();

        const filters: any = { doctor: doctorId };
        if (status !== 'all') {
            filters.status = status;
        }

        if (search) {
            const matchingPatients = await User.find(
                {
                    $or: [
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                    ],
                },
                { _id: 1 }
            );
            const patientIds = matchingPatients.map((patient) => patient._id);
            filters.$or = [
                { patient: { $in: patientIds } },
                { reasonForVisit: { $regex: search, $options: 'i' } },
            ];
        }

        const [appointments, total] = await Promise.all([
            Appointment.find(filters)
                .populate('patient', 'firstName lastName email')
                .sort({ appointmentDate: sortOrder })
                .skip(skip)
                .limit(limit),
            Appointment.countDocuments(filters),
        ]);

        res.status(200).json(buildPaginatedResponse(appointments, total, page, limit));
    } catch (error) {
        console.error('Error fetching doctor appointments:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateAppointmentStatus = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { appointmentId } = req.params;
        const { status, notes } = req.body;

        if (!Object.values(AppointmentStatus).includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const updateData: any = { status };
        if (notes !== undefined) updateData.notes = notes;

        const appointment = await Appointment.findOneAndUpdate(
            { _id: appointmentId, doctor: doctorId },
            updateData,
            { new: true }
        ).populate('patient', 'firstName lastName email');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found or unauthorized' });
        }

        res.status(200).json(appointment);
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPatientEHR = async (req: AuthRequest, res: Response) => {
    try {
        const { patientId } = req.params;

        const patientProfile = await PatientProfile.findOne({ user: patientId }).populate(
            'user',
            'firstName lastName email'
        );
        if (!patientProfile) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const vitals = await Vital.find({ patient: patientId }).sort({ recordedAt: -1 });

        const pastAppointments = await Appointment.find({
            patient: patientId,
            doctor: req.user?._id,
            status: AppointmentStatus.COMPLETED,
        }).sort({ appointmentDate: -1 });

        res.status(200).json({ profile: patientProfile, vitals, pastAppointments });
    } catch (error) {
        console.error('Error fetching patient EHR:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
