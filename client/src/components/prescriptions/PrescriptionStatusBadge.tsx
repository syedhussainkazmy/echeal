import { StatusBadge } from '../ui/StatusBadge';

type PrescriptionStatus = 'draft' | 'issued' | 'dispensed' | 'cancelled';

const statusStyles: Record<PrescriptionStatus, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    issued: 'bg-blue-100 text-blue-700 border-blue-200',
    dispensed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export function PrescriptionStatusBadge({ status }: { status: PrescriptionStatus }) {
    return <StatusBadge colorClass={statusStyles[status]} label={status} />;
}
