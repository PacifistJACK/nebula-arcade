import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const games = [
    {
        id: 'geodash',
        title: 'Neon Dash',
        description: 'Rhythm-based action platformer. Jump, fly, and flip your way through dangerous passages and spiky obstacles.',
        color: 'from-yellow-400 to-orange-600',
        path: '/games/geodash',
        delay: 0.05
    },
    {
        id: 'flappy',
        title: 'Flappy Neon',
        description: 'Guide your glowing bird through neon pipes. One tap gameplay, infinite challenge. How far can you fly?',
        color: 'from-cyan-400 to-blue-600',
        path: '/games/flappy',
        delay: 0.1
    },
    {
        id: 'shooter',
        title: 'Neon Shooter',
        description: 'First-person target practice. Shoot glowing targets, build combos, and master your aim in this intense FPS challenge.',
        color: 'from-green-400 to-emerald-600',
        path: '/games/shooter',
        delay: 0.15
    },
    {
        id: 'racer',
        title: 'Neon Racer',
        description: 'High-speed racing action. Navigate the neon track, grab boosts, avoid obstacles, and complete 3 laps!',
        color: 'from-purple-400 to-pink-600',
        path: '/games/racer',
        delay: 0.2
    },
    {
        id: 'breaker',
        title: 'Cyber Breaker',
        description: 'Smash through layers of firewall blocks in this particle-rich arcade classic.',
        color: 'from-neon-pink to-rose-600',
        path: '/games/breaker',
        delay: 0.25
    },
    {
        id: 'snake',
        title: 'Neon Snake',
        description: 'Classic gameplay evolved. Navigate the grid, consume energy, and grow. Avoid the walls and yourself.',
        color: 'from-neon-green to-emerald-600',
        path: '/games/snake',
        delay: 0.3
    }
];

const GameSelect = () => {
    return (
        <div className="min-h-screen pt-24 px-6 md:px-12 pb-12">
            <motion.h2
                className="text-4xl md:text-5xl font-orbitron font-bold text-center mb-16 text-white text-glow"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                SELECT YOUR MISSION
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {games.map((game) => (
                    <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: game.delay }}
                    >
                        <Link
                            to={game.locked ? '#' : game.path}
                            className={`block h-full group relative overflow-hidden rounded-xl bg-[#0a0a1a] border border-white/10 hover:border-white/30 transition-all duration-300 ${game.locked ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-2 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]'}`}
                        >
                            {/* Card Gradient Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                            <div className="relative z-10 p-8 flex flex-col h-full">
                                <h3 className="text-3xl font-orbitron font-bold mb-4">{game.title}</h3>
                                <p className="text-gray-400 group-hover:text-gray-200 mb-8 flex-grow leading-relaxed">
                                    {game.description}
                                </p>

                                <div className="flex items-center justify-between mt-auto">
                                    <span className={`text-sm font-bold tracking-wider uppercase ${game.locked ? 'text-gray-500' : 'text-neon-blue group-hover:text-white'}`}>
                                        {game.locked ? 'Locked' : 'Play Now'}
                                    </span>
                                    {!game.locked && (
                                        <svg className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                    )}
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default GameSelect;
