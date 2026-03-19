import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Check, Clock, XCircle } from 'lucide-react';

interface TimelineEntry {
    timestamp: string;
    fromStatus: string | null;
    toStatus: string;
    actor: {
        firstName: string;
        lastName: string;
        email: string;
    };
    actorRole: 'doctor' | 'admin';
}

interface TimelineProps {
    entries: TimelineEntry[];
}

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <Clock className="w-4 h-4" /> },
    issued: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Check className="w-4 h-4" /> },
    dispensed: { bg: 'bg-green-100', text: 'text-green-700', icon: <Check className="w-4 h-4" /> },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-4 h-4" /> },
};

const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
};

export const Timeline = ({ entries }: TimelineProps) => {
    if (!entries || entries.length === 0) {
        return (
            <div className="text-center py-6 text-gray-500">
                <p>No status history available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Status Timeline</h3>
            {entries.map((entry, index) => {
                const toStatusColor = statusColors[entry.toStatus] || statusColors.draft;
                const actorName = `${entry.actor.firstName} ${entry.actor.lastName}`;
                const timeAgo = formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true });

                return (
                    <div key={index} className="flex gap-4">
                        {/* Timeline dot and line */}
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toStatusColor.bg} ${toStatusColor.text}`}>
                                {toStatusColor.icon}
                            </div>
                            {index < entries.length - 1 && <div className="w-0.5 h-12 bg-gray-300 mt-2" />}
                        </div>

                        {/* Timeline content */}
                        <div className="flex-1 pb-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-medium px-2 py-0.5 rounded text-sm ${toStatusColor.bg} ${toStatusColor.text}`}>
                                        {getStatusLabel(entry.toStatus)}
                                    </span>
                                    {entry.fromStatus && (
                                        <>
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs text-gray-600">
                                                from <span className="font-medium">{getStatusLabel(entry.fromStatus)}</span>
                                            </span>
                                        </>
                                    )}
                                </div>
                                <p className="text-sm text-gray-700">
                                    Changed by <span className="font-medium">{actorName}</span> ({entry.actorRole})
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
