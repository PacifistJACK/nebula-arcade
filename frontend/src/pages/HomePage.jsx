import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const HomePage = () => {
    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[100px] animate-pulse-glow"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[100px] animate-spin-slow"></div>
            </div>

            <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                <motion.h1
                    className="text-6xl md:text-8xl font-bold font-orbitron mb-6 text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-purple text-glow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    ENTER THE NEBULA
                </motion.h1>

                <motion.p
                    className="text-xl md:text-2xl text-gray-300 mb-12 font-light"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                >
                    Experience next-gen browser gaming. High performance. Immersive visuals.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <Link
                        to="/games"
                        className="group relative inline-flex items-center gap-3 px-12 py-4 bg-transparent border border-neon-blue/50 text-neon-blue text-lg font-bold tracking-widest uppercase rounded-sm hover:bg-neon-blue hover:text-black transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,243,255,0.6)]"
                    >
                        <span className="relative z-10">Start Playing</span>
                        <div className="absolute inset-0 bg-neon-blue/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </Link>
                </motion.div>
            </div>

            {/* Decorative Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none"></div>
        </div>
    );
};

export default HomePage;
