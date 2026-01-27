import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from './AppContext';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles: ('admin' | 'coach' | 'parent' | 'player')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading } = useApp();

    // Still loading from localStorage - show loading spinner
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/90">
                <div className="text-white text-center">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    // Not logged in - redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but wrong role - redirect to their correct dashboard
    if (!allowedRoles.includes(user.role)) {
        const roleRoutes = {
            admin: '/admin/dashboard',
            coach: '/coach/dashboard',
            player: '/player/dashboard',
            parent: '/parent/dashboard'
        };
        return <Navigate to={roleRoutes[user.role]} replace />;
    }

    // Correct role - render the component
    return <>{children}</>;
}
