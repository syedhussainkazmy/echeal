import { Request, Response } from 'express';
import { Appointment } from '../models/Appointment.js';
import { AppointmentStatus } from '../models/Appointment.js';

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

        res.status(200).json({
            message: 'Video consultation ended',
            videoEndedAt: appointment.videoEndedAt,
        });
    } catch (error) {
        console.error('Error ending video consultation:', error);
        res.status(500).json({ message: 'Failed to end video consultation' });
    }
};
