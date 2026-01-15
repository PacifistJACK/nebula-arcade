import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { scoresApi } from '../lib/scores';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const BLOCK_SIZE = 40;
const GRAVITY = 0.7; // Stronger gravity for snappy fell
const JUMP_FORCE = -13; // Jump height to approx 2.2 blocks
const TERMINAL_VELOCITY = 15;
const GROUND_Y = CANVAS_HEIGHT - 60;
const GAME_SPEED_START = 8;
const GAME_SPEED_MAX = 15;

// Audio synth constants
const BASS_NOTES = [130.81, 155.56, 174.61, 196.00, 233.08]; // C3, Eb3, F3, G3, Bb3
const LEAD_NOTES = [523.25, 622.25, 698.46, 783.99, 932.33]; // C5, Eb5, F5, G5, Bb5

const GeoDashGame = () => {
    const canvasRef = useRef(null);
    const { user } = useAuth();
    const [score, setScore] = useState(0);
    const [personalBest, setPersonalBest] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);

    // Audio Context Ref
    const audioCtxRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const noteIndexRef = useRef(0);

    // Refs for game state to avoid closure staleness in loop
    const scoreRef = useRef(0);
    const stateRef = useRef({
        player: {
            x: 120,
            y: GROUND_Y - BLOCK_SIZE,
            size: BLOCK_SIZE,
            hitboxSize: BLOCK_SIZE - 4, // Slightly tighter hitbox
            dy: 0,
            angle: 0,
            grounded: true,
            dead: false
        },
        obstacles: [],
        particles: [],
        bgParticles: Array.from({ length: 40 }, () => ({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 3 + 1,
            speedX: Math.random() * -1 - 0.5,
            color: `hsl(${Math.random() * 60 + 40}, 100%, 70%)`
        })),
        camera: { x: 0 },
        speed: GAME_SPEED_START,
        frame: 0
    });

    const initAudio = () => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(e => console.error("Audio resume failed", e));
        }
    };

    // Load Personal Best
    useEffect(() => {
        const fetchPersonalBest = async () => {
            if (user) {
                const best = await scoresApi.getUserBest(user.id, 'geodash');
                setPersonalBest(best);
            }
        };
        fetchPersonalBest();
    }, [user]);

    const initGame = () => {
        initAudio(); // Wake Audio

        stateRef.current = {
            player: {
                x: 120,
                y: GROUND_Y - BLOCK_SIZE,
                size: BLOCK_SIZE,
                hitboxSize: BLOCK_SIZE - 4,
                dy: 0,
                angle: 0,
                grounded: true,
                dead: false
            },
            obstacles: [],
            particles: [],
            bgParticles: Array.from({ length: 40 }, () => ({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                size: Math.random() * 3 + 1,
                speedX: Math.random() * -1 - 0.5,
                color: `hsl(${Math.random() * 60 + 40}, 100%, 70%)`
            })),
            camera: { x: 0 },
            speed: GAME_SPEED_START,
            frame: 0
        };

        scoreRef.current = 0;
        setScore(0);

        setGameOver(false);
        setGameStarted(true);
        generateInitialObstacles();

        // Reset Audio Timing
        if (audioCtxRef.current) {
            nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.1;
        }
        noteIndexRef.current = 0;
    };

    const playTone = (freq, type = 'square', duration = 0.1, time) => {
        if (!audioCtxRef.current) return;
        try {
            const osc = audioCtxRef.current.createOscillator();
            const gain = audioCtxRef.current.createGain();
            osc.frequency.value = freq;
            osc.type = type;
            osc.connect(gain);
            gain.connect(audioCtxRef.current.destination);

            osc.start(time);
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            osc.stop(time + duration);
        } catch (e) { /* Ignore */ }
    };

    const updateMusic = () => {
        if (!audioCtxRef.current || !gameStarted || stateRef.current.player.dead) return;

        const now = audioCtxRef.current.currentTime;
        if (nextNoteTimeRef.current < now - 0.5) nextNoteTimeRef.current = now; // Sync if drifted

        const tempo = 120 + (stateRef.current.speed - GAME_SPEED_START) * 5; // Music speeds up
        const secondsPerBeat = 60.0 / tempo;
        const lookahead = 0.1;

        while (nextNoteTimeRef.current < now + lookahead) {
            // Schedule sound
            const beat = noteIndexRef.current % 8;

            // Bass Kick (every beat)
            if (beat % 2 === 0) playTone(60, 'sawtooth', 0.1, nextNoteTimeRef.current);

            // Melody (random pentatonic)
            if (Math.random() > 0.3) {
                const note = LEAD_NOTES[Math.floor(Math.random() * LEAD_NOTES.length)];
                playTone(note, 'square', 0.1, nextNoteTimeRef.current);
            }

            // Hi-hat
            if (beat % 2 !== 0) {
                playTone(1000, 'triangle', 0.05, nextNoteTimeRef.current);
            }

            nextNoteTimeRef.current += secondsPerBeat / 2; // 8th notes
            noteIndexRef.current++;
        }
    };

    const generateInitialObstacles = () => {
        let nextX = CANVAS_WIDTH + 200;
        for (let i = 0; i < 5; i++) {
            nextX = generateObstaclePattern(nextX);
        }
    };

    const generateObstaclePattern = (startX) => {
        const patterns = [
            (x) => [{ type: 'spike', x: x, y: GROUND_Y, w: BLOCK_SIZE, h: BLOCK_SIZE }],
            (x) => [
                { type: 'spike', x: x, y: GROUND_Y, w: BLOCK_SIZE, h: BLOCK_SIZE },
                { type: 'spike', x: x + BLOCK_SIZE, y: GROUND_Y, w: BLOCK_SIZE, h: BLOCK_SIZE }
            ],
            (x) => [ // Triple spike needs careful spacing
                { type: 'spike', x: x, y: GROUND_Y, w: BLOCK_SIZE, h: BLOCK_SIZE },
                { type: 'spike', x: x + BLOCK_SIZE, y: GROUND_Y, w: BLOCK_SIZE, h: BLOCK_SIZE },
                { type: 'spike', x: x + BLOCK_SIZE * 2, y: GROUND_Y, w: BLOCK_SIZE, h: BLOCK_SIZE }
            ],
            (x) => [ // Block + Spike
                { type: 'block', x: x, y: GROUND_Y - BLOCK_SIZE, w: BLOCK_SIZE, h: BLOCK_SIZE },
                { type: 'spike', x: x + 250, y: GROUND_Y, w: BLOCK_SIZE, h: BLOCK_SIZE }
            ],
            (x) => [ // High Platform
                { type: 'block', x: x, y: GROUND_Y - BLOCK_SIZE * 1.5, w: BLOCK_SIZE, h: BLOCK_SIZE * 1.5 },
                { type: 'block', x: x + BLOCK_SIZE, y: GROUND_Y - BLOCK_SIZE * 1.5, w: BLOCK_SIZE, h: BLOCK_SIZE * 1.5 },
            ],
        ];

        const r = Math.floor(Math.random() * patterns.length);
        const newObs = patterns[r](startX);
        newObs.forEach(o => stateRef.current.obstacles.push(o));
        return startX + 400 + Math.random() * 300;
    };

    const jump = () => {
        const { player } = stateRef.current;
        if (player.grounded && !player.dead) {
            player.dy = JUMP_FORCE;
            player.grounded = false;
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();

                if (stateRef.current.player.dead) {
                    initGame();
                } else if (!gameStarted) {
                    initGame();
                } else {
                    jump();
                }
            }
        };
        const handleInputStart = (e) => {
            // If it's a mouse event, only allow left click
            if (e.type === 'mousedown' && e.button !== 0) return;

            if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();

            if (stateRef.current.player.dead) {
                initGame();
            } else if (!gameStarted) {
                initGame();
            } else {
                jump();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleInputStart);
        window.addEventListener('touchstart', handleInputStart);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleInputStart);
            window.removeEventListener('touchstart', handleInputStart);
        };
    }, [gameStarted]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;

        const loop = () => {
            if (gameStarted && !stateRef.current.player.dead) {
                update();
                updateMusic();
            } else if (stateRef.current.player.dead) {
                updateParticles();
            }
            draw(ctx);
            animationId = requestAnimationFrame(loop);
        };

        animationId = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(animationId);
            if (audioCtxRef.current && audioCtxRef.current.close) {
                // Clean up logic if totally unmounting, but usually better to just suspend/close on unmount only
                // audioCtxRef.current.close(); 
            }
        };
    }, [gameStarted]); // Loop is recreated when gameStarted changes

    // Audio Cleanup on unmount only
    useEffect(() => {
        return () => {
            if (audioCtxRef.current) audioCtxRef.current.close();
        }
    }, []);

    const update = () => {
        const state = stateRef.current;
        const player = state.player;

        state.frame++;
        if (state.frame % 10 === 0) {
            // Update ref first
            scoreRef.current += 1;
            // setScore to update React UI if needed (though we draw from Ref usually)
            setScore(scoreRef.current);
        }
        if (state.speed < GAME_SPEED_MAX) state.speed += 0.001;

        // Physics
        player.dy += GRAVITY;
        if (player.dy > TERMINAL_VELOCITY) player.dy = TERMINAL_VELOCITY;
        player.y += player.dy;

        // Rotation
        if (!player.grounded) {
            player.angle += 0.12;
        } else {
            const nearest = Math.round(player.angle / (Math.PI / 2)) * (Math.PI / 2);
            player.angle = nearest;
        }

        // Floor collision
        if (player.y + player.size >= GROUND_Y) {
            player.y = GROUND_Y - player.size;
            player.dy = 0;
            player.grounded = true;
        } else {
            player.grounded = false;
        }

        // Cleanup and Spawn Obstacles
        if (state.obstacles.length === 0 ||
            (state.obstacles[state.obstacles.length - 1].x < CANVAS_WIDTH - 200)) {
            let lastX = state.obstacles.length > 0 ? state.obstacles[state.obstacles.length - 1].x : CANVAS_WIDTH;
            if (lastX < CANVAS_WIDTH) lastX = CANVAS_WIDTH;
            generateObstaclePattern(lastX + Math.random() * 200 + 400);
        }

        // Obstacles Loop
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
            let obs = state.obstacles[i];
            obs.x -= state.speed;

            if (obs.x + obs.w < -100) {
                state.obstacles.splice(i, 1);
                continue;
            }

            // COLLISION DETECTION (Strict AABB)
            const margin = (player.size - player.hitboxSize) / 2;
            const pRect = {
                l: player.x + margin,
                r: player.x + player.size - margin,
                t: player.y + margin,
                b: player.y + player.size - margin
            };

            // Obstacle Hitbox
            const oMargin = 6;
            let oRect;

            if (obs.type === 'spike') {
                oRect = {
                    l: obs.x + oMargin + 5,
                    r: obs.x + obs.w - oMargin - 5,
                    t: obs.y - obs.h + oMargin,
                    b: obs.y
                };
            } else {
                oRect = {
                    l: obs.x + oMargin,
                    r: obs.x + obs.w - oMargin,
                    t: obs.y + oMargin,
                    b: obs.y + obs.h
                };
            }

            // Intersection
            if (pRect.r > oRect.l && pRect.l < oRect.r && pRect.b > oRect.t && pRect.t < oRect.b) {
                if (obs.type === 'spike') {
                    die();
                } else if (obs.type === 'block') {
                    const landThreshold = 15; // pixels
                    if (player.dy > 0 && Math.abs(pRect.b - oRect.t) < landThreshold + player.dy) {
                        player.y = obs.y - player.size; // Snap to top
                        player.dy = 0;
                        player.grounded = true;
                        player.angle = Math.round(player.angle / (Math.PI / 2)) * (Math.PI / 2);
                    } else {
                        die();
                    }
                }
            }
        }
        updateParticles();
    };

    const updateParticles = () => {
        const state = stateRef.current;
        // Trail
        if (!state.player.dead && state.frame % 3 === 0) {
            state.particles.push({
                x: state.player.x + state.player.size / 2,
                y: state.player.y + state.player.size / 2,
                vx: -state.speed * 0.5,
                vy: (Math.random() - 0.5) * 2,
                life: 1.0,
                color: `hsl(${state.frame % 360}, 100%, 50%)`,
                size: Math.random() * 5 + 3
            });
        }
        state.bgParticles.forEach(p => {
            p.x += p.speedX;
            if (p.x < 0) p.x = CANVAS_WIDTH;
        });
        for (let i = state.particles.length - 1; i >= 0; i--) {
            let p = state.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) state.particles.splice(i, 1);
        }
    };

    const die = () => {
        const state = stateRef.current;
        if (state.player.dead) return;
        state.player.dead = true;
        setGameOver(true);
        setGameStarted(false);

        // Submit Score
        if (user && scoreRef.current > 0) {
            const username = user?.user_metadata?.username || user?.email?.split('@')[0] || "Anonymous";
            scoresApi.submitScore(user.id, username, 'geodash', scoreRef.current).then((result) => {
                if (result && result.newHighScore) {
                    setPersonalBest(scoreRef.current);
                }
            });
        }

        for (let i = 0; i < 30; i++) {
            state.particles.push({
                x: state.player.x + state.player.size / 2,
                y: state.player.y + state.player.size / 2,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1.0,
                color: '#ffff00',
                size: Math.random() * 8 + 4
            });
        }
    };

    const draw = (ctx) => {
        const state = stateRef.current;
        const player = state.player;

        // Clear
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Grid
        let offset = (state.frame * state.speed * 0.5) % 40;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let x = -offset; x < CANVAS_WIDTH; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
        }

        // BG Particles
        state.bgParticles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.2;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Floor
        ctx.fillStyle = '#111';
        ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
        ctx.shadowBlur = 10; ctx.shadowColor = '#0ff';
        ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_WIDTH, GROUND_Y); ctx.stroke();
        ctx.shadowBlur = 0;

        // Obstacles
        state.obstacles.forEach(obs => {
            if (obs.type === 'spike') {
                ctx.fillStyle = '#000';
                ctx.strokeStyle = '#f00';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10; ctx.shadowColor = '#f00';

                ctx.beginPath();
                ctx.moveTo(obs.x, obs.y);
                ctx.lineTo(obs.x + obs.w / 2, obs.y - obs.h);
                ctx.lineTo(obs.x + obs.w, obs.y);
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(obs.x + 10, obs.y - 2);
                ctx.lineTo(obs.x + obs.w / 2, obs.y - obs.h + 10);
                ctx.lineTo(obs.x + obs.w - 10, obs.y - 2);
                ctx.fill();

            } else if (obs.type === 'block') {
                ctx.shadowBlur = 5; ctx.shadowColor = '#0f0';
                ctx.fillStyle = '#0a0a1a';
                ctx.strokeStyle = '#0f0';
                ctx.lineWidth = 2;
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                ctx.beginPath(); ctx.moveTo(obs.x, obs.y); ctx.lineTo(obs.x + obs.w, obs.y + obs.h); ctx.stroke();
            }
        });

        // Player
        if (!player.dead) {
            ctx.save();
            ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
            ctx.rotate(player.angle);

            ctx.shadowBlur = 15; ctx.shadowColor = '#ffcc00';
            ctx.fillStyle = '#ffd700'; // Gold
            ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(-player.size / 2, -player.size / 2, player.size, player.size);

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            ctx.fillRect(-10, -8, 6, 6);
            ctx.fillRect(4, -8, 6, 6);
            ctx.fillRect(-8, 5, 16, 4);

            ctx.restore();
        }

        // Particles
        state.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color || '#fff';
            ctx.translate(p.x, p.y);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        // Score
        ctx.font = "bold 24px 'Orbitron'";
        ctx.fillStyle = "#fff";
        // USE REF FOR DRAWING TO AVOID STALE STATE
        ctx.fillText(`SCORE: ${scoreRef.current}`, 20, 40);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[90vh]">
            <div className="mb-4 flex flex-col items-center w-full max-w-[800px]">
                <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                    NEON DASH
                </h2>
                <div className="flex gap-6 text-sm font-mono text-gray-400">
                    <span>YOUR BEST: <span className="text-yellow-400">{personalBest}</span></span>
                    <span>CURRENT: <span className="text-white">{score}</span></span>
                </div>
            </div>
            <div className="relative group">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border-2 border-yellow-500/30 rounded-lg bg-[#0a0a1a] shadow-[0_0_50px_rgba(255,200,0,0.15)] cursor-pointer"
                    style={{ maxWidth: '100%', height: 'auto' }}
                />
                {(!gameStarted || gameOver) && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                        <div className="text-center p-8">
                            <h3 className="text-5xl font-black font-orbitron text-white mb-2 text-glow-gold tracking-tighter">
                                {gameOver ? 'CRASHED' : 'NEON DASH'}
                            </h3>

                            {gameOver && (
                                <>
                                    <p className="text-2xl mb-2 text-cyan-400 font-orbitron">SCORE: {scoreRef.current}</p>
                                    <p className="text-lg mb-4 text-gray-400">YOUR BEST: {personalBest}</p>
                                </>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={initGame}
                                className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-black text-xl uppercase tracking-widest rounded mt-4"
                            >
                                {gameOver ? 'RETRY' : 'PLAY'}
                            </motion.button>
                        </div>
                    </div>
                )}
            </div>
            <p className="mt-8 text-gray-500 text-xs font-mono">
                AUDIO ENABLED • CLICK TO JUMP
            </p>
        </div>
    );
};

export default GeoDashGame;
