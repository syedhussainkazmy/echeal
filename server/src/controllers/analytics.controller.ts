import { Response } from 'express';
import { AuthRequest, authenticate } from '../middlewares/auth.middleware.js';
import { Vital } from '../models/Vital.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js';
import { createAuditLog } from '../models/AuditLog.js';

// Vital sign thresholds for alerts
export const VITAL_THRESHOLDS = {
    bloodPressure: {
        systolic: { low: 90, high: 140 },
        diastolic: { low: 60, high: 90 },
    },
    heartRate: { low: 60, high: 100 },
    bloodSugar: { low: 70, high: 140 }, // fasting
    temperature: { low: 36.1, high: 37.2 },
    weight: { low: 0, high: 0 }, // No fixed limits, track changes
} as const;

type VitalType = keyof typeof VITAL_THRESHOLDS;

// Helper to get user full name
const getUserName = (user: AuthRequest['user']): string => {
    if (!user) return 'Unknown';
    return `${user.firstName} ${user.lastName}`;
};

// Check if vital signs are within normal range
export const checkVitalAlerts = (vital: any): { type: VitalType; severity: 'low' | 'high'; value: number }[] => {
    const alerts: { type: VitalType; severity: 'low' | 'high'; value: number }[] = [];

    // Blood Pressure
    if (vital.bloodPressure) {
        if (vital.bloodPressure.systolic < VITAL_THRESHOLDS.bloodPressure.systolic.low) {
            alerts.push({ type: 'bloodPressure', severity: 'low', value: vital.bloodPressure.systolic });
        } else if (vital.bloodPressure.systolic > VITAL_THRESHOLDS.bloodPressure.systolic.high) {
            alerts.push({ type: 'bloodPressure', severity: 'high', value: vital.bloodPressure.systolic });
        }
        if (vital.bloodPressure.diastolic < VITAL_THRESHOLDS.bloodPressure.diastolic.low) {
            alerts.push({ type: 'bloodPressure', severity: 'low', value: vital.bloodPressure.diastolic });
        } else if (vital.bloodPressure.diastolic > VITAL_THRESHOLDS.bloodPressure.diastolic.high) {
            alerts.push({ type: 'bloodPressure', severity: 'high', value: vital.bloodPressure.diastolic });
        }
    }

    // Heart Rate
    if (vital.heartRate < VITAL_THRESHOLDS.heartRate.low) {
        alerts.push({ type: 'heartRate', severity: 'low', value: vital.heartRate });
    } else if (vital.heartRate > VITAL_THRESHOLDS.heartRate.high) {
        alerts.push({ type: 'heartRate', severity: 'high', value: vital.heartRate });
    }

    // Blood Sugar
    if (vital.bloodSugar) {
        if (vital.bloodSugar < VITAL_THRESHOLDS.bloodSugar.low) {
            alerts.push({ type: 'bloodSugar', severity: 'low', value: vital.bloodSugar });
        } else if (vital.bloodSugar > VITAL_THRESHOLDS.bloodSugar.high) {
            alerts.push({ type: 'bloodSugar', severity: 'high', value: vital.bloodSugar });
        }
    }

    // Temperature
    if (vital.temperature) {
        if (vital.temperature < VITAL_THRESHOLDS.temperature.low) {
            alerts.push({ type: 'temperature', severity: 'low', value: vital.temperature });
        } else if (vital.temperature > VITAL_THRESHOLDS.temperature.high) {
            alerts.push({ type: 'temperature', severity: 'high', value: vital.temperature });
        }
    }

    return alerts;
};

