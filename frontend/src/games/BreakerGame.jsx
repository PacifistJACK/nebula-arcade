import React, { useRef, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { scoresApi } from '../lib/scores';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 120; // Slightly wider for easier gameplay
const PADDLE_HEIGHT = 20;
const BALL_RADIUS = 10; // Slightly bigger
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_HEIGHT = 30;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 35;
const TARGET_FPS = 60;

// Levels Configuration
const LEVELS = [
    { rows: 3, speedMod: 1.0, pattern: 'simple' },
    { rows: 3, speedMod: 1.2, pattern: 'checkered' },
    { rows: 4, speedMod: 1.4, pattern: 'solid' },
    { rows: 5, speedMod: 1.6, pattern: 'random' },
    { rows: 6, speedMod: 1.8, pattern: 'solid' }
];

const BreakerGame = () => {
    const canvasRef = useRef(null);
    const { user } = useAuth();

    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [highScoreUser, setHighScoreUser] = useState("Loading...");

    const [level, setLevel] = useState(1);
    const [gameState, setGameState] = useState('MENU');

    const scoreRef = useRef(0);
    const levelRef = useRef(1);
    const highScoreRef = useRef(0);

    // Audio
    const audioCtxRef = useRef(null);
    const shakeRef = useRef(0);
    const nextNoteTimeRef = useRef(0);
    const noteIndexRef = useRef(0);

    // Objects
    const paddleRef = useRef({ x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2 });
    const ballRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 30, dx: 4, dy: -4 });
    const bricksRef = useRef([]);
    const particlesRef = useRef([]);
    const trailRef = useRef([]); // Ball trail effect

    // Engine
    const animationFrameRef = useRef(null);
    const rightPressedRef = useRef(false);
    const leftPressedRef = useRef(false);
    const lastTimeRef = useRef(0);

    // Load High Score
    useEffect(() => {
        const fetchScore = async () => {
            const leaderboard = await scoresApi.getLeaderboard('cyber-breaker', 1);
            if (leaderboard && leaderboard.length > 0) {
                setHighScore(leaderboard[0].score);
                highScoreRef.current = leaderboard[0].score;
                setHighScoreUser(leaderboard[0].username || "Anonymous");
            } else {
                setHighScore(0);
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
            audioCtxRef.current.resume().catch(e => console.error("Audio resume failed", e));
        }
    };

    const initLevel = (lvl) => {
        initAudio();

        levelRef.current = lvl;
        if (lvl === 1) scoreRef.current = 0;

        paddleRef.current = { x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2 };
        const levelConfig = LEVELS[Math.min(lvl - 1, LEVELS.length - 1)];
        const initialSpeed = 4 * levelConfig.speedMod;

        ballRef.current = {
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT - 40,
            dx: initialSpeed * (Math.random() > 0.5 ? 1 : -1),
            dy: -initialSpeed
        };

        // Build Bricks with better colors
        const newBricks = [];
        for (let c = 0; c < BRICK_COLS; c++) {
            newBricks[c] = [];
            for (let r = 0; r < levelConfig.rows; r++) {
                let status = 1;
                if (levelConfig.pattern === 'checkered' && (c + r) % 2 === 0) status = 0;

                // Better color palette
                const hue = (c * 45 + r * 20) % 360;
                newBricks[c][r] = {
                    x: 0,
                    y: 0,
                    status: status,
                    color: `hsl(${hue}, 100%, 50%)`,
                    hue: hue
                };
            }
        }
        bricksRef.current = newBricks;
        particlesRef.current = [];
        trailRef.current = [];

        if (audioCtxRef.current) {
            nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.1;
        }
        noteIndexRef.current = 0;

        setScore(scoreRef.current);
        setLevel(lvl);
        setGameState('PLAYING');

        lastTimeRef.current = performance.now();
    };

    const addScore = (points) => {
        scoreRef.current += points;
        setScore(scoreRef.current);

        if (scoreRef.current > highScoreRef.current) {
            highScoreRef.current = scoreRef.current;
            setHighScore(scoreRef.current);
            setHighScoreUser("YOU");

            const username = user?.user_metadata?.username || user?.email?.split('@')[0] || "Anonymous";
            if (user) {
                scoresApi.submitScore(user.id, username, 'cyber-breaker', scoreRef.current);
            }
        }
    };

    const playTone = (freq, type, duration, time, vol = 0.1) => {
        if (!audioCtxRef.current) return;
        try {
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(freq, time);
            osc.type = type;
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(time);
            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            osc.stop(time + duration);
        } catch (e) { }
    };

    const updateMusic = () => {
        if (!audioCtxRef.current || gameState !== 'PLAYING') return;

        const now = audioCtxRef.current.currentTime;
        if (nextNoteTimeRef.current < now - 0.5) {
            nextNoteTimeRef.current = now;
        }

        const lookahead = 0.1;
        const NOTES = [130.81, 155.56, 196.00, 233.08, 261.63, 196.00, 155.56];
        const BASS = 65.41;

        while (nextNoteTimeRef.current < now + lookahead) {
            const step = noteIndexRef.current % 16;

            if (step % 4 === 0) {
                playTone(BASS, 'sawtooth', 0.1, nextNoteTimeRef.current, 0.15);
            }

            if (step % 2 === 0) {
                const note = NOTES[(step / 2) % NOTES.length];
                playTone(note, 'square', 0.1, nextNoteTimeRef.current, 0.05);
            }

            if (step % 4 === 2) {
                playTone(800, 'triangle', 0.05, nextNoteTimeRef.current, 0.02);
            }

            nextNoteTimeRef.current += 0.125;
            noteIndexRef.current++;
        }
    };

    const playSound = (type) => {
        if (!audioCtxRef.current) return;
        const now = audioCtxRef.current.currentTime;

        switch (type) {
            case 'paddle':
                playTone(400, 'square', 0.1, now);
                break;
            case 'brick':
                playTone(600 + Math.random() * 200, 'sine', 0.1, now);
                break;
            case 'wall':
                playTone(200, 'triangle', 0.05, now);
                break;
            case 'loss':
                playTone(150, 'sawtooth', 0.5, now, 0.2);
                break;
            case 'win':
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                    playTone(freq, 'square', 0.2, now + i * 0.1);
                });
                break;
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Right" || e.key === "ArrowRight" || e.key === "d" || e.key === "D") rightPressedRef.current = true;
            else if (e.key === "Left" || e.key === "ArrowLeft" || e.key === "a" || e.key === "A") leftPressedRef.current = true;
            initAudio();
        };
        const handleKeyUp = (e) => {
            if (e.key === "Right" || e.key === "ArrowRight" || e.key === "d" || e.key === "D") rightPressedRef.current = false;
            else if (e.key === "Left" || e.key === "ArrowLeft" || e.key === "a" || e.key === "A") leftPressedRef.current = false;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    useEffect(() => {
        if (gameState !== 'PLAYING') {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        const brickWidth = (CANVAS_WIDTH - 2 * BRICK_OFFSET_LEFT - (BRICK_COLS - 1) * BRICK_PADDING) / BRICK_COLS;

        const loop = (timestamp) => {
            const dt = (timestamp - lastTimeRef.current) / (1000 / TARGET_FPS);
            lastTimeRef.current = timestamp;

            updateMusic();
            update(brickWidth, dt);
            draw(ctx, brickWidth);

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [gameState]);

    const update = (brickWidth, dt) => {
        const paddle = paddleRef.current;
        const ball = ballRef.current;

        if (shakeRef.current > 0) shakeRef.current = Math.max(0, shakeRef.current - 0.5);

        // Paddle Move
        if (rightPressedRef.current && paddle.x < CANVAS_WIDTH - PADDLE_WIDTH) {
            paddle.x += 9 * dt;
        } else if (leftPressedRef.current && paddle.x > 0) {
            paddle.x -= 9 * dt;
        }

        // Ball trail
        trailRef.current.push({ x: ball.x, y: ball.y, life: 1.0 });
        if (trailRef.current.length > 15) trailRef.current.shift();

        // Ball Move
        ball.x += ball.dx * dt;
        ball.y += ball.dy * dt;

        // Walls
        if (ball.x + ball.dx * dt > CANVAS_WIDTH - BALL_RADIUS || ball.x + ball.dx * dt < BALL_RADIUS) {
            ball.dx = -ball.dx;
            playSound('wall');
        }
        if (ball.y + ball.dy * dt < BALL_RADIUS) {
            ball.dy = -ball.dy;
            playSound('wall');
        } else if (ball.y + ball.dy * dt > CANVAS_HEIGHT - BALL_RADIUS) {
            // Paddle Collision
            if (ball.x > paddle.x && ball.x < paddle.x + PADDLE_WIDTH) {
                let collidePoint = ball.x - (paddle.x + PADDLE_WIDTH / 2);
                collidePoint = collidePoint / (PADDLE_WIDTH / 2);
                let angle = collidePoint * (Math.PI / 3);
                let speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                speed = Math.min(speed + 0.1, 14);

                ball.dx = speed * Math.sin(angle);
                ball.dy = -speed * Math.cos(angle);
                playSound('paddle');
                shakeRef.current = 3;

                // Paddle hit particles
                for (let i = 0; i < 10; i++) {
                    particlesRef.current.push({
                        x: ball.x,
                        y: ball.y,
                        vx: (Math.random() - 0.5) * 6,
                        vy: Math.random() * -4,
                        life: 1.0,
                        color: '#00f3ff',
                        size: Math.random() * 4 + 2
                    });
                }
            } else {
                setGameState('GAME_OVER');
                playSound('loss');
            }
        }

        // Brick Collision
        let activeBricks = 0;
        const levelConfig = LEVELS[Math.min(levelRef.current - 1, LEVELS.length - 1)];
        for (let c = 0; c < BRICK_COLS; c++) {
            for (let r = 0; r < levelConfig.rows; r++) {
                if (!bricksRef.current[c] || !bricksRef.current[c][r]) continue;
                let b = bricksRef.current[c][r];
                if (b.status === 1) {
                    activeBricks++;
                    let bX = (c * (brickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                    let bY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;

                    if (ball.x > bX && ball.x < bX + brickWidth && ball.y > bY && ball.y < bY + BRICK_HEIGHT) {
                        ball.dy = -ball.dy;
                        b.status = 0;
                        addScore(10 * levelRef.current);

                        createParticles(ball.x, ball.y, b.color, bX + brickWidth / 2, bY + BRICK_HEIGHT / 2);
                        playSound('brick');
                        shakeRef.current = 5;
                    }
                }
            }
        }

        if (activeBricks === 0) {
            if (levelRef.current < LEVELS.length) {
                setGameState('WON_LEVEL');
                playSound('win');
            } else {
                setGameState('GAME_WON');
                playSound('win');
            }
        }

        // Update particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            let p = particlesRef.current[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 0.2 * dt; // Gravity
            p.vx *= 0.99;
            p.life -= 0.02 * dt;
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }

        // Update trail
        for (let i = trailRef.current.length - 1; i >= 0; i--) {
            trailRef.current[i].life -= 0.08;
            if (trailRef.current[i].life <= 0) trailRef.current.splice(i, 1);
        }
    };

    const draw = (ctx, brickWidth) => {
        // Background gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        bgGradient.addColorStop(0, '#050510');
        bgGradient.addColorStop(1, '#0a0a20');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.save();
        if (shakeRef.current > 0) {
            ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
        }

        // Draw bricks with enhanced visuals
        const levelConfig = LEVELS[Math.min(levelRef.current - 1, LEVELS.length - 1)];
        for (let c = 0; c < BRICK_COLS; c++) {
            for (let r = 0; r < levelConfig.rows; r++) {
                if (bricksRef.current[c] && bricksRef.current[c][r] && bricksRef.current[c][r].status === 1) {
                    let bX = (c * (brickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                    let bY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                    const brick = bricksRef.current[c][r];

                    // Brick gradient
                    const brickGradient = ctx.createLinearGradient(bX, bY, bX, bY + BRICK_HEIGHT);
                    brickGradient.addColorStop(0, brick.color);
                    brickGradient.addColorStop(1, `hsl(${brick.hue}, 100%, 30%)`);

                    ctx.shadowBlur = 15;
                    ctx.shadowColor = brick.color;
                    ctx.fillStyle = brickGradient;
                    ctx.fillRect(bX, bY, brickWidth, BRICK_HEIGHT);

                    // Highlight
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = "rgba(255,255,255,0.3)";
                    ctx.fillRect(bX, bY, brickWidth, BRICK_HEIGHT / 3);

                    // Border
                    ctx.strokeStyle = "rgba(255,255,255,0.5)";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(bX, bY, brickWidth, BRICK_HEIGHT);
                }
            }
        }

        // Paddle with gradient
        const paddleGradient = ctx.createLinearGradient(
            paddleRef.current.x,
            CANVAS_HEIGHT - PADDLE_HEIGHT - 10,
            paddleRef.current.x + PADDLE_WIDTH,
            CANVAS_HEIGHT - 10
        );
        paddleGradient.addColorStop(0, '#00aaff');
        paddleGradient.addColorStop(0.5, '#00f3ff');
        paddleGradient.addColorStop(1, '#00aaff');

        ctx.fillStyle = paddleGradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#00f3ff";
        ctx.fillRect(paddleRef.current.x, CANVAS_HEIGHT - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT);

        // Paddle highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(paddleRef.current.x, CANVAS_HEIGHT - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT / 2);

        // Ball trail
        trailRef.current.forEach((t, i) => {
            ctx.globalAlpha = t.life * 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffffff';
            ctx.beginPath();
            ctx.arc(t.x, t.y, BALL_RADIUS * 0.7, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Ball with glow
        const ballGradient = ctx.createRadialGradient(
            ballRef.current.x - 3,
            ballRef.current.y - 3,
            2,
            ballRef.current.x,
            ballRef.current.y,
            BALL_RADIUS
        );
        ballGradient.addColorStop(0, '#ffffff');
        ballGradient.addColorStop(0.5, '#ffff00');
        ballGradient.addColorStop(1, '#ff8800');

        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ffff00';
        ctx.beginPath();
        ctx.arc(ballRef.current.x, ballRef.current.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = ballGradient;
        ctx.fill();
        ctx.shadowBlur = 0;

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

        ctx.restore();
    };

    const createParticles = (x, y, color, brickCenterX, brickCenterY) => {
        // Explosion from brick center
        for (let i = 0; i < 25; i++) {
            particlesRef.current.push({
                x: brickCenterX,
                y: brickCenterY,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 1.0,
                color: color,
                size: Math.random() * 5 + 2
            });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[90vh]">
            <div className="mb-4 flex justify-between w-full max-w-[800px] glass-panel p-4 rounded-lg">
                <h2 className="text-2xl font-orbitron text-neon-pink">CYBER BREAKER</h2>
                <div className="flex gap-6">
                    <div className="text-xl font-bold">LEVEL: <span className="text-yellow-400">{level}</span></div>
                    <div className="text-xl font-bold flex flex-col items-center leading-none">
                        <span>HIGH: <span className="text-green-400">{highScore}</span></span>
                        <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{highScoreUser}</span>
                    </div>
                    <div className="text-xl font-bold">SCORE: <span className="text-neon-blue">{score}</span></div>
                </div>
            </div>

            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border-2 border-neon-pink/30 rounded-lg bg-[#050510] shadow-[0_0_50px_rgba(255,0,136,0.2)]"
                    style={{ maxWidth: '100%', height: 'auto' }}
                />

                {gameState !== 'PLAYING' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                        <div className="text-center p-8 border border-white/10 bg-black/40 rounded-xl">
                            <h3 className="text-5xl font-orbitron text-white mb-6 text-glow">
                                {gameState === 'GAME_WON' ? 'MISSION ACCOMPLISHED' :
                                    gameState === 'GAME_OVER' ? 'SYSTEM FAILURE' :
                                        gameState === 'WON_LEVEL' ? 'SECTOR CLEARED' :
                                            'READY TO BREACH?'}
                            </h3>

                            {gameState !== 'MENU' && (
                                <p className="text-2xl mb-2 text-neon-blue">Score: {score}</p>
                            )}
                            <p className="text-xl mb-6 text-green-400">High Score: {highScore}</p>

                            <button
                                onClick={() => {
                                    if (gameState === 'WON_LEVEL') initLevel(level + 1);
                                    else initLevel(1);
                                }}
                                className="px-10 py-4 bg-gradient-to-r from-neon-pink to-purple-600 text-white font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,0,136,0.8)] transition-all rounded"
                            >
                                {gameState === 'WON_LEVEL' ? 'Next Sector' : (gameState !== 'MENU' ? 'Restart Mission' : 'Initiate')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 text-gray-400 text-sm">
                Use <span className="text-white border border-gray-600 px-2 py-1 rounded mx-1">A/D</span> or <span className="text-white border border-gray-600 px-2 py-1 rounded mx-1">Arrow Keys</span>
            </div>
        </div>
    );
};

export default BreakerGame;
