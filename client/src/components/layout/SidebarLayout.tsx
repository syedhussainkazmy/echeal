import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SidebarConfig {
    brandIcon: LucideIcon;
    brandLabel: string;
    brandName: string;
    navItems: { to: string; icon: LucideIcon; label: string }[];
    rootPath: string;
    // layout
    mainBg: string;
    sidebarBg: string;
    sidebarExtra?: string;  // border, shadow, etc.
    headerBorder: string;
    footerBorder: string;
    // branding colours
    iconBg: string;
    iconShape: string;
    brandLabelColor: string;
    brandNameColor: string;
    // nav colours
    navActive: string;
    navInactive: string;
    navHover: string;
    // button colours
    toggleClass: string;
    logoutClass: string;
    // callback
    onLogout: () => void;
}

export default function SidebarLayout({
    config,
    children,
}: {
    config: SidebarConfig;
    children: React.ReactNode;
}) {
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('echeal-sidebar-collapsed') === 'true'; }
        catch { return false; }
    });

    const toggle = () =>
        setCollapsed((c) => {
            const next = !c;
            try { localStorage.setItem('echeal-sidebar-collapsed', String(next)); } catch { /* ignore */ }
            return next;
        });

    const BrandIcon = config.brandIcon;

    return (
        <div className={cn('flex h-screen overflow-hidden', config.mainBg)}>
            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <aside
                className={cn(
                    'flex-shrink-0 flex flex-col transition-[width] duration-300 ease-in-out',
                    config.sidebarBg,
                    config.sidebarExtra,
                    collapsed ? 'w-16' : 'w-64',
                )}
            >
                {/* Brand header */}
                <div
                    className={cn(
                        'flex items-center',
                        config.headerBorder,
                        collapsed
                            ? 'flex-col py-3 px-2 gap-2'
                            : 'flex-row px-5 py-[1.375rem] justify-between',
                    )}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(config.iconBg, config.iconShape, 'p-2 flex-shrink-0')}>
                            <BrandIcon className="h-5 w-5 text-white" />
                        </div>
                        {!collapsed && (
                            <div className="min-w-0">
                                <p className={cn('text-xs uppercase tracking-wider', config.brandLabelColor)}>
                                    {config.brandLabel}
                                </p>
                                <p className={cn('font-semibold text-sm truncate', config.brandNameColor)}>
                                    {config.brandName}
                                </p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={toggle}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={cn('rounded-lg p-1.5 transition-colors flex-shrink-0', config.toggleClass)}
                    >
                        {collapsed
                            ? <ChevronRight className="h-4 w-4" />
                            : <ChevronLeft className="h-4 w-4" />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-hidden">
                    {config.navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === config.rootPath}
                            title={collapsed ? label : undefined}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center rounded-lg text-sm font-medium transition-colors',
                                    collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                                    isActive
                                        ? config.navActive
                                        : cn(config.navInactive, config.navHover),
                                )
                            }
                        >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            {!collapsed && <span>{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout footer */}
                <div className={cn(config.footerBorder, collapsed ? 'p-2' : 'p-4')}>
                    <button
                        onClick={config.onLogout}
                        title={collapsed ? 'Sign Out' : undefined}
                        className={cn(
                            'flex items-center w-full rounded-lg text-sm font-medium transition-colors',
                            collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                            config.logoutClass,
                        )}
                    >
                        <LogOut className="h-4 w-4 flex-shrink-0" />
                        {!collapsed && 'Sign Out'}
                    </button>
                </div>
            </aside>

            {/* ── Page content ──────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">{children}</div>
            </main>
        </div>
    );
}
