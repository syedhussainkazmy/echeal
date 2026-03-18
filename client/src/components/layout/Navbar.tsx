import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Stethoscope, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';

export const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="bg-white shadow sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-2">
                    <Stethoscope className="h-8 w-8 text-teal-600" />
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        Smart<span className="text-teal-600">Healthcare</span>
                    </h1>
                </Link>
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-700 font-medium">
                                Welcome, {user.firstName} ({user.role})
                            </span>
                            <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                                <LogOut className="h-4 w-4" />
                                Logout
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Link to="/login">
                                <Button variant="outline">Sign in</Button>
                            </Link>
                            <Link to="/register">
                                <Button>Get Started</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
