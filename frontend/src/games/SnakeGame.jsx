import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { scoresApi } from '../lib/scores';

const GRID_SIZE = 20;
const TILE_SIZE = 30;
const INITIAL_SPEED = 200;
const MIN_SPEED = 50;
const SPEED_DECREMENT = 2;

const SnakeGame = () => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [currentSpeed, setCurrentSpeed] = useState(INITIAL_SPEED);

    const snakeRef = useRef([{ x: 10, y: 10 }]);
    const foodRef = useRef({ x: 15, y: 10 });
    const directionRef = useRef({ x: 1, y: 0 });
    const nextDirectionRef = useRef({ x: 1, y: 0 });
    const particlesRef = useRef([]);
    const animationFrameRef = useRef(null);
    const lastUpdateRef = useRef(0);
    const speedRef = useRef(INITIAL_SPEED);
    const foodPulseRef = useRef(0);

    const initGame = () => {
        snakeRef.current = [{ x: 10, y: 10 }];
        foodRef.current = { x: 15, y: 10 };
        directionRef.current = { x: 1, y: 0 };
        nextDirectionRef.current = { x: 1, y: 0 };
        particlesRef.current = [];
        speedRef.current = INITIAL_SPEED;
        setCurrentSpeed(INITIAL_SPEED);
        setScore(0);
        setGameOver(false);
        setGameStarted(true);
        lastUpdateRef.current = 0;
    };

    useEffect(() => {
        const handleKeydown = (e) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (directionRef.current.y === 0) nextDirectionRef.current = { x: 0, y: -1 };
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (directionRef.current.y === 0) nextDirectionRef.current = { x: 0, y: 1 };
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (directionRef.current.x === 0) nextDirectionRef.current = { x: -1, y: 0 };
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (directionRef.current.x === 0) nextDirectionRef.current = { x: 1, y: 0 };
                    break;
            }
        };
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, []);

    useEffect(() => {
        if (!gameStarted || gameOver) {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = GRID_SIZE * TILE_SIZE;
        canvas.height = GRID_SIZE * TILE_SIZE;

        const loop = (timestamp) => {
            if (timestamp - lastUpdateRef.current >= speedRef.current) {
                update();
                lastUpdateRef.current = timestamp;
            }
            updateParticles();
            foodPulseRef.current += 0.05;
            draw(ctx);
            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [gameStarted, gameOver]);

    const spawnParticles = (x, y, color) => {
        for (let i = 0; i < 15; i++) {
            particlesRef.current.push({
                x: x * TILE_SIZE + TILE_SIZE / 2,
                y: y * TILE_SIZE + TILE_SIZE / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1.0,
                color: color,
                size: Math.random() * 5 + 2
            });
        }
    };

    const updateParticles = () => {
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            let p = particlesRef.current[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= 0.03;
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }
    };

    const update = () => {
        const snake = snakeRef.current;
        const direction = directionRef.current = nextDirectionRef.current;
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            setGameOver(true);
            return;
        }

        for (let part of snake) {
            if (head.x === part.x && head.y === part.y) {
                setGameOver(true);
                return;
            }
        }

        snake.unshift(head);

        if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
            setScore(s => s + 10);
            if (speedRef.current > MIN_SPEED) {
                speedRef.current -= SPEED_DECREMENT;
                setCurrentSpeed(speedRef.current);
            }
            spawnParticles(head.x, head.y, '#ff00d4');
            spawnFood();
        } else {
            snake.pop();
        }
    };

    const spawnFood = () => {
        let newFood;
        let valid = false;
        while (!valid) {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
            valid = !snakeRef.current.some(part => part.x === newFood.x && part.y === newFood.y);
        }
        foodRef.current = newFood;
    };

    const draw = (ctx) => {
        // Background
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Grid with glow
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * TILE_SIZE, 0);
            ctx.lineTo(i * TILE_SIZE, ctx.canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * TILE_SIZE);
            ctx.lineTo(ctx.canvas.width, i * TILE_SIZE);
            ctx.stroke();
        }

        // Food - Glowing Apple/Fruit
        const food = foodRef.current;
        const foodX = food.x * TILE_SIZE + TILE_SIZE / 2;
        const foodY = food.y * TILE_SIZE + TILE_SIZE / 2;
        const pulse = Math.sin(foodPulseRef.current) * 3 + 12;

        // Outer glow
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ff00d4';

        // Main fruit body
        const gradient = ctx.createRadialGradient(foodX - 3, foodY - 3, 2, foodX, foodY, pulse);
        gradient.addColorStop(0, '#ff66ff');
        gradient.addColorStop(0.5, '#ff00d4');
        gradient.addColorStop(1, '#cc0099');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(foodX, foodY, pulse, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(foodX - 4, foodY - 4, 4, 0, Math.PI * 2);
        ctx.fill();

        // Stem
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(foodX, foodY - pulse);
        ctx.lineTo(foodX + 3, foodY - pulse - 5);
        ctx.stroke();

        // Snake with gradient body
        const snake = snakeRef.current;
        snake.forEach((part, index) => {
            const x = part.x * TILE_SIZE;
            const y = part.y * TILE_SIZE;
            const isHead = index === 0;

            if (isHead) {
                // Head - larger and detailed
                ctx.shadowBlur = 30;
                ctx.shadowColor = '#00f3ff';

                // Head gradient
                const headGradient = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
                headGradient.addColorStop(0, '#00ffff');
                headGradient.addColorStop(1, '#00aaff');
                ctx.fillStyle = headGradient;

                ctx.beginPath();
                ctx.roundRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2, 10);
                ctx.fill();

                // Eyes
                const dir = directionRef.current;
                let eyeOffsetX = 8;
                let eyeOffsetY = 8;

                if (dir.x === 1) { eyeOffsetX = 15; eyeOffsetY = 8; }
                else if (dir.x === -1) { eyeOffsetX = 5; eyeOffsetY = 8; }
                else if (dir.y === 1) { eyeOffsetX = 8; eyeOffsetY = 15; }
                else if (dir.y === -1) { eyeOffsetX = 8; eyeOffsetY = 5; }

                ctx.shadowBlur = 0;

                // Eye whites
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x + eyeOffsetX - 4, y + eyeOffsetY, 4, 0, Math.PI * 2);
                ctx.arc(x + eyeOffsetX + 4, y + eyeOffsetY, 4, 0, Math.PI * 2);
                ctx.fill();

                // Pupils
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(x + eyeOffsetX - 4 + dir.x, y + eyeOffsetY + dir.y, 2, 0, Math.PI * 2);
                ctx.arc(x + eyeOffsetX + 4 + dir.x, y + eyeOffsetY + dir.y, 2, 0, Math.PI * 2);
                ctx.fill();

                // Tongue (if moving right)
                if (dir.x === 1) {
                    ctx.strokeStyle = '#ff0066';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x + TILE_SIZE, y + TILE_SIZE / 2);
                    ctx.lineTo(x + TILE_SIZE + 6, y + TILE_SIZE / 2);
                    ctx.stroke();

                    // Fork
                    ctx.beginPath();
                    ctx.moveTo(x + TILE_SIZE + 6, y + TILE_SIZE / 2);
                    ctx.lineTo(x + TILE_SIZE + 8, y + TILE_SIZE / 2 - 2);
                    ctx.moveTo(x + TILE_SIZE + 6, y + TILE_SIZE / 2);
                    ctx.lineTo(x + TILE_SIZE + 8, y + TILE_SIZE / 2 + 2);
                    ctx.stroke();
                }
            } else {
                // Body segments with gradient
                const alpha = 1 - (index / snake.length) * 0.3;
                ctx.shadowBlur = 15;
                ctx.shadowColor = `rgba(0, 243, 255, ${alpha})`;

                const bodyGradient = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
                bodyGradient.addColorStop(0, `rgba(0, 243, 255, ${alpha})`);
                bodyGradient.addColorStop(1, `rgba(0, 180, 255, ${alpha})`);
                ctx.fillStyle = bodyGradient;

                ctx.beginPath();
                ctx.roundRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 8);
                ctx.fill();

                // Scale pattern
                ctx.shadowBlur = 0;
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.2})`;
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });
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
    };

    const { user } = useAuth();
    const [highScore, setHighScore] = useState(0);

    useEffect(() => {
        if (user) {
            scoresApi.getUserBest(user.id, 'snake').then(setHighScore);
        }
    }, [user]);

    useEffect(() => {
        if (gameOver && score > 0 && user) {
            scoresApi.submitScore(user.id, user.user_metadata?.username || user.email, 'snake', score).then((result) => {
                if (result && result.newHighScore) {
                    setHighScore(score);
                }
            });
        }
    }, [gameOver, score, user]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="mb-6 flex justify-between w-full max-w-[600px] glass-panel p-4 rounded-lg">
                <h2 className="text-2xl font-orbitron text-neon-green">NEON SNAKE</h2>
                <div className="flex gap-6">
                    <div className="text-xl font-bold">SPD: <span className="text-neon-green">{Math.round((210 - currentSpeed) / 10)}</span></div>
                    <div className="text-xl font-bold">SCORE: <span className="text-neon-pink">{score}</span></div>
                    <div className="text-xl font-bold">BEST: <span className="text-yellow-400">{highScore}</span></div>
                </div>
            </div>
            <div className="relative group">
                <canvas
                    ref={canvasRef}
                    className="border-2 border-neon-green/30 rounded-lg shadow-[0_0_30px_rgba(0,255,136,0.2)]"
                />
                {(!gameStarted || gameOver) && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center rounded-lg">
                        <div className="text-center">
                            <h3 className="text-4xl font-orbitron text-white mb-4 text-glow">
                                {gameOver ? 'GAME OVER' : 'READY?'}
                            </h3>
                            {gameOver && <p className="text-xl mb-4 text-neon-pink">Final Score: {score}</p>}
                            <button
                                onClick={initGame}
                                className="px-8 py-3 bg-neon-green text-black font-bold uppercase tracking-widest hover:bg-white hover:shadow-[0_0_20px_white] transition-all rounded"
                            >
                                {gameOver ? 'Retry' : 'Start'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-8 text-gray-400 text-sm">
                Use <span className="text-white border border-gray-600 px-2 py-1 rounded mx-1">WASD</span> or <span className="text-white border border-gray-600 px-2 py-1 rounded mx-1">Arrow Keys</span> to move
            </div>
        </div>
    );
};

export default SnakeGame;
