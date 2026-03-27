import { Response } from 'express';
import { AuthRequest, authenticate } from '../middlewares/auth.middleware.js';
import { chatWithLLM, SYSTEM_PROMPTS, isLLMConfigured, getModelInfo } from '../utils/llm.js';
import { logAudit } from '../utils/auditLogger.js';

// Helper to get user full name
const getUserName = (user: AuthRequest['user']): string => {
    if (!user) return 'Unknown';
    return `${user.firstName} ${user.lastName}`;
};

// Check if LLM is available
export const checkLLMStatus = async (req: AuthRequest, res: Response) => {
    try {
        const modelInfo = getModelInfo();

        res.status(200).json({
            ...modelInfo,
            message: modelInfo.configured
                ? 'LLM service is available'
                : 'LLM service is not configured. Set GEMINI_API_KEY environment variable.',
        });
    } catch (error) {
        console.error('Error checking LLM status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Symptom Checker - Analyze user symptoms
export const analyzeSymptoms = async (req: AuthRequest, res: Response) => {
    try {
        if (!isLLMConfigured()) {
            return res.status(503).json({
                message: 'LLM service is not configured. Please contact administrator.',
            });
        }

        const { symptoms, duration, severity, additionalInfo } = req.body;

        if (!symptoms || typeof symptoms !== 'string') {
            return res.status(400).json({ message: 'Symptoms description is required' });
        }

        const userMessage = `Please analyze the following symptoms:
- Symptoms: ${symptoms}
- Duration: ${duration || 'Not specified'}
- Severity (1-10): ${severity || 'Not specified'}
- Additional Information: ${additionalInfo || 'None'}

Please provide:
1. Possible causes (list 3-5 most common possibilities)
2. Self-care recommendations
3. Warning signs that require immediate medical attention
4. Whether a doctor's visit is recommended`;

        const messages = [
            { role: 'system' as const, content: SYSTEM_PROMPTS.symptomChecker },
            { role: 'user' as const, content: userMessage },
        ];

        const analysis = await chatWithLLM(messages, { temperature: 0.5 });

        // Audit log (non-blocking)
        logAudit(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'create',
            'medical_record',
            {
                details: 'Used symptom checker',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
                metadata: { symptomLength: symptoms.length },
            }
        );

        res.status(200).json({
            analysis,
            metadata: {
                timestamp: new Date(),
                model: getModelInfo().model,
            },
        });
    } catch (error) {
        console.error('Error analyzing symptoms:', error);
        res.status(500).json({ message: 'Failed to analyze symptoms' });
    }
};

// Medical Scribe - Convert consultation notes to structured records
export const generateClinicalNotes = async (req: AuthRequest, res: Response) => {
    try {
        if (!isLLMConfigured()) {
            return res.status(503).json({
                message: 'LLM service is not configured. Please contact administrator.',
            });
        }

        const { consultationNotes, patientInfo } = req.body;

        if (!consultationNotes || typeof consultationNotes !== 'string') {
            return res.status(400).json({ message: 'Consultation notes are required' });
        }

        const userMessage = `Consultation Notes:
${consultationNotes}

${patientInfo ? `Patient Information:\n- Name: ${patientInfo.name || 'N/A'}\n- Age: ${patientInfo.age || 'N/A'}\n- Gender: ${patientInfo.gender || 'N/A'}\n- Chief Complaint: ${patientInfo.chiefComplaint || 'N/A'}` : ''}

Please convert these notes into structured clinical notes with the following sections:
1. Chief Complaint
2. History of Present Illness
3. Physical Examination Findings
4. Assessment
5. Plan
6. Prescriptions (if any - list with dosage and frequency)
7. Follow-up Instructions`;

        const messages = [
            { role: 'system' as const, content: SYSTEM_PROMPTS.medicalScribe },
            { role: 'user' as const, content: userMessage },
        ];

        const clinicalNotes = await chatWithLLM(messages, { temperature: 0.3 });

        // Audit log (non-blocking)
        logAudit(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'create',
            'medical_record',
            {
                details: 'Generated clinical notes via medical scribe',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            clinicalNotes,
            metadata: {
                timestamp: new Date(),
                model: getModelInfo().model,
                originalNoteLength: consultationNotes.length,
            },
        });
    } catch (error) {
        console.error('Error generating clinical notes:', error);
        res.status(500).json({ message: 'Failed to generate clinical notes' });
    }
};

// Healthcare Chatbot - General health Q&A
export const healthChat = async (req: AuthRequest, res: Response) => {
    try {
        if (!isLLMConfigured()) {
            return res.status(503).json({
                message: 'LLM service is not configured. Please contact administrator.',
            });
        }

        const { message, context } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ message: 'Message is required' });
        }

        const userMessage = context
            ? `Context: ${context}\n\nQuestion: ${message}`
            : message;

        const messages = [
            { role: 'system' as const, content: SYSTEM_PROMPTS.healthChatbot },
            { role: 'user' as const, content: userMessage },
        ];

        const response = await chatWithLLM(messages, { temperature: 0.7 });

        // Audit log (non-blocking)
        logAudit(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'read',
            'medical_record',
            {
                details: 'Used healthcare chatbot',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
                metadata: { messageLength: message.length },
            }
        );

        res.status(200).json({
            response,
            metadata: {
                timestamp: new Date(),
                model: getModelInfo().model,
            },
        });
    } catch (error) {
        console.error('Error in health chat:', error);
        res.status(500).json({ message: 'Failed to get response' });
    }
};

