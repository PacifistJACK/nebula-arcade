import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { scoresApi } from '../lib/scores';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

const NeonShooter = () => {
    const canvasRef = useRef(null);
    const { user } = useAuth();

    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [highScoreUser, setHighScoreUser] = useState("Loading...");
    const [gameState, setGameState] = useState('MENU');
    const [stage, setStage] = useState(1);
    const [health, setHealth] = useState(100);
    const [ammo, setAmmo] = useState(30);
    const [kills, setKills] = useState(0);

    const scoreRef = useRef(0);
    const stageRef = useRef(1);
    const healthRef = useRef(100);
    const killsRef = useRef(0);
    const killsNeededRef = useRef(5);

    const playerRef = useRef({ x: 400, y: 500, vx: 0, vy: 0, angle: 0 });
    const enemiesRef = useRef([]);
    const bulletsRef = useRef([]);
    const enemyBulletsRef = useRef([]);
    const obstaclesRef = useRef([]);
    const particlesRef = useRef([]);
    const shellCasingsRef = useRef([]);

    const keysRef = useRef({ w: false, a: false, s: false, d: false });
    const mouseRef = useRef({ x: 450, y: 300 });
    const ammoRef = useRef(30);
    const reloadingRef = useRef(false);
    const muzzleFlashRef = useRef(0);
    const screenShakeRef = useRef(0);

    const animationFrameRef = useRef(null);
    const lastTimeRef = useRef(0);
    const audioCtxRef = useRef(null);

    useEffect(() => {
        const fetchScore = async () => {
            const leaderboard = await scoresApi.getLeaderboard('neon-shooter', 1);
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
            if (type === 'shoot') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'hit') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(800, now);
                osc.type = 'square';
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'damage') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(100, now);
                osc.type = 'sawtooth';
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            }
        } catch (e) { }
    };

    const initStage = (stageNum) => {
        initAudio();

        stageRef.current = stageNum;
        killsRef.current = 0;

        // Spawn enemies based on stage
        const enemyCount = 3 + stageNum;
        killsNeededRef.current = enemyCount; // Match kills needed to enemies spawned

        if (stageNum === 1) {
            scoreRef.current = 0;
            healthRef.current = 100;
            setScore(0);
            setHealth(100);
        }

        playerRef.current = { x: 450, y: 520, vx: 0, vy: 0, angle: 0 };
        enemiesRef.current = [];
        bulletsRef.current = [];
        enemyBulletsRef.current = [];
        particlesRef.current = [];
        shellCasingsRef.current = [];
        ammoRef.current = 30;
        reloadingRef.current = false;
        screenShakeRef.current = 0;

        // Create obstacles (cover) - positioned for 900x600 canvas
        obstaclesRef.current = [
            { x: 120, y: 220, width: 110, height: 85, color: '#555' },
            { x: 670, y: 220, width: 110, height: 85, color: '#555' },
            { x: 390, y: 130, width: 120, height: 95, color: '#666' },
            { x: 120, y: 400, width: 95, height: 110, color: '#444' },
            { x: 685, y: 400, width: 95, height: 110, color: '#444' },
            { x: 390, y: 360, width: 120, height: 75, color: '#555' }
        ];

        // Spawn enemies based on stage
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => spawnEnemy(), i * 500);
        }

        setStage(stageNum);
        setKills(0);
        setAmmo(30);
        setGameState('PLAYING');

        lastTimeRef.current = performance.now();
    };

    const spawnEnemy = () => {
        const health = 1 + Math.floor(stageRef.current / 2);
        const speed = 1 + stageRef.current * 0.15;

        // Find valid spawn position (not in obstacles, not too close to player)
        let x, y, attempts = 0;
        let validPosition = false;

        while (!validPosition && attempts < 50) {
            // Spawn in top half of map with margins
            x = Math.random() * (CANVAS_WIDTH - 150) + 75;
            y = Math.random() * (CANVAS_HEIGHT / 2 - 150) + 75;

            // Check not in obstacle
            const inObstacle = checkCollision(x - 25, y - 25, 50, 50);

            // Check not too close to player
            const player = playerRef.current;
            const distToPlayer = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2);

            // Check within bounds
            const withinBounds = x > 50 && x < CANVAS_WIDTH - 50 && y > 50 && y < CANVAS_HEIGHT / 2;

            if (!inObstacle && distToPlayer > 250 && withinBounds) {
                validPosition = true;
            }

            attempts++;
        }

        // Fallback to safe position if no valid spot found
        if (!validPosition) {
            x = CANVAS_WIDTH / 2;
            y = 100;
        }

        enemiesRef.current.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            health: health,
            maxHealth: health,
            speed: speed,
            shootTimer: Math.random() * 2 + 1,
            hitFlash: 0,
            angle: 0,
            color: `hsl(${10 + Math.random() * 30}, 100%, 50%)`
        });
    };

    const shoot = () => {
        if (reloadingRef.current || ammoRef.current <= 0) return;

        ammoRef.current--;
        setAmmo(ammoRef.current);
        muzzleFlashRef.current = 1.0;
        screenShakeRef.current = 5;
        playSound('shoot');

        const player = playerRef.current;
        const mouse = mouseRef.current;
        const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

        bulletsRef.current.push({
            x: player.x + Math.cos(angle) * 25,
            y: player.y + Math.sin(angle) * 25,
            vx: Math.cos(angle) * 15,
            vy: Math.sin(angle) * 15,
            life: 1.0,
            trail: []
        });

        // Shell casing
        shellCasingsRef.current.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle + Math.PI / 2) * 3 + (Math.random() - 0.5),
            vy: Math.sin(angle + Math.PI / 2) * 3 + (Math.random() - 0.5) - 2,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            life: 2.0
        });

        if (ammoRef.current === 0) {
            reload();
        }
    };

    const reload = () => {
        if (reloadingRef.current) return;
        reloadingRef.current = true;

        setTimeout(() => {
            ammoRef.current = 30;
            setAmmo(30);
            reloadingRef.current = false;
        }, 2000);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'w') keysRef.current.w = true;
            if (key === 'a') keysRef.current.a = true;
            if (key === 's') keysRef.current.s = true;
            if (key === 'd') keysRef.current.d = true;
            if (key === 'r') reload();
        };

        const handleKeyUp = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'w') keysRef.current.w = false;
            if (key === 'a') keysRef.current.a = false;
            if (key === 's') keysRef.current.s = false;
            if (key === 'd') keysRef.current.d = false;
        };

        const handleMouseMove = (e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                mouseRef.current = {
                    x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
                    y: (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)
                };
            }
        };

        const handleClick = () => {
            if (gameState !== 'PLAYING') return;
            shoot();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('click', handleClick);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('click', handleClick);
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

    const checkCollision = (x, y, width, height) => {
        for (const obs of obstaclesRef.current) {
            if (x < obs.x + obs.width &&
                x + width > obs.x &&
                y < obs.y + obs.height &&
                y + height > obs.y) {
                return true;
            }
        }
        return false;
    };

    const update = (dt) => {
        const player = playerRef.current;
        const keys = keysRef.current;
        const mouse = mouseRef.current;

        // Player angle
        player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

        // Player movement
        const speed = 200;
        let dx = 0, dy = 0;

        if (keys.w) dy -= speed * dt;
        if (keys.s) dy += speed * dt;
        if (keys.a) dx -= speed * dt;
        if (keys.d) dx += speed * dt;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const factor = 1 / Math.sqrt(2);
            dx *= factor;
            dy *= factor;
        }

        const newX = player.x + dx;
        const newY = player.y + dy;

        if (!checkCollision(newX - 15, player.y - 15, 30, 30)) {
            player.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, newX));
        }
        if (!checkCollision(player.x - 15, newY - 15, 30, 30)) {
            player.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, newY));
        }

        // Update bullets
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
            const bullet = bulletsRef.current[i];

            // Trail
            bullet.trail.push({ x: bullet.x, y: bullet.y });
            if (bullet.trail.length > 5) bullet.trail.shift();

            bullet.x += bullet.vx * dt * 60;
            bullet.y += bullet.vy * dt * 60;
            bullet.life -= dt;

            if (checkCollision(bullet.x - 2, bullet.y - 2, 4, 4)) {
                bulletsRef.current.splice(i, 1);
                continue;
            }

            if (bullet.life <= 0 || bullet.x < 0 || bullet.x > CANVAS_WIDTH || bullet.y < 0 || bullet.y > CANVAS_HEIGHT) {
                bulletsRef.current.splice(i, 1);
            }
        }

        // Update enemies
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
            const enemy = enemiesRef.current[i];
            enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 3);
            enemy.shootTimer -= dt;

            // Enemy angle to player
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            enemy.angle = Math.atan2(dy, dx);

            // Enemy movement
            if (dist > 200) {
                const moveX = (dx / dist) * enemy.speed * 30 * dt;
                const moveY = (dy / dist) * enemy.speed * 30 * dt;

                const newX = enemy.x + moveX;
                const newY = enemy.y + moveY;

                if (!checkCollision(newX - 15, enemy.y - 15, 30, 30)) {
                    enemy.x = newX;
                }
                if (!checkCollision(enemy.x - 15, newY - 15, 30, 30)) {
                    enemy.y = newY;
                }
            }

            // Enemy shooting
            if (enemy.shootTimer <= 0 && dist < 400) {
                const spread = (Math.random() - 0.5) * 0.2;
                const angle = enemy.angle + spread;

                enemyBulletsRef.current.push({
                    x: enemy.x + Math.cos(angle) * 25,
                    y: enemy.y + Math.sin(angle) * 25,
                    vx: Math.cos(angle) * 8,
                    vy: Math.sin(angle) * 8
                });

                enemy.shootTimer = Math.max(1.5, 3 - stageRef.current * 0.15);
            }
        }

        // Update enemy bullets
        for (let i = enemyBulletsRef.current.length - 1; i >= 0; i--) {
            const bullet = enemyBulletsRef.current[i];
            bullet.x += bullet.vx * dt * 60;
            bullet.y += bullet.vy * dt * 60;

            if (checkCollision(bullet.x - 2, bullet.y - 2, 4, 4)) {
                enemyBulletsRef.current.splice(i, 1);
                continue;
            }

            const dist = Math.sqrt((bullet.x - player.x) ** 2 + (bullet.y - player.y) ** 2);
            if (dist < 20) {
                healthRef.current -= 10;
                setHealth(healthRef.current);
                playSound('damage');
                screenShakeRef.current = 10;
                enemyBulletsRef.current.splice(i, 1);

                if (healthRef.current <= 0) {
                    endGame();
                    return;
                }
                continue;
            }

            if (bullet.x < 0 || bullet.x > CANVAS_WIDTH || bullet.y < 0 || bullet.y > CANVAS_HEIGHT) {
                enemyBulletsRef.current.splice(i, 1);
            }
        }

        // Check bullet-enemy collisions
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
            const bullet = bulletsRef.current[i];

            for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
                const enemy = enemiesRef.current[j];
                const dist = Math.sqrt((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2);

                if (dist < 20) {
                    enemy.health--;
                    enemy.hitFlash = 1.0;
                    playSound('hit');
                    screenShakeRef.current = 3;
                    bulletsRef.current.splice(i, 1);

                    if (enemy.health <= 0) {
                        scoreRef.current += 100 * stageRef.current;
                        setScore(scoreRef.current);
                        killsRef.current++;
                        setKills(killsRef.current);

                        // Explosion particles
                        for (let k = 0; k < 25; k++) {
                            particlesRef.current.push({
                                x: enemy.x,
                                y: enemy.y,
                                vx: (Math.random() - 0.5) * 12,
                                vy: (Math.random() - 0.5) * 12,
                                life: 1.0,
                                color: enemy.color,
                                size: Math.random() * 5 + 2
                            });
                        }

                        enemiesRef.current.splice(j, 1);

                        if (killsRef.current >= killsNeededRef.current) {
                            setGameState('STAGE_CLEAR');
                        }
                    }
                    break;
                }
            }
        }

        // Update particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vy += 0.4;
            p.vx *= 0.98;
            p.life -= dt * 2;
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }

        // Update shell casings
        for (let i = shellCasingsRef.current.length - 1; i >= 0; i--) {
            const shell = shellCasingsRef.current[i];
            shell.x += shell.vx * dt * 60;
            shell.y += shell.vy * dt * 60;
            shell.vy += 0.5;
            shell.vx *= 0.95;
            shell.rotation += shell.rotationSpeed;
            shell.life -= dt;
            if (shell.life <= 0) shellCasingsRef.current.splice(i, 1);
        }

        if (muzzleFlashRef.current > 0) muzzleFlashRef.current -= dt * 5;
        if (screenShakeRef.current > 0) screenShakeRef.current -= dt * 30;
    };

    const draw = (ctx) => {
        ctx.save();

        // Screen shake
        if (screenShakeRef.current > 0) {
            ctx.translate(
                (Math.random() - 0.5) * screenShakeRef.current,
                (Math.random() - 0.5) * screenShakeRef.current
            );
        }

        // Background gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        bgGradient.addColorStop(0, '#1a1a35');
        bgGradient.addColorStop(1, '#0a0a15');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Grid
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < CANVAS_WIDTH; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(CANVAS_WIDTH, i);
            ctx.stroke();
        }

        // Obstacles
        obstaclesRef.current.forEach(obs => {
            const gradient = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
            gradient.addColorStop(0, obs.color);
            gradient.addColorStop(1, '#1a1a1a');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#000';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height / 3);
        });

        // Shell casings
        shellCasingsRef.current.forEach(shell => {
            ctx.save();
            ctx.translate(shell.x, shell.y);
            ctx.rotate(shell.rotation);
            ctx.globalAlpha = shell.life / 2;
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(-3, -2, 6, 4);
            ctx.restore();
        });

        ctx.globalAlpha = 1;

        // Player
        const player = playerRef.current;
        const playerGradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 22);
        playerGradient.addColorStop(0, '#00ffff');
        playerGradient.addColorStop(0.7, '#0088ff');
        playerGradient.addColorStop(1, '#0044aa');

        ctx.shadowBlur = 25;
        ctx.shadowColor = '#00ffff';
        ctx.fillStyle = playerGradient;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
        ctx.fill();

        // Player gun
        ctx.shadowBlur = 10;
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        ctx.fillStyle = '#333';
        ctx.fillRect(15, -3, 20, 6);
        ctx.fillStyle = '#666';
        ctx.fillRect(15, -2, 20, 4);
        ctx.restore();

        ctx.shadowBlur = 0;

        // Enemies with guns
        enemiesRef.current.forEach(enemy => {
            const flashColor = enemy.hitFlash > 0 ? '#ffffff' : enemy.color;
            const enemyGradient = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, 22);
            enemyGradient.addColorStop(0, flashColor);
            enemyGradient.addColorStop(0.7, enemy.color);
            enemyGradient.addColorStop(1, '#aa0000');

            ctx.shadowBlur = 20;
            ctx.shadowColor = enemy.color;
            ctx.fillStyle = enemyGradient;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, 22, 0, Math.PI * 2);
            ctx.fill();

            // Enemy gun
            ctx.shadowBlur = 8;
            ctx.save();
            ctx.translate(enemy.x, enemy.y);
            ctx.rotate(enemy.angle);
            ctx.fillStyle = '#222';
            ctx.fillRect(15, -3, 18, 6);
            ctx.fillStyle = '#555';
            ctx.fillRect(15, -2, 18, 4);
            ctx.restore();

            // Health bar
            if (enemy.health < enemy.maxHealth) {
                const barWidth = 44;
                const healthPercent = enemy.health / enemy.maxHealth;

                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 35, barWidth, 5);
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 35, barWidth, 5);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 35, barWidth * healthPercent, 5);
            }
        });

        ctx.shadowBlur = 0;

        // Bullet trails
        bulletsRef.current.forEach(bullet => {
            bullet.trail.forEach((pos, i) => {
                ctx.globalAlpha = (i / bullet.trail.length) * bullet.life * 0.5;
                ctx.fillStyle = '#ffff00';
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#ffff00';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        ctx.globalAlpha = 1;

        // Bullets
        bulletsRef.current.forEach(bullet => {
            ctx.save();
            ctx.globalAlpha = bullet.life;
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffff00';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Enemy bullets
        enemyBulletsRef.current.forEach(bullet => {
            ctx.fillStyle = '#ff0066';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ff0066';
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
            ctx.fill();
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

        // Crosshair
        const mouse = mouseRef.current;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ff00';

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(mouse.x - 25, mouse.y);
        ctx.lineTo(mouse.x - 10, mouse.y);
        ctx.moveTo(mouse.x + 10, mouse.y);
        ctx.lineTo(mouse.x + 25, mouse.y);
        ctx.moveTo(mouse.x, mouse.y - 25);
        ctx.lineTo(mouse.x, mouse.y - 10);
        ctx.moveTo(mouse.x, mouse.y + 10);
        ctx.lineTo(mouse.x, mouse.y + 25);
        ctx.stroke();

        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Muzzle flash
        if (muzzleFlashRef.current > 0) {
            ctx.globalAlpha = muzzleFlashRef.current;
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = 35;
            ctx.shadowColor = '#ffff00';
            ctx.beginPath();
            ctx.arc(player.x + Math.cos(player.angle) * 30, player.y + Math.sin(player.angle) * 30, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    };

    const endGame = () => {
        setGameState('GAME_OVER');

        if (scoreRef.current > highScore) {
            setHighScore(scoreRef.current);
            setHighScoreUser("YOU");
            const username = user?.user_metadata?.username || user?.email?.split('@')[0] || "Anonymous";
            if (user) {
                scoresApi.submitScore(user.id, username, 'neon-shooter', scoreRef.current);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[90vh]">
            <div className="mb-4 flex justify-between w-full max-w-[900px] glass-panel p-4 rounded-lg">
                <h2 className="text-2xl font-orbitron text-green-400">NEON WARFARE</h2>
                <div className="flex gap-6">
                    <div className="text-xl font-bold">STAGE: <span className="text-yellow-400">{stage}</span></div>
                    <div className="text-xl font-bold">KILLS: <span className="text-neon-pink">{kills}/{killsNeededRef.current}</span></div>
                    <div className="text-xl font-bold">HP: <span className={health < 30 ? "text-red-400" : "text-green-400"}>{health}</span></div>
                    <div className="text-xl font-bold">AMMO: <span className={ammo < 10 ? "text-red-400" : "text-white"}>{ammo}/30</span></div>
                    <div className="text-xl font-bold">SCORE: <span className="text-neon-blue">{score}</span></div>
                </div>
            </div>

            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="border-2 border-green-500/30 rounded-lg bg-[#050510] shadow-[0_0_50px_rgba(0,255,0,0.15)] cursor-none"
                    style={{ maxWidth: '100%', height: 'auto' }}
                />

                {gameState !== 'PLAYING' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                        <div className="text-center p-8">
                            <h3 className="text-5xl font-black font-orbitron text-white mb-2 text-glow tracking-tighter">
                                {gameState === 'GAME_OVER' ? 'MISSION FAILED' :
                                    gameState === 'STAGE_CLEAR' ? 'STAGE CLEARED!' : 'NEON WARFARE'}
                            </h3>

                            {gameState === 'GAME_OVER' && (
                                <>
                                    <p className="text-2xl mb-2 text-green-400 font-orbitron">SCORE: {score}</p>
                                    <p className="text-lg mb-4 text-gray-400">STAGE: {stage} | HIGH: {highScore}</p>
                                </>
                            )}

                            {gameState === 'STAGE_CLEAR' && (
                                <p className="text-xl mb-4 text-cyan-400">Ready for Stage {stage + 1}?</p>
                            )}

                            {gameState === 'MENU' && (
                                <div className="mb-6 text-left text-gray-300 space-y-2">
                                    <p>🎮 <span className="text-cyan-400">WASD</span> to move</p>
                                    <p>🎯 <span className="text-green-400">Mouse</span> to aim</p>
                                    <p>🔫 <span className="text-yellow-400">Click</span> to shoot</p>
                                    <p>🔄 Press <span className="text-white font-bold">R</span> to reload</p>
                                    <p>🛡️ Use obstacles for cover!</p>
                                    <p>⚠️ Enemies have guns and shoot back!</p>
                                </div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    if (gameState === 'STAGE_CLEAR') {
                                        initStage(stage + 1);
                                    } else {
                                        initStage(1);
                                    }
                                }}
                                className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-black font-black text-xl uppercase tracking-widest rounded mt-4"
                            >
                                {gameState === 'STAGE_CLEAR' ? 'NEXT STAGE' :
                                    gameState === 'GAME_OVER' ? 'RETRY' : 'START MISSION'}
                            </motion.button>
                        </div>
                    </div>
                )}

                {reloadingRef.current && gameState === 'PLAYING' && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-2xl font-orbitron text-yellow-400 animate-pulse">
                        RELOADING...
                    </div>
                )}
            </div>

            <p className="mt-8 text-gray-500 text-xs font-mono">
                WASD TO MOVE • MOUSE TO AIM • CLICK TO SHOOT • R TO RELOAD
            </p>
        </div>
    );
};

export default NeonShooter;
