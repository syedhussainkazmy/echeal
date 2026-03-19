import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { PageLoading } from '../ui/PageLoading';

export { PageLoading as DashboardLoading };

export function DashboardHeader({ title, subtitle }: { title: ReactNode; subtitle: ReactNode }) {
    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-500 mt-1">{subtitle}</p>
        </div>
    );
}

interface DashboardStatCardProps {
    label: string;
    value: ReactNode;
    icon: LucideIcon;
    iconWrapClass: string;
    iconClass: string;
    linkTo?: string;
    alertText?: string;
}

export function DashboardStatCard({
    label,
    value,
    icon: Icon,
    iconWrapClass,
    iconClass,
    linkTo,
    alertText,
}: DashboardStatCardProps) {
    const card = (
        <div className={`bg-white rounded-md p-5 border ${alertText ? 'border-red-200' : 'border-gray-100'} flex items-center gap-4`}>
                <div className={`${iconWrapClass} rounded p-3`}>
                <Icon className={`h-6 w-6 ${iconClass}`} />
            </div>
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {alertText && <p className="text-xs text-red-600 mt-0.5">{alertText}</p>}
            </div>
        </div>
    );

    if (!linkTo) {
        return card;
    }

    return (
        <Link to={linkTo} className="group block rounded-md">
                {card}
        </Link>
    );
}

export function DashboardSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return (
            <div className="bg-white rounded-md border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                {action}
            </div>
            {children}
        </div>
    );
}

export function DashboardEmptyState({ icon: Icon, title, action }: { icon: LucideIcon; title: string; action?: ReactNode }) {
    return (
        <div className="text-center py-10">
            <Icon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{title}</p>
            {action}
        </div>
    );
}
