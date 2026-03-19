export type AppRole = 'admin' | 'doctor' | 'patient';

interface RoleTheme {
    /** border-* class for the page-level loading spinner */
    spinner: string;
    /** Primary accent text colour */
    accent: string;
    /** Primary accent background colour for solid buttons / icons */
    iconBg: string;
    /** Hover shade for solid buttons */
    accentHover: string;
    /** Light tinted background for subtle chips / backgrounds */
    accentLight: string;
    /** Text colour used on light-tinted backgrounds */
    accentLightText: string;
    /** focus:ring-* class for form inputs */
    focusRing: string;
}

export const roleTheme: Record<AppRole, RoleTheme> = {
    admin: {
        spinner: 'border-teal-600',
        accent: 'text-teal-600',
        iconBg: 'bg-teal-600',
        accentHover: 'hover:bg-teal-700',
        accentLight: 'bg-teal-50',
        accentLightText: 'text-teal-700',
        focusRing: 'focus:ring-teal-500',
    },
    doctor: {
        spinner: 'border-blue-600',
        accent: 'text-blue-600',
        iconBg: 'bg-blue-600',
        accentHover: 'hover:bg-blue-700',
        accentLight: 'bg-blue-50',
        accentLightText: 'text-blue-700',
        focusRing: 'focus:ring-blue-500',
    },
    patient: {
        spinner: 'border-teal-600',
        accent: 'text-teal-600',
        iconBg: 'bg-teal-600',
        accentHover: 'hover:bg-teal-700',
        accentLight: 'bg-teal-50',
        accentLightText: 'text-teal-700',
        focusRing: 'focus:ring-teal-500',
    },
};
