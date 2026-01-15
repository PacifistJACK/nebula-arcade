import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            console.log('[Layout] Logout button clicked');
            await signOut();
            console.log('[Layout] Sign out successful, navigating to home');
            navigate('/');
        } catch (error) {
            console.error('[Layout] Logout error:', error);
            alert('Logout failed: ' + error.message);
        }
    };

    return (
        <div className="min-h-screen text-white font-inter">
            <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/10 px-6 py-4 flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold font-orbitron tracking-wider text-neon-blue text-glow">
                    NEBULA ARCADE
                </Link>
                <div className="flex items-center gap-8">
                    <Link to="/" className={`hover:text-neon-blue transition-colors ${location.pathname === '/' ? 'text-neon-blue' : 'text-gray-300'}`}>Home</Link>
                    <Link to="/games" className={`hover:text-neon-blue transition-colors ${location.pathname.startsWith('/games') ? 'text-neon-blue' : 'text-gray-300'}`}>Games</Link>
                    <Link to="/leaderboard" className={`hover:text-neon-blue transition-colors ${location.pathname === '/leaderboard' ? 'text-neon-blue' : 'text-gray-300'}`}>Leaderboard</Link>

                    {user ? (
                        <div className="flex items-center gap-4 border-l border-white/20 pl-6">
                            <span className="text-sm font-mono text-neon-pink">
                                {user.user_metadata?.username || user.email.split('@')[0]}
                            </span>
                            <button
                                onClick={handleSignOut}
                                className="text-xs border border-white/30 px-3 py-1 rounded hover:bg-white hover:text-black transition-colors uppercase"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link to="/auth" className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded font-bold text-sm tracking-wide hover:shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all">
                            LOGIN
                        </Link>
                    )}
                </div>
            </nav>

            <main className="pt-20">
                <Outlet />
            </main>

            <footer className="py-8 text-center text-gray-500 text-sm">
                <p>&copy; 2026 Nebula Arcade. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Layout;
