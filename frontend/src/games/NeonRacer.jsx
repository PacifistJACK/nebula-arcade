import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { scoresApi } from '../lib/scores';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

const NeonRacer = () => {
    const canvasRef = useRef(null);
    const { user } = useAuth();

    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [highScoreUser, setHighScoreUser] = useState("Loading...");
    const [gameState, setGameState] = useState('MENU');
    const [speed, setSpeed] = useState(0);
    const [crashes, setCrashes] = useState(0);

    const scoreRef = useRef(0);
    const crashesRef = useRef(0);
    const speedRef = useRef(5);

    const playerRef = useRef({
        x: CANVAS_WIDTH / 2 - 20,
        y: CANVAS_HEIGHT - 120,
        width: 40,
        height: 70,
        lane: 1 // 0, 1, 2 (left, middle, right)
    });

    const carsRef = useRef([]);
    const roadLinesRef = useRef([]);
    const particlesRef = useRef([]);
    const roadOffsetRef = useRef(0);

    const keysRef = useRef({ a: false, d: false, left: false, right: false });
    const animationFrameRef = useRef(null);
    const lastTimeRef = useRef(0);
    const spawnTimerRef = useRef(0);
    const audioCtxRef = useRef(null);

    useEffect(() => {
        const fetchScore = async () => {
            const leaderboard = await scoresApi.getLeaderboard('neon-racer', 1);
            if (leaderboard && leaderboard.length > 0) {
                setHighScore(leaderboard[0].score);
                if (leaderboard[0].username) setHighScoreUser(leaderboard[0].username);
            } else {
                setHighScoreUser("None");
            }
        };
        fetchScore();
    }, []);

    const initAudio = () => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    const playSound = (type) => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const now = ctx.currentTime;

        try {
            if (type === 'pass') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'crash') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(100, now);
                osc.type = 'sawtooth';
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
            }
        } catch (e) { }
    };

    const initGame = () => {
        initAudio();

        scoreRef.current = 0;
        crashesRef.current = 0;
        speedRef.current = 5;
        roadOffsetRef.current = 0;
        spawnTimerRef.current = 0;

        playerRef.current = {
            x: CANVAS_WIDTH / 2 - 20,
            y: CANVAS_HEIGHT - 120,
            width: 40,
            height: 70,
            lane: 1
        };

        carsRef.current = [];
        particlesRef.current = [];

        // Initialize road lines
        roadLinesRef.current = [];
        for (let i = 0; i < 15; i++) {
            roadLinesRef.current.push({
                y: i * 50
            });
        }

        setScore(0);
        setCrashes(0);
        setSpeed(50);
        setGameState('PLAYING');

        lastTimeRef.current = performance.now();
    };

    const getLaneX = (lane) => {
        const laneWidth = 120;
        const startX = CANVAS_WIDTH / 2 - laneWidth * 1.5;
        return startX + lane * laneWidth + laneWidth / 2 - 20;
    };

    const spawnCar = () => {
        const lane = Math.floor(Math.random() * 3);
        const colors = ['#ff0066', '#ff6600', '#ffff00', '#00ff66', '#0066ff', '#ff00ff'];

        carsRef.current.push({
            x: getLaneX(lane),
            y: -100,
            width: 40,
            height: 70,
            lane: lane,
            speed: 3 + Math.random() * 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            passed: false
        });
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'a' || key === 'arrowleft') {
                keysRef.current.a = true;
                keysRef.current.left = true;
                if (gameState === 'PLAYING' && playerRef.current.lane > 0) {
                    playerRef.current.lane--;
                    playerRef.current.x = getLaneX(playerRef.current.lane);
                }
            }
            if (key === 'd' || key === 'arrowright') {
                keysRef.current.d = true;
                keysRef.current.right = true;
                if (gameState === 'PLAYING' && playerRef.current.lane < 2) {
                    playerRef.current.lane++;
                    playerRef.current.x = getLaneX(playerRef.current.lane);
                }
            }
        };

        const handleKeyUp = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'a' || key === 'arrowleft') { keysRef.current.a = false; keysRef.current.left = false; }
            if (key === 'd' || key === 'arrowright') { keysRef.current.d = false; keysRef.current.right = false; }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState]);

    useEffect(() => {
        if (gameState !== 'PLAYING') {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const loop = (timestamp) => {
            const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
            lastTimeRef.current = timestamp;

            update(dt);
            draw(ctx);

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [gameState]);

    const update = (dt) => {
        // Increase speed over time
        speedRef.current = Math.min(speedRef.current + dt * 0.5, 15);
        setSpeed(Math.round(speedRef.current * 10));

        // Update road lines
        roadOffsetRef.current += speedRef.current * dt * 60;
        roadLinesRef.current.forEach(line => {
            line.y += speedRef.current * dt * 60;
            if (line.y > CANVAS_HEIGHT) {
                line.y = -50;
            }
        });

        // Spawn cars
        spawnTimerRef.current -= dt;
        if (spawnTimerRef.current <= 0) {
            spawnCar();
            spawnTimerRef.current = Math.max(0.8, 2 - speedRef.current * 0.1);
        }

        // Update enemy cars
        const player = playerRef.current;

        for (let i = carsRef.current.length - 1; i >= 0; i--) {
            const car = carsRef.current[i];
            car.y += (speedRef.current + car.speed) * dt * 60;

            // Remove off-screen cars
            if (car.y > CANVAS_HEIGHT + 100) {
                carsRef.current.splice(i, 1);
                continue;
            }

            // Check collision
            if (!car.passed &&
                Math.abs(car.x - player.x) < 35 &&
                Math.abs(car.y - player.y) < 60) {

                crashesRef.current++;
                setCrashes(crashesRef.current);
                playSound('crash');

                // Crash particles
                for (let j = 0; j < 30; j++) {
                    particlesRef.current.push({
                        x: player.x + 20,
                        y: player.y + 35,
                        vx: (Math.random() - 0.5) * 12,
                        vy: (Math.random() - 0.5) * 12,
                        life: 1.0,
                        color: car.color,
                        size: Math.random() * 5 + 2
                    });
                }

                car.passed = true;

                // Game over after 3 crashes
                if (crashesRef.current >= 3) {
                    endGame();
                    return;
                }
            }

            // Mark as passed and award score
            if (car.y > player.y + 50 && !car.passed) {
                car.passed = true;
                scoreRef.current += 10;
                setScore(scoreRef.current);
                playSound('pass');
            }
        }

        // Update particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vy += 0.5;
            p.vx *= 0.98;
            p.life -= dt * 2;
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }
    };

    const draw = (ctx) => {
        // Background gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        bgGradient.addColorStop(0, '#1a1a35');
        bgGradient.addColorStop(1, '#0a0a15');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Road
        const laneWidth = 120;
        const roadWidth = laneWidth * 3;
        const roadX = CANVAS_WIDTH / 2 - roadWidth / 2;

        const roadGradient = ctx.createLinearGradient(roadX, 0, roadX + roadWidth, 0);
        roadGradient.addColorStop(0, '#1a1a1a');
        roadGradient.addColorStop(0.5, '#2a2a2a');
        roadGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = roadGradient;
        ctx.fillRect(roadX, 0, roadWidth, CANVAS_HEIGHT);

        // Road edges
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(roadX, 0);
        ctx.lineTo(roadX, CANVAS_HEIGHT);
        ctx.moveTo(roadX + roadWidth, 0);
        ctx.lineTo(roadX + roadWidth, CANVAS_HEIGHT);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Lane dividers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 20]);

        roadLinesRef.current.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(roadX + laneWidth, line.y);
            ctx.lineTo(roadX + laneWidth, line.y + 30);
            ctx.moveTo(roadX + laneWidth * 2, line.y);
            ctx.lineTo(roadX + laneWidth * 2, line.y + 30);
            ctx.stroke();
        });

        ctx.setLineDash([]);

        // Enemy cars
        carsRef.current.forEach(car => {
            ctx.save();

            // Car glow
            ctx.shadowBlur = 25;
            ctx.shadowColor = car.color;

            // Car body
            const carGradient = ctx.createLinearGradient(car.x, car.y, car.x, car.y + car.height);
            carGradient.addColorStop(0, car.color);
            carGradient.addColorStop(1, '#000000');
            ctx.fillStyle = carGradient;
            ctx.fillRect(car.x, car.y, car.width, car.height);

            // Car details
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(car.x + 5, car.y + 10, car.width - 10, 15); // Windshield

            ctx.fillStyle = '#ff0000';
            ctx.fillRect(car.x + 5, car.y + car.height - 5, car.width - 10, 3); // Tail lights

            ctx.restore();
        });

        // Particles
        particlesRef.current.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Player car
        const player = playerRef.current;
        ctx.save();

        // Player glow
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#00ffff';

        // Player body
        const playerGradient = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.height);
        playerGradient.addColorStop(0, '#00ffff');
        playerGradient.addColorStop(0.5, '#0088ff');
        playerGradient.addColorStop(1, '#0044aa');
        ctx.fillStyle = playerGradient;
        ctx.fillRect(player.x, player.y, player.width, player.height);

        // Player details
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(player.x + 5, player.y + 15, player.width - 10, 20); // Windshield

        ctx.fillStyle = '#ffff00';
        ctx.fillRect(player.x + 5, player.y + 5, player.width - 10, 3); // Headlights

        // Spoiler
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(player.x - 5, player.y + player.height - 10, player.width + 10, 5);

        ctx.restore();

        ctx.shadowBlur = 0;
    };

    const endGame = () => {
        setGameState('GAME_OVER');

        if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
            setHighScoreUser("YOU");
            const username = user?.user_metadata?.username || user?.email?.split('@')[0] || "Anonymous";
            if (user) {
                scoresApi.submitScore(user.id, username, 'neon-racer', scoreRef.current);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[90vh]">
            <div className="mb-4 flex justify-between w-full max-w-[900px] glass-panel p-4 rounded-lg">
                <h2 className="text-2xl font-orbitron text-cyan-400">NEON RACER</h2>
                <div className="flex gap-6">
                    <div className="text-xl font-bold">CRASHES: <span className={crashes >= 2 ? "text-red-400" : "text-yellow-400"}>{crashes}/3</span></div>
                    <div className="text-xl font-bold">SPEED: <span className="text-neon-pink">{speed}</span></div>
                    <div className="text-xl font-bold">SCORE: <span className="text-neon-blue">{score}</span></div>
                </div>
            </div>

            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border-2 border-cyan-500/30 rounded-lg bg-[#050510] shadow-[0_0_50px_rgba(0,243,255,0.15)]"
                    style={{ maxWidth: '100%', height: 'auto' }}
                />

                {gameState !== 'PLAYING' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                        <div className="text-center p-8">
                            <h3 className="text-5xl font-black font-orbitron text-white mb-2 text-glow tracking-tighter">
                                {gameState === 'GAME_OVER' ? 'GAME OVER!' : 'NEON RACER'}
                            </h3>

                            {gameState === 'GAME_OVER' && (
                                <>
                                    <p className="text-2xl mb-2 text-cyan-400 font-orbitron">SCORE: {score}</p>
                                    <p className="text-lg mb-4 text-gray-400">HIGH: {highScore} ({highScoreUser})</p>
                                </>
                            )}

                            {gameState === 'MENU' && (
                                <div className="mb-6 text-left text-gray-300 space-y-2">
                                    <p>🏎️ <span className="text-cyan-400">A/D or Arrows</span> to switch lanes</p>
                                    <p>🚗 <span className="text-yellow-400">Dodge traffic</span> - overtake cars!</p>
                                    <p>💥 <span className="text-red-400">3 crashes</span> = Game Over</p>
                                    <p>⚡ Speed increases over time!</p>
                                    <p>🏆 Score points for each car passed</p>
                                </div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={initGame}
                                className="px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xl uppercase tracking-widest rounded mt-4"
                            >
                                {gameState === 'GAME_OVER' ? 'RACE AGAIN' : 'START RACE'}
                            </motion.button>
                        </div>
                    </div>
                )}
            </div>

            <p className="mt-8 text-gray-500 text-xs font-mono">
                A/D OR ARROW KEYS TO SWITCH LANES • DODGE TRAFFIC!
            </p>
        </div>
    );
};

export default NeonRacer;
