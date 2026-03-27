import { Request, Response } from 'express';
import { Appointment } from '../models/Appointment.js';
import { AppointmentStatus } from '../models/Appointment.js';
import { createAuditLog } from '../models/AuditLog.js';

export const createVideoRoom = async (req: Request, res: Response) => {
    try {
        const { appointmentId } = req.params;
        const userId = (req as any).user.id;

        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Verify user is part of the appointment
        const isDoctor = appointment.doctor.toString() === userId;
        const isPatient = appointment.patient.toString() === userId;

        if (!isDoctor && !isPatient) {
            return res.status(403).json({ message: 'Not authorized to start video for this appointment' });
        }

        // Generate a unique room ID
        const roomId = `video-${appointmentId}`;

        // If doctor is starting, update the appointment
        if (isDoctor) {
            appointment.videoRoomId = roomId;
            appointment.videoStartedAt = new Date();
            await appointment.save();
        }

        // Audit: Log video room creation
        createAuditLog(
            userId,
            (req as any).user.role,
            (req as any).user.name,
            'video_call',
            'video',
            {
                resourceId: appointment._id,
                details: `Started video consultation for appointment ${appointmentId}`,
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            roomId,
            appointmentId: appointment._id,
            videoStartedAt: appointment.videoStartedAt,
        });
    } catch (error) {
        console.error('Error creating video room:', error);
        res.status(500).json({ message: 'Failed to create video room' });
    }
};

export const getVideoRoom = async (req: Request, res: Response) => {
    try {
        const { appointmentId } = req.params;
        const userId = (req as any).user.id;

        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Verify user is part of the appointment
        const isDoctor = appointment.doctor.toString() === userId;
        const isPatient = appointment.patient.toString() === userId;

        if (!isDoctor && !isPatient) {
            return res.status(403).json({ message: 'Not authorized to view this video room' });
        }

        if (!appointment.videoRoomId) {
            return res.status(404).json({ message: 'Video room not started yet' });
        }

        // Audit: Log video room access
        createAuditLog(
            userId,
            (req as any).user.role,
            (req as any).user.name,
            'read',
            'video',
            {
                resourceId: appointment._id,
                details: `Accessed video room for appointment ${appointmentId}`,
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            roomId: appointment.videoRoomId,
            appointmentId: appointment._id,
            videoStartedAt: appointment.videoStartedAt,
            videoEndedAt: appointment.videoEndedAt,
            isStarted: !!appointment.videoStartedAt,
        });
    } catch (error) {
        console.error('Error getting video room:', error);
        res.status(500).json({ message: 'Failed to get video room' });
    }
};

export const endVideoConsultation = async (req: Request, res: Response) => {
    try {
        const { appointmentId } = req.params;
        const userId = (req as any).user.id;

        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Verify only doctor can end the consultation
        if (appointment.doctor.toString() !== userId) {
            return res.status(403).json({ message: 'Only doctor can end the consultation' });
        }

        appointment.videoEndedAt = new Date();
        await appointment.save();

        // Audit: Log video consultation end
        createAuditLog(
            userId,
            (req as any).user.role,
            (req as any).user.name,
            'video_call',
            'video',
            {
                resourceId: appointment._id,
                details: `Ended video consultation for appointment ${appointmentId}`,
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            message: 'Video consultation ended',
            videoEndedAt: appointment.videoEndedAt,
        });
    } catch (error) {
        console.error('Error ending video consultation:', error);
        res.status(500).json({ message: 'Failed to end video consultation' });
    }
};
