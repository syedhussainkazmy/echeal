import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// LLM Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_TIMEOUT = Number(process.env.LLM_TIMEOUT || 60000);

// Initialize Gemini client (lazy loading)
let genAI: GoogleGenerativeAI | null = null;

const getGeminiClient = (): GoogleGenerativeAI => {
    if (!genAI) {
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured in .env');
        }
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
    return genAI;
};

// Check if LLM is configured
export const isLLMConfigured = (): boolean => {
    return !!GEMINI_API_KEY;
};

// Get model info
export const getModelInfo = (): { model: string; provider: string; configured: boolean } => {
    return {
        model: GEMINI_MODEL,
        provider: 'Google Gemini',
        configured: isLLMConfigured(),
    };
};

// Generic LLM chat function using Gemini
export const chatWithLLM = async (
    messages: { role: 'user' | 'model' | 'system'; content: string }[],
    options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }
): Promise<string> => {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
        model: options?.model || GEMINI_MODEL,
    });

    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        parts: [{ text: msg.content }],
    }));

    // Add system instruction if first message is system
    let systemInstruction: string | undefined;
    if (messages[0]?.role === 'system') {
        systemInstruction = messages[0].content;
    }

    const generationConfig = {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 1000,
        topP: 0.95,
        topK: 40,
    };

    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ];

    const chat = model.startChat({
        generationConfig,
        safetySettings,
        systemInstruction: systemInstruction,
        history: contents.slice(0, -1),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return response.text();
};

// Simple generate content (for non-chat use cases)
export const generateContent = async (
    prompt: string,
    systemInstruction?: string,
    options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }
): Promise<string> => {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
        model: options?.model || GEMINI_MODEL,
    });

    const generationConfig = {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 1000,
    };

    const request = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
    };

    if (systemInstruction) {
        Object.assign(request, { systemInstruction: [{ text: systemInstruction }] });
    }

    const result = await model.generateContent(request);
    return result.response.text();
};

// System prompts for different features
export const SYSTEM_PROMPTS = {
    symptomChecker: `You are a medical symptom analysis assistant. Your role is to:
1. Analyze user-reported symptoms
2. Provide possible causes (never diagnose definitively)
3. Suggest self-care measures when appropriate
4. Recommend when to seek medical attention
5. Never provide specific medical treatments or prescriptions

Important reminders:
- Always recommend consulting a healthcare professional for serious symptoms
- Never claim to diagnose medical conditions
- Prioritize patient safety in all recommendations
- Ask clarifying questions about symptom severity, duration, and related factors`,

    medicalScribe: `You are a medical scribe assisting healthcare providers. Your role is to:
1. Transform consultation notes into structured medical records
2. Organize symptoms, observations, and recommendations
3. Format prescriptions clearly
4. Maintain proper medical documentation standards
5. Ensure HIPAA compliance in documentation

Format the output as structured clinical notes with:
- Chief Complaint
- History of Present Illness
- Physical Examination Findings
- Assessment
- Plan
- Prescriptions (if any)`,

    healthChatbot: `You are a friendly healthcare information assistant. Your role is to:
1. Provide general health information
2. Answer questions about medications and interactions
3. Explain medical procedures in simple terms
4. Offer wellness and prevention advice
5. Direct users to appropriate healthcare resources

Guidelines:
- Provide accurate, evidence-based information
- Always encourage consulting healthcare professionals
- Use clear, simple language
- Prioritize patient education and safety
- Never provide specific medical diagnoses`,

    appointmentTriage: `You are a healthcare appointment triage assistant. Your role is to:
1. Assess the urgency of health concerns
2. Determine appropriate appointment types
3. Flag emergency situations
4. Suggest specialist referrals when needed

Triage categories:
- Emergency: Immediate medical attention required
- Urgent: Appointment within 24-48 hours
- Standard: Regular appointment within 1-2 weeks
- Wellness: Preventive care visit`,

    prescriptionSummary: `You are a prescription analysis assistant. Your role is to:
1. Summarize medication instructions in simple terms
2. Explain potential side effects
3. Provide administration tips
4. Highlight important warnings

Format the output as:
- Medication Name
- Purpose
- Dosage Instructions
- Side Effects
- Important Notes`,
} as const;

export type SystemPromptKey = keyof typeof SYSTEM_PROMPTS;