// Appointment Triage - Assess urgency
export const triageAppointment = async (req: AuthRequest, res: Response) => {
    try {
        if (!isLLMConfigured()) {
            return res.status(503).json({
                message: 'LLM service is not configured. Please contact administrator.',
            });
        }

        const { concern, symptoms, isNewPatient } = req.body;

        if (!concern || typeof concern !== 'string') {
            return res.status(400).json({ message: 'Health concern description is required' });
        }

        const userMessage = `Patient Concern: ${concern}
Symptoms: ${symptoms || 'Not specified'}
New Patient: ${isNewPatient ? 'Yes' : 'No'}

Please assess and provide:
1. Triage Category (Emergency / Urgent / Standard / Wellness)
2. Reasoning for this classification
3. Recommended timeframe for appointment
4. Any immediate actions or precautions
5. Suggested specialist if applicable`;

        const messages = [
            { role: 'system' as const, content: SYSTEM_PROMPTS.appointmentTriage },
            { role: 'user' as const, content: userMessage },
        ];

        const triage = await chatWithLLM(messages, { temperature: 0.3 });

        // Audit log (non-blocking)
        logAudit(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'create',
            'appointment',
            {
                details: 'Used appointment triage',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            triage,
            metadata: {
                timestamp: new Date(),
                model: getModelInfo().model,
            },
        });
    } catch (error) {
        console.error('Error in appointment triage:', error);
        res.status(500).json({ message: 'Failed to assess urgency' });
    }
};

// Generate prescription summary
export const generatePrescriptionSummary = async (req: AuthRequest, res: Response) => {
    try {
        if (!isLLMConfigured()) {
            return res.status(503).json({
                message: 'LLM service is not configured. Please contact administrator.',
            });
        }

        const { medications, patientConditions } = req.body;

        if (!medications || !Array.isArray(medications) || medications.length === 0) {
            return res.status(400).json({ message: 'Medications array is required' });
        }

        const medicationsList = medications
            .map((m, i) => `${i + 1}. ${m.name} - ${m.dosage} (${m.frequency})`)
            .join('\n');

        const userMessage = `Patient's current medications:
${medicationsList}

${patientConditions ? `Patient conditions: ${patientConditions}` : ''}

Please provide:
1. Medication summary in patient-friendly language
2. Key instructions for each medication
3. Common side effects to watch for
4. Important drug interactions or contraindications
5. Lifestyle recommendations`;

        const messages = [
            { role: 'system' as const, content: SYSTEM_PROMPTS.healthChatbot },
            { role: 'user' as const, content: userMessage },
        ];

        const summary = await chatWithLLM(messages, { temperature: 0.5 });

        // Audit log (non-blocking)
        logAudit(
            req.user!.id,
            req.user!.role,
            getUserName(req.user),
            'create',
            'prescription',
            {
                details: 'Generated prescription summary',
                ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress,
                userAgent: req.headers['user-agent'],
            }
        );

        res.status(200).json({
            summary,
            metadata: {
                timestamp: new Date(),
                model: getModelInfo().model,
                medicationCount: medications.length,
            },
        });
    } catch (error) {
        console.error('Error generating prescription summary:', error);
        res.status(500).json({ message: 'Failed to generate summary' });
    }
};
