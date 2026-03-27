import { useState } from 'react';
import api from '../../lib/api';
import { MessageSquare, Send, AlertTriangle, Stethoscope, Loader2 } from 'lucide-react';
import { PageLoading } from '../../components/ui/PageLoading';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export default function SymptomChecker() {
    const [symptoms, setSymptoms] = useState('');
    const [duration, setDuration] = useState('');
    const [severity, setSeverity] = useState('');
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symptoms.trim()) {
            setError('Please describe your symptoms');
            return;
        }

        setLoading(true);
        setError('');
        setAnalysis(null);

        try {
            const res = await api.post('/llm/symptoms', {
                symptoms: symptoms.trim(),
                duration: duration.trim() || undefined,
                severity: severity || undefined,
                additionalInfo: additionalInfo.trim() || undefined,
            });
            setAnalysis(res.data.analysis);
        } catch (err: unknown) {
            const message =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : 'Failed to analyze symptoms';
            setError(message || 'Failed to analyze symptoms');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-teal-100 rounded-full mb-4">
                    <Stethoscope className="h-6 w-6 text-teal-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Symptom Checker</h1>
                <p className="text-gray-500 mt-1">Describe your symptoms for a preliminary analysis</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-yellow-800">Important Notice</p>
                        <p className="text-sm text-yellow-700 mt-1">
                            This is not a medical diagnosis. Always consult a healthcare professional for proper evaluation and treatment.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Describe your symptoms *
                    </label>
                    <textarea
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="e.g., Headache for 2 days, mild fever, slight nausea..."
                        rows={4}
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        disabled={loading}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duration
                        </label>
                        <input
                            type="text"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="e.g., 2 days, 1 week"
                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Severity (1-10)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            placeholder="1-10"
                            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            disabled={loading}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Information
                    </label>
                    <textarea
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                        placeholder="Any other relevant information..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        disabled={loading}
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-md p-3">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !symptoms.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4" />
                            Analyze Symptoms
                        </>
                    )}
                </button>
            </form>

            {analysis && (
                <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-teal-50">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-teal-600" />
                            <h2 className="text-base font-semibold text-gray-800">Analysis Results</h2>
                        </div>
                    </div>
                    <div className="px-6 py-4">
                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                            {analysis}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
