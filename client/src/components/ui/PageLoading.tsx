import { roleTheme, type AppRole } from '../../lib/roleTheme';

export function PageLoading({ role }: { role: AppRole }) {
    return (
        <div className="flex justify-center items-center h-64">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${roleTheme[role].spinner}`} />
        </div>
    );
}