// Get patient's vital signs with alerts
export const getVitalsWithAlerts = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { limit = '10' } = req.query;

        const vitals = await Vital.find({ patient: patientId })
            .sort({ recordedAt: -1 })
            .limit(parseInt(limit as string));

        const vitalsWithAlerts = vitals.map((vital) => ({
            vital,
            alerts: checkVitalAlerts(vital),
        }));

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'read',
            'vital',
            {
                resourceId: patientId,
                details: 'Viewed vital signs with alerts',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({ vitals: vitalsWithAlerts });
    } catch (error) {
        console.error('Error fetching vitals with alerts:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get patient's vital trends (last 30 days by default)
export const getVitalTrends = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const days = parseInt(req.query.days as string) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const vitals = await Vital.find({
            patient: patientId,
            recordedAt: { $gte: startDate },
        }).sort({ recordedAt: 1 });

        // Calculate trends
        const trends = {
            bloodPressure: [] as { date: Date; systolic: number; diastolic: number }[],
            heartRate: [] as { date: Date; value: number }[],
            bloodSugar: [] as { date: Date; value: number }[],
            weight: [] as { date: Date; value: number }[],
            temperature: [] as { date: Date; value: number }[],
        };

        vitals.forEach((vital) => {
            if (vital.bloodPressure) {
                trends.bloodPressure.push({
                    date: vital.recordedAt,
                    systolic: vital.bloodPressure.systolic,
                    diastolic: vital.bloodPressure.diastolic,
                });
            }
            if (vital.heartRate) {
                trends.heartRate.push({ date: vital.recordedAt, value: vital.heartRate });
            }
            if (vital.bloodSugar) {
                trends.bloodSugar.push({ date: vital.recordedAt, value: vital.bloodSugar });
            }
            if (vital.weight) {
                trends.weight.push({ date: vital.recordedAt, value: vital.weight });
            }
            if (vital.temperature) {
                trends.temperature.push({ date: vital.recordedAt, value: vital.temperature });
            }
        });

        // Calculate averages
        const averages = {
            bloodPressure: { systolic: 0, diastolic: 0 },
            heartRate: 0,
            bloodSugar: 0,
            weight: 0,
            temperature: 0,
        };

        if (trends.bloodPressure.length > 0) {
            averages.bloodPressure.systolic = Math.round(
                trends.bloodPressure.reduce((sum, v) => sum + v.systolic, 0) / trends.bloodPressure.length
            );
            averages.bloodPressure.diastolic = Math.round(
                trends.bloodPressure.reduce((sum, v) => sum + v.diastolic, 0) / trends.bloodPressure.length
            );
        }
        if (trends.heartRate.length > 0) {
            averages.heartRate = Math.round(
                trends.heartRate.reduce((sum, v) => sum + v.value, 0) / trends.heartRate.length
            );
        }
        if (trends.bloodSugar.length > 0) {
            averages.bloodSugar = Math.round(
                trends.bloodSugar.reduce((sum, v) => sum + v.value, 0) / trends.bloodSugar.length
            );
        }
        if (trends.weight.length > 0) {
            averages.weight = Math.round(
                trends.weight.reduce((sum, v) => sum + v.value, 0) / trends.weight.length
            );
        }
        if (trends.temperature.length > 0) {
            averages.temperature = Math.round(
                trends.temperature.reduce((sum, v) => sum + v.value, 0) / trends.temperature.length
            );
        }

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'read',
            'vital',
            {
                resourceId: patientId,
                details: `Viewed vital trends for ${days} days`,
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({ trends, averages });
    } catch (error) {
        console.error('Error fetching vital trends:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get alerts summary for patient
export const getAlertsSummary = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const days = parseInt(req.query.days as string) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const vitals = await Vital.find({
            patient: patientId,
            recordedAt: { $gte: startDate },
        }).sort({ recordedAt: -1 });

        let totalAlerts = 0;
        const alertCounts: Record<string, number> = {};

        vitals.forEach((vital) => {
            const alerts = checkVitalAlerts(vital);
            alerts.forEach((alert) => {
                totalAlerts++;
                const key = `${alert.type}_${alert.severity}`;
                alertCounts[key] = (alertCounts[key] || 0) + 1;
            });
        });

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'read',
            'vital',
            {
                resourceId: patientId,
                details: 'Viewed alerts summary',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({ totalAlerts, alertCounts, periodDays: days });
    } catch (error) {
        console.error('Error fetching alerts summary:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Doctor: Get patients with critical alerts
export const getPatientsWithAlerts = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { page, limit, skip } = parsePagination(req.query as { page?: string; limit?: string });

        // Get patients with appointments to this doctor
        const { Appointment } = await import('../models/Appointment.js');
        const { User } = await import('../models/User.js');

        const patientIds = await Appointment.distinct('patient', { doctor: doctorId });

        const patientsWithAlerts = [];

        for (const patientId of patientIds) {
            const latestVital = await Vital.findOne({ patient: patientId }).sort({ recordedAt: -1 });
            if (!latestVital) continue;

            const alerts = checkVitalAlerts(latestVital);
            if (alerts.length > 0) {
                const profile = await PatientProfile.findOne({ patient: patientId }).populate('user', 'firstName lastName email');
                patientsWithAlerts.push({
                    patient: profile,
                    latestVital,
                    alerts,
                    recordedAt: latestVital.recordedAt,
                });
            }
        }

        // Sort by most recent alert
        patientsWithAlerts.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());

        // Paginate
        const paginated = patientsWithAlerts.slice(skip, skip + limit);
        const total = patientsWithAlerts.length;

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'read',
            'patient',
            {
                details: 'Viewed patients with critical alerts',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json(buildPaginatedResponse(paginated, total, page, limit));
    } catch (error) {
        console.error('Error fetching patients with alerts:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Doctor: Get patient's vital history
export const getPatientVitals = async (req: AuthRequest, res: Response) => {
    try {
        const { patientId } = req.params;
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const days = parseInt(req.query.days as string) || 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const filters: any = { patient: patientId };
        if (days > 0) {
            filters.recordedAt = { $gte: startDate };
        }

        const [vitals, total] = await Promise.all([
            Vital.find(filters)
                .sort({ recordedAt: sortOrder })
                .skip(skip)
                .limit(limit),
            Vital.countDocuments(filters),
        ]);

        // Add alerts to each vital
        const vitalsWithAlerts = vitals.map((vital) => ({
            vital,
            alerts: checkVitalAlerts(vital),
        }));

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'read',
            'vital',
            {
                resourceId: patientId,
                details: `Viewed patient ${patientId} vitals`,
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json(buildPaginatedResponse(vitalsWithAlerts, total, page, limit));
    } catch (error) {
        console.error('Error fetching patient vitals:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Analytics: Get doctor dashboard stats
export const getDoctorAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { days = '30' } = req.query;
        const daysNum = parseInt(days as string);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);

        const { Appointment } = await import('../models/Appointment.js');
        const { Prescription } = await import('../models/Prescription.js');

        // Appointment stats
        const appointmentStats = await Appointment.aggregate([
            { $match: { doctor: doctorId, appointmentDate: { $gte: startDate } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Total appointments
        const totalAppointments = appointmentStats.reduce((sum, stat) => sum + stat.count, 0);

        // Prescriptions written
        const prescriptionsCount = await Prescription.countDocuments({
            prescribedBy: doctorId,
            createdAt: { $gte: startDate },
        });

        // Patient distribution by status
        const patientStats = await Appointment.aggregate([
            { $match: { doctor: doctorId, appointmentDate: { $gte: startDate } } },
            {
                $group: {
                    _id: '$status',
                    uniquePatients: { $addToSet: '$patient' },
                },
            },
        ]);

        const patientDistribution = patientStats.map((stat) => ({
            status: stat._id,
            count: stat.uniquePatients.length,
        }));

        // Daily appointments trend
        const dailyAppointments = await Appointment.aggregate([
            { $match: { doctor: doctorId, appointmentDate: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'read',
            'appointment',
            {
                details: `Viewed doctor analytics for ${daysNum} days`,
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            periodDays: daysNum,
            totalAppointments,
            appointmentStats: appointmentStats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {} as Record<string, number>),
            prescriptionsCount,
            patientDistribution,
            dailyAppointments,
        });
    } catch (error) {
        console.error('Error fetching doctor analytics:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Analytics: Get admin dashboard stats
export const getAdminAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const { days = '30' } = req.query;
        const daysNum = parseInt(days as string);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);

        const { User } = await import('../models/User.js');
        const { Appointment } = await import('../models/Appointment.js');
        const { Vital } = await import('../models/Vital.js');

        // User stats
        const userStats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Appointment stats
        const appointmentStats = await Appointment.aggregate([
            { $match: { appointmentDate: { $gte: startDate } } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Vitals recorded
        const vitalsCount = await Vital.countDocuments({
            recordedAt: { $gte: startDate },
        });

        // Daily new registrations
        const dailyRegistrations = await User.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Audit log
        createAuditLog(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'read',
            'auth',
            {
                details: 'Viewed admin analytics',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            periodDays: daysNum,
            userStats: userStats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {} as Record<string, number>),
            appointmentStats: appointmentStats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {} as Record<string, number>),
            vitalsCount,
            dailyRegistrations,
        });
    } catch (error) {
        console.error('Error fetching admin analytics:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
