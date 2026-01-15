import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { scoresApi } from '../lib/scores';

const games = [
    { id: 'geodash', name: 'Neon Dash', color: 'from-yellow-400 to-orange-600' },
    { id: 'flappy-neon', name: 'Flappy Neon', color: 'from-cyan-400 to-blue-600' },
    { id: 'neon-shooter', name: 'Neon Shooter', color: 'from-green-400 to-emerald-600' },
    { id: 'neon-racer', name: 'Neon Racer', color: 'from-purple-400 to-pink-600' },
    { id: 'cyber-breaker', name: 'Cyber Breaker', color: 'from-neon-pink to-rose-600' },
    { id: 'snake', name: 'Neon Snake', color: 'from-neon-green to-emerald-600' }
];

const Leaderboard = () => {
    const [selectedGame, setSelectedGame] = useState('geodash');
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    // Refresh when selected game changes
    useEffect(() => {
        loadLeaderboard(selectedGame);
    }, [selectedGame]);

    // Also refresh when component mounts or becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('[Leaderboard] Page became visible, refreshing...');
                loadLeaderboard(selectedGame);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [selectedGame]);

    const loadLeaderboard = async (gameId) => {
        setLoading(true);
        try {
            console.log(`[Leaderboard] Loading scores for ${gameId}...`);
            const data = await scoresApi.getLeaderboard(gameId, 10);
            console.log(`[Leaderboard] Loaded ${data.length} scores for ${gameId}:`, data);
            setLeaderboard(data);
        } catch (error) {
            console.error('[Leaderboard] Error loading leaderboard:', error);
            setLeaderboard([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        console.log('[Leaderboard] Manual refresh requested');
        loadLeaderboard(selectedGame);
    };

    const selectedGameData = games.find(g => g.id === selectedGame);

    return (
        <div className="min-h-screen pt-24 px-6 md:px-12 pb-12">
            <div className="flex items-center justify-center gap-4 mb-8">
                <motion.h2
                    className="text-4xl md:text-5xl font-orbitron font-bold text-center text-white text-glow"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    GLOBAL LEADERBOARD
                </motion.h2>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg font-orbitron text-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh leaderboard"
                >
                    {loading ? '⟳' : '↻'}
                </button>
            </div>

            {/* Game Selector */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
                {games.map((game) => (
                    <button
                        key={game.id}
                        onClick={() => setSelectedGame(game.id)}
                        className={`px-6 py-3 rounded-lg font-orbitron font-bold transition-all duration-300 ${selectedGame === game.id
                            ? `bg-gradient-to-r ${game.color} text-black shadow-lg scale-105`
                            : 'bg-white/5 text-white hover:bg-white/10'
                            }`}
                    >
                        {game.name}
                    </button>
                ))}
            </div>

            {/* Leaderboard Table */}
            <div className="max-w-4xl mx-auto">
                <div className={`glass-panel rounded-xl overflow-hidden border-2 bg-gradient-to-br ${selectedGameData.color} bg-opacity-5`}>
                    <div className={`bg-gradient-to-r ${selectedGameData.color} p-4`}>
                        <h3 className="text-2xl font-orbitron font-bold text-black text-center">
                            {selectedGameData.name} - Top 10
                        </h3>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="inline-block w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-400">Loading rankings...</p>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-xl text-gray-400">No scores yet. Be the first to play!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/10">
                            {leaderboard.map((entry, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`p-4 flex items-center justify-between hover:bg-white/5 transition-colors ${index < 3 ? 'bg-white/5' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Rank */}
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-orbitron font-bold text-xl ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                                                index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                                                    'bg-white/10 text-white'
                                            }`}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                        </div>

                                        {/* Username */}
                                        <div className="flex-1">
                                            <p className="font-bold text-lg text-white">
                                                {entry.username || 'Anonymous'}
                                            </p>
                                        </div>

                                        {/* Score */}
                                        <div className={`text-right bg-gradient-to-r ${selectedGameData.color} bg-clip-text text-transparent`}>
                                            <p className="text-3xl font-orbitron font-bold">
                                                {entry.score.toLocaleString()}
                                            </p>
                                            <p className="text-xs text-gray-400">points</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Footer */}
                <div className="mt-8 text-center text-gray-500 text-sm">
                    <p>Rankings update in real-time. Play to claim your spot!</p>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
