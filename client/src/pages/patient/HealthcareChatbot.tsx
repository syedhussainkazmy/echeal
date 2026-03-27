import { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';
import { MessageCircle, Send, Loader2, Bot, User } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function HealthcareChatbot() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/llm/chat', {
                message: userMessage.content,
            });

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: res.data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err: unknown) {
            const message =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : 'Failed to get response';
            setError(message || 'Failed to get response');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                    <Bot className="h-6 w-6 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Health Assistant</h1>
                <p className="text-gray-500 text-sm">Ask questions about health, medications, and wellness</p>
            </div>

            <div className="bg-white rounded-md border border-gray-200 flex flex-col" style={{ height: '500px' }}>
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center py-8">
                            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Ask me anything about health and wellness!</p>
                            <p className="text-gray-400 text-sm mt-1">
                                Example questions:
                            </p>
                            <div className="mt-2 text-sm text-gray-400 space-y-1">
                                <p>- What are the benefits of regular exercise?</p>
                                <p>- How much water should I drink daily?</p>
                                <p>- What are common side effects of antibiotics?</p>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`flex items-start gap-2 max-w-[80%] ${
                                    msg.role === 'user'
                                        ? 'bg-teal-600 text-white rounded-lg rounded-tr-sm'
                                        : 'bg-gray-100 text-gray-800 rounded-lg rounded-tl-sm'
                                }`}
                            >
                                <div className="p-2">
                                    {msg.role === 'user' ? (
                                        <User className="h-4 w-4" />
                                    ) : (
                                        <Bot className="h-4 w-4" />
                                    )}
                                </div>
                                <div className="px-3 py-2">
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="flex items-start gap-2 max-w-[80%] bg-gray-100 rounded-lg rounded-tl-sm">
                                <div className="p-2">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="px-3 py-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-100 rounded-md p-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your question..."
                            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="bg-teal-600 text-white p-2 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </form>
            </div>

            <p className="text-xs text-center text-gray-400">
                This is for informational purposes only. Always consult a healthcare professional for medical advice.
            </p>
        </div>
    );
}
