import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const AuthPage = () => {
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [signupSuccess, setSignupSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (isLogin) {
                await signIn(email, password);
                navigate('/'); // Redirect to Home
            } else {
                await signUp(email, password, username);
                setSignupSuccess(true);
                setEmail('');
                setPassword('');
                setUsername('');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050510] text-white p-4">
            <div className="w-full max-w-md p-8 rounded-2xl glass-panel relative overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(100,0,255,0.2)]">

                {/* Background Glow */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-600 rounded-full blur-[100px] opacity-20"></div>
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>

                <h2 className="text-4xl font-black font-orbitron text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    {isLogin ? 'SYSTEM LOGIN' : 'NEW USER REGISTRY'}
                </h2>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                {signupSuccess && (
                    <div className="bg-green-500/20 border border-green-500/50 text-green-200 p-4 rounded mb-4 text-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">📧</span>
                            <h3 className="font-bold text-green-400">Check Your Inbox!</h3>
                        </div>
                        <p className="text-gray-300">
                            We've sent a verification link to <strong>{email || 'your email'}</strong>.
                            Click the link to activate your account.
                        </p>
                        <button
                            onClick={() => setSignupSuccess(false)}
                            className="mt-3 text-xs text-green-400 hover:text-green-300 underline"
                        >
                            Back to login
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black/40 border border-white/20 rounded p-3 focus:border-neon-blue focus:outline-none transition-colors text-white font-mono"
                                placeholder="ENTER_CODENAME"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">Email Coordinates</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/20 rounded p-3 focus:border-neon-blue focus:outline-none transition-colors text-white font-mono"
                            placeholder="USER@DOMAIN.COM"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">Access Key (Password)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/20 rounded p-3 focus:border-neon-blue focus:outline-none transition-colors text-white font-mono"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded font-orbitron tracking-widest uppercase hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] disabled:opacity-50"
                    >
                        {loading ? 'PROCESSING...' : (isLogin ? 'INITIATE SESSION' : 'REGISTER ID')}
                    </motion.button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                    {isLogin ? "No Access ID?" : "Already Registered?"}{" "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-neon-blue hover:text-white underline"
                    >
                        {isLogin ? "Create Account" : "Login"}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
