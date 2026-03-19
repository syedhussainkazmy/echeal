export function StatusBadge({ colorClass, label }: { colorClass: string; label: string }) {
    return (
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${colorClass}`}>
            {label}
        </span>
    );
}
