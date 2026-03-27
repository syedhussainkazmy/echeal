import { Response } from 'express';
import { AuthRequest, authenticate } from '../middlewares/auth.middleware.js';
import { Vital } from '../models/Vital.js';
import { Appointment, AppointmentStatus } from '../models/Appointment.js';
import { Prescription, PrescriptionStatus } from '../models/Prescription.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { User } from '../models/User.js';
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js';
import { createAuditLog } from '../models/AuditLog.js';
import { decryptFields, PHI_FIELDS } from '../utils/encryption.js';

// Helper to get user full name
const getUserName = (user: AuthRequest['user']): string => {
    if (!user) return 'Unknown';
    return `${user.firstName} ${user.lastName}`;
};

// Generate patient medical summary report
export const generatePatientSummary = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { format = 'json' } = req.query;

        // Get patient profile
        const profile = await PatientProfile.findOne({ patient: patientId }).populate('user', 'firstName lastName email');

        // Get recent vitals (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const vitals = await Vital.find({
            patient: patientId,
            recordedAt: { $gte: thirtyDaysAgo },
        }).sort({ recordedAt: -1 });

        // Get upcoming appointments
        const upcomingAppointments = await Appointment.find({
            patient: patientId,
            appointmentDate: { $gte: new Date() },
            status: 'confirmed',
        })
            .populate('doctor', 'firstName lastName')
            .sort({ appointmentDate: 1 })
            .limit(5);

        // Get active prescriptions
        const prescriptions = await Prescription.find({
            patient: patientId,
            status: 'active',
        }).populate('prescribedBy', 'firstName lastName');

        const report = {
            generatedAt: new Date(),
            patient: profile,
            vitalsSummary: {
                totalReadings: vitals.length,
                latest: vitals[0] || null,
                averages: calculateVitalsAverages(vitals),
            },
            appointments: upcomingAppointments,
            prescriptions: prescriptions,
        };

        // Decrypt PHI fields if present
        const decryptedReport = decryptFields(report as any, [...PHI_FIELDS.patient, ...PHI_FIELDS.prescription] as any);

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'export',
            'patient',
            {
                resourceId: patientId,
                details: 'Generated patient medical summary report',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
                metadata: { format },
            }
        );

        res.status(200).json(decryptedReport);
    } catch (error) {
        console.error('Error generating patient summary:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Generate patient medical history report (for doctors)
export const generateMedicalHistoryReport = async (req: AuthRequest, res: Response) => {
    try {
        const { patientId } = req.params;
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();

        // Get patient profile
        const profile = await PatientProfile.findOne({ patient: patientId }).populate('user', 'firstName lastName email');

        if (!profile) {
            return res.status(404).json({ message: 'Patient profile not found' });
        }

        // Get vitals in date range
        const vitals = await Vital.find({
            patient: patientId,
            recordedAt: { $gte: start, $lte: end },
        }).sort({ recordedAt: -1 });

        // Get appointments in date range
        const appointments = await Appointment.find({
            patient: patientId,
            appointmentDate: { $gte: start, $lte: end },
        })
            .populate('doctor', 'firstName lastName')
            .sort({ appointmentDate: -1 });

        // Get prescriptions in date range
        const prescriptions = await Prescription.find({
            patient: patientId,
            createdAt: { $gte: start, $lte: end },
        })
            .populate('prescribedBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        const report = {
            generatedAt: new Date(),
            period: { start, end },
            patient: profile,
            vitals: {
                totalReadings: vitals.length,
                data: vitals,
            },
            appointments: {
                total: appointments.length,
                data: appointments,
            },
            prescriptions: {
                total: prescriptions.length,
                data: prescriptions,
            },
        };

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'export',
            'medical_record',
            {
                resourceId: patientId,
                details: `Generated medical history report for patient ${patientId}`,
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
                metadata: { startDate: start.toISOString(), endDate: end.toISOString() },
            }
        );

        res.status(200).json(report);
    } catch (error) {
        console.error('Error generating medical history report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Generate appointment summary report
export const generateAppointmentReport = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { startDate, endDate, status } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();

        const filters: any = { doctor: doctorId, appointmentDate: { $gte: start, $lte: end } };
        if (status && status !== 'all') {
            filters.status = status;
        }

        const appointments = await Appointment.find(filters)
            .populate('patient', 'firstName lastName')
            .populate('doctor', 'firstName lastName')
            .sort({ appointmentDate: -1 });

        // Calculate statistics
        const stats = {
            total: appointments.length,
            confirmed: appointments.filter((a) => a.status === AppointmentStatus.CONFIRMED).length,
            completed: appointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
            cancelled: appointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length,
            pending: appointments.filter((a) => a.status === AppointmentStatus.PENDING).length,
        };

        // Group by date
        const byDate = appointments.reduce((acc, apt) => {
            const dateKey = apt.appointmentDate.toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = { total: 0, confirmed: 0, completed: 0, cancelled: 0 };
            }
            acc[dateKey].total++;
            if (apt.status === AppointmentStatus.CONFIRMED) acc[dateKey].confirmed++;
            if (apt.status === AppointmentStatus.COMPLETED) acc[dateKey].completed++;
            if (apt.status === AppointmentStatus.CANCELLED) acc[dateKey].cancelled++;
            return acc;
        }, {} as Record<string, any>);

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'export',
            'appointment',
            {
                details: 'Generated appointment summary report',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            period: { start, end },
            statistics: stats,
            appointmentsByDate: byDate,
            appointments: appointments.map((a) => ({
                _id: a._id,
                appointmentDate: a.appointmentDate,
                status: a.status,
                reasonForVisit: a.reasonForVisit,
                patient: a.patient ? `${(a.patient as any).firstName} ${(a.patient as any).lastName}` : null,
            })),
        });
    } catch (error) {
        console.error('Error generating appointment report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Generate prescription report
export const generatePrescriptionReport = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { startDate, endDate, status } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();

        const filters: any = { prescribedBy: doctorId, createdAt: { $gte: start, $lte: end } };
        if (status && status !== 'all') {
            filters.status = status;
        }

        const prescriptions = await Prescription.find(filters)
            .populate('patient', 'firstName lastName')
            .sort({ createdAt: -1 });

        // Calculate statistics
        const stats = {
            total: prescriptions.length,
            active: prescriptions.filter((p) => p.status === PrescriptionStatus.ISSUED).length,
            dispensed: prescriptions.filter((p) => p.status === PrescriptionStatus.DISPENSED).length,
            cancelled: prescriptions.filter((p) => p.status === PrescriptionStatus.CANCELLED).length,
        };

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'export',
            'prescription',
            {
                details: 'Generated prescription report',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            period: { start, end },
            statistics: stats,
            prescriptions: prescriptions.map((p) => ({
                _id: p._id,
                medications: p.medications,
                status: p.status,
                createdAt: p.createdAt,
                patient: p.patient ? `${(p.patient as any).firstName} ${(p.patient as any).lastName}` : null,
            })),
        });
    } catch (error) {
        console.error('Error generating prescription report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Export patient data (for HIPAA data portability)
export const exportPatientData = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;

        // Get all patient data
        const profile = await PatientProfile.findOne({ patient: patientId }).populate('user', 'firstName lastName email');
        const vitals = await Vital.find({ patient: patientId }).sort({ recordedAt: -1 });
        const appointments = await Appointment.find({ patient: patientId }).sort({ appointmentDate: -1 });
        const prescriptions = await Prescription.find({ patient: patientId }).sort({ createdAt: -1 });

        const exportData = {
            exportedAt: new Date(),
            formatVersion: '1.0',
            patient: profile,
            vitals,
            appointments,
            prescriptions,
        };

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'export',
            'patient',
            {
                resourceId: patientId,
                details: 'Exported patient data (HIPAA data portability)',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json(exportData);
    } catch (error) {
        console.error('Error exporting patient data:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Helper function to calculate vitals averages
function calculateVitalsAverages(vitals: any[]) {
    if (!vitals || vitals.length === 0) {
        return null;
    }

    const averages = {
        bloodPressure: { systolic: 0, diastolic: 0 },
        heartRate: 0,
        bloodSugar: 0,
        weight: 0,
        temperature: 0,
    };

    let bpCount = 0;
    vitals.forEach((vital) => {
        if (vital.bloodPressure) {
            averages.bloodPressure.systolic += vital.bloodPressure.systolic;
            averages.bloodPressure.diastolic += vital.bloodPressure.diastolic;
            bpCount++;
        }
        if (vital.heartRate) averages.heartRate += vital.heartRate;
        if (vital.bloodSugar) averages.bloodSugar += vital.bloodSugar;
        if (vital.weight) averages.weight += vital.weight;
        if (vital.temperature) averages.temperature += vital.temperature;
    });

    const count = vitals.length;
    if (bpCount > 0) {
        averages.bloodPressure.systolic = Math.round(averages.bloodPressure.systolic / bpCount);
        averages.bloodPressure.diastolic = Math.round(averages.bloodPressure.diastolic / bpCount);
    }
    averages.heartRate = averages.heartRate > 0 ? Math.round(averages.heartRate / count) : 0;
    averages.bloodSugar = averages.bloodSugar > 0 ? Math.round(averages.bloodSugar / count) : 0;
    averages.weight = averages.weight > 0 ? Math.round(averages.weight / count) : 0;
    averages.temperature = averages.temperature > 0 ? Math.round((averages.temperature / count) * 10) / 10 : 0;

    return averages;
}
