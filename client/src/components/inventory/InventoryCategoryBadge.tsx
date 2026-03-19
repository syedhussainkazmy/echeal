import { StatusBadge } from '../ui/StatusBadge';

type ItemCategory = 'medicine' | 'equipment' | 'supplies';

const categoryColors: Record<ItemCategory, string> = {
    medicine: 'bg-blue-100 text-blue-700 border-blue-200',
    equipment: 'bg-purple-100 text-purple-700 border-purple-200',
    supplies: 'bg-teal-100 text-teal-700 border-teal-200',
};

export function InventoryCategoryBadge({ category }: { category: string }) {
    const colorClass = categoryColors[category as ItemCategory] ?? 'bg-gray-100 text-gray-700 border-gray-200';
    return <StatusBadge colorClass={colorClass} label={category} />;
}
