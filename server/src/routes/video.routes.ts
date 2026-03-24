import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { createVideoRoom, getVideoRoom, endVideoConsultation } from '../controllers/video.controller.js';

const router = Router();

router.post('/room/:appointmentId', verifyToken, createVideoRoom);
router.get('/room/:appointmentId', verifyToken, getVideoRoom);
router.post('/room/:appointmentId/end', verifyToken, endVideoConsultation);

export default router;
