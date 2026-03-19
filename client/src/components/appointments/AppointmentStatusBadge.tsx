import { StatusBadge } from '../ui/StatusBadge';

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

const statusColors: Record<AppointmentStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export function AppointmentStatusBadge({ status }: { status: string }) {
    const colorClass = statusColors[status as AppointmentStatus] ?? 'bg-gray-100 text-gray-700 border-gray-200';
    return <StatusBadge colorClass={colorClass} label={status} />;
}
