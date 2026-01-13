import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { scoresApi } from '../lib/scores';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.35; // Even gentler falling
const JUMP_FORCE = -8.5; // Adjusted for new gravity
const PIPE_WIDTH = 80;
const PIPE_GAP = 200; // Increased from 180 for easier passage
const INITIAL_PIPE_SPEED = 1.5; // Even slower start (was 2)
const MAX_PIPE_SPEED = 3.5; // Reduced max speed (was 4)
const BIRD_SIZE = 40;

const FlappyNeon = () => {
    const canvasRef = useRef(null);
    const { user } = useAuth();
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [highScoreUser, setHighScoreUser] = useState("Loading...");
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);

    // Game state refs
    const birdRef = useRef({
        x: 150,
        y: CANVAS_HEIGHT / 3, // Start higher (was CANVAS_HEIGHT / 2)
        velocity: 0,
        rotation: 0
    });
    const pipesRef = useRef([]);
    const particlesRef = useRef([]);
    const starsRef = useRef([]);
    const scoreRef = useRef(0);
    const pipeSpeedRef = useRef(INITIAL_PIPE_SPEED);
    const animationFrameRef = useRef(null);

    // Load high score
    useEffect(() => {
        const fetchScore = async () => {
            const leaderboard = await scoresApi.getLeaderboard('flappy-neon', 1);
            if (leaderboard && leaderboard.length > 0) {
                setHighScore(leaderboard[0].score);
                if (leaderboard[0].username) setHighScoreUser(leaderboard[0].username);
            } else {
                setHighScoreUser("None");
            }
        };
        fetchScore();
    }, []);

    const initGame = () => {
        birdRef.current = {
            x: 150,
            y: CANVAS_HEIGHT / 3, // Start higher
            velocity: 0,
            rotation: 0
        };
        pipesRef.current = [];
        particlesRef.current = [];
        scoreRef.current = 0;
        pipeSpeedRef.current = INITIAL_PIPE_SPEED; // Reset to slow speed
        setScore(0);
        setGameOver(false);
        setGameStarted(true);

        // Initialize stars
        starsRef.current = Array.from({ length: 100 }, () => ({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 0.5 + 0.2
        }));

        // Create initial pipes
        for (let i = 0; i < 3; i++) {
            createPipe(CANVAS_WIDTH + i * 300);
        }
    };

    const createPipe = (x) => {
        const minHeight = 100;
        const maxHeight = CANVAS_HEIGHT - PIPE_GAP - 100;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

        pipesRef.current.push({
            x: x,
            topHeight: topHeight,
            bottomY: topHeight + PIPE_GAP,
            scored: false
        });
    };

    const jump = () => {
        if (!gameStarted || gameOver) return;
        birdRef.current.velocity = JUMP_FORCE;

        // Jump particles
        for (let i = 0; i < 8; i++) {
            particlesRef.current.push({
                x: birdRef.current.x,
                y: birdRef.current.y + BIRD_SIZE / 2,
                vx: Math.random() * 2 - 4,
                vy: Math.random() * 4 + 2,
                life: 1.0,
                color: '#00f3ff',
                size: Math.random() * 4 + 2
            });
        }
    };

    useEffect(() => {
        const handleInput = (e) => {
            if (e.type === 'keydown' && (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) {
                e.preventDefault();
                if (!gameStarted) {
                    initGame();
                } else {
                    jump();
                }
            } else if (e.type === 'mousedown' || e.type === 'touchstart') {
                if (!gameStarted) {
                    initGame();
                } else {
                    jump();
                }
            }
        };

        window.addEventListener('keydown', handleInput);
        window.addEventListener('mousedown', handleInput);
        window.addEventListener('touchstart', handleInput);

        return () => {
            window.removeEventListener('keydown', handleInput);
            window.removeEventListener('mousedown', handleInput);
            window.removeEventListener('touchstart', handleInput);
        };
    }, [gameStarted, gameOver]);

    useEffect(() => {
        if (!gameStarted || gameOver) {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const loop = () => {
            update();
            draw(ctx);
            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [gameStarted, gameOver]);

    const update = () => {
        const bird = birdRef.current;

        // Bird physics
        bird.velocity += GRAVITY;
        bird.y += bird.velocity;
        bird.rotation = Math.min(Math.max(bird.velocity * 3, -30), 90);

        // Check ceiling/floor collision
        if (bird.y < 0 || bird.y + BIRD_SIZE > CANVAS_HEIGHT) {
            die();
            return;
        }

        // Update pipes
        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
            const pipe = pipesRef.current[i];
            pipe.x -= pipeSpeedRef.current; // Use dynamic speed

            // Remove off-screen pipes
            if (pipe.x + PIPE_WIDTH < 0) {
                pipesRef.current.splice(i, 1);
                continue;
            }

            // Spawn new pipe
            if (pipe.x < CANVAS_WIDTH - 300 && i === pipesRef.current.length - 1) {
                createPipe(CANVAS_WIDTH);
            }

            // Score
            if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
                pipe.scored = true;
                scoreRef.current += 1;
                setScore(scoreRef.current);

                // Gradually increase speed (cap at MAX_PIPE_SPEED)
                if (pipeSpeedRef.current < MAX_PIPE_SPEED) {
                    pipeSpeedRef.current += 0.1;
                }

                // Score particles
                for (let j = 0; j < 20; j++) {
                    particlesRef.current.push({
                        x: bird.x + BIRD_SIZE / 2,
                        y: bird.y + BIRD_SIZE / 2,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        life: 1.0,
                        color: '#ffff00',
                        size: Math.random() * 6 + 3
                    });
                }
            }

            // Collision detection (with forgiving hitbox)
            const hitboxMargin = 5; // Make hitbox smaller for forgiveness
            if (bird.x + hitboxMargin < pipe.x + PIPE_WIDTH &&
                bird.x + BIRD_SIZE - hitboxMargin > pipe.x) {
                if (bird.y + hitboxMargin < pipe.topHeight ||
                    bird.y + BIRD_SIZE - hitboxMargin > pipe.bottomY) {
                    die();
                    return;
                }
            }
        }

        // Update particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= 0.02;
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }

        // Update stars
        starsRef.current.forEach(star => {
            star.x -= star.speed;
            if (star.x < 0) star.x = CANVAS_WIDTH;
        });
    };

    const die = () => {
        setGameOver(true);
        setGameStarted(false);

        // Death explosion
        for (let i = 0; i < 50; i++) {
            particlesRef.current.push({
                x: birdRef.current.x + BIRD_SIZE / 2,
                y: birdRef.current.y + BIRD_SIZE / 2,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1.0,
                color: ['#ff0066', '#00f3ff', '#ffff00'][Math.floor(Math.random() * 3)],
                size: Math.random() * 8 + 4
            });
        }

        // Submit score
        if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
            setHighScoreUser("YOU");
            const username = user?.user_metadata?.username || user?.email?.split('@')[0] || "Anonymous";
            if (user) {
                scoresApi.submitScore(user.id, username, 'flappy-neon', scoreRef.current);
            }
        }
    };

    const draw = (ctx) => {
        // Background gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        bgGradient.addColorStop(0, '#0a0520');
        bgGradient.addColorStop(1, '#1a0a30');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Stars
        starsRef.current.forEach(star => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Pipes
        pipesRef.current.forEach(pipe => {
            // Top pipe
            const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
            topGradient.addColorStop(0, '#ff0066');
            topGradient.addColorStop(0.5, '#ff3388');
            topGradient.addColorStop(1, '#ff0066');

            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff0066';
            ctx.fillStyle = topGradient;
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

            // Top pipe cap
            ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);

            // Bottom pipe
            const bottomGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
            bottomGradient.addColorStop(0, '#ff0066');
            bottomGradient.addColorStop(0.5, '#ff3388');
            bottomGradient.addColorStop(1, '#ff0066');

            ctx.fillStyle = bottomGradient;
            ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, CANVAS_HEIGHT - pipe.bottomY);

            // Bottom pipe cap
            ctx.fillRect(pipe.x - 5, pipe.bottomY, PIPE_WIDTH + 10, 20);

            // Pipe highlights
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(pipe.x + 5, 0, 10, pipe.topHeight);
            ctx.fillRect(pipe.x + 5, pipe.bottomY, 10, CANVAS_HEIGHT - pipe.bottomY);
        });

        ctx.shadowBlur = 0;

        // Bird
        const bird = birdRef.current;
        ctx.save();
        ctx.translate(bird.x + BIRD_SIZE / 2, bird.y + BIRD_SIZE / 2);
        ctx.rotate((bird.rotation * Math.PI) / 180);

        // Bird glow
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#00f3ff';

        // Bird body gradient
        const birdGradient = ctx.createRadialGradient(-5, -5, 5, 0, 0, BIRD_SIZE / 2);
        birdGradient.addColorStop(0, '#00ffff');
        birdGradient.addColorStop(0.7, '#00aaff');
        birdGradient.addColorStop(1, '#0066ff');
        ctx.fillStyle = birdGradient;

        // Bird body (circle)
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();

        // Wing
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-8, 0, 12, 6, bird.velocity > 0 ? 0.3 : -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Eye white
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8, -5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(10, -5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(11, -6, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(BIRD_SIZE / 2 - 5, 0);
        ctx.lineTo(BIRD_SIZE / 2 + 8, -3);
        ctx.lineTo(BIRD_SIZE / 2 + 8, 3);
        ctx.closePath();
        ctx.fill();

        // Beak outline
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

        // Particles
        particlesRef.current.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Score display
        ctx.shadowBlur = 0;
        ctx.font = "bold 60px 'Orbitron'";
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.textAlign = 'center';
        ctx.fillText(scoreRef.current, CANVAS_WIDTH / 2, 80);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[90vh]">
            <div className="mb-4 flex flex-col items-center w-full max-w-[800px]">
                <h2 className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                    FLAPPY NEON
                </h2>
                <div className="flex gap-6 text-sm font-mono text-gray-400">
                    <span>HIGH SCORE: <span className="text-cyan-400">{highScore}</span> ({highScoreUser})</span>
                    <span>CURRENT: <span className="text-white">{score}</span></span>
                </div>
            </div>
            <div className="relative group">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border-2 border-cyan-500/30 rounded-lg bg-[#0a0520] shadow-[0_0_50px_rgba(0,243,255,0.15)] cursor-pointer"
                    style={{ maxWidth: '100%', height: 'auto' }}
                />
                {(!gameStarted || gameOver) && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                        <div className="text-center p-8">
                            <h3 className="text-5xl font-black font-orbitron text-white mb-2 text-glow tracking-tighter">
                                {gameOver ? 'CRASHED!' : 'FLAPPY NEON'}
                            </h3>

                            {gameOver && (
                                <p className="text-2xl mb-4 text-cyan-400 font-orbitron">SCORE: {scoreRef.current}</p>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={initGame}
                                className="px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xl uppercase tracking-widest rounded mt-4"
                            >
                                {gameOver ? 'RETRY' : 'PLAY'}
                            </motion.button>
                        </div>
                    </div>
                )}
            </div>
            <p className="mt-8 text-gray-500 text-xs font-mono">
                CLICK, TAP, OR PRESS SPACE TO FLAP
            </p>
        </div>
    );
};

export default FlappyNeon;
