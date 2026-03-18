import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    if (!user) {
        const isAdminPath = location.pathname.startsWith('/admin');
        return <Navigate to={isAdminPath ? '/admin/login' : '/login'} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Determine fallback route
        const fallback = user.role === 'admin' ? '/admin' : user.role === 'doctor' ? '/doctor' : '/patient';
        return <Navigate to={fallback} replace />;
    }

    return <>{children}</>;
};
