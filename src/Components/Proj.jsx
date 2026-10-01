import React, { useEffect, useState, useRef } from "react";
import "../assets/Style/style.css";
import snake from '../assets/Image/snake.svg';


/* ---------- Settings ---------- */
const CELL = 20;              // oru cell size (px)
const GRID = 15;              // 15 x 15 grid
const SIZE = CELL * GRID;     // board size = 300px
const SPEED = 150;            // ms. kammi pannna vegama pogum

/* ---------- Helper functions ---------- */

// Snake body mela vizhaadha random food position
const randomFood = (snake) => {
  while (true) {
    const f = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
    const onSnake = snake.some((s) => s.x === f.x && s.y === f.y);
    if (!onSnake) return f;
  }
};

// Game start aagumbodhu irukka state
const initialState = () => {
  const snake = [
    { x: 7, y: 7 }, // head (first element)
    { x: 7, y: 8 },
    { x: 7, y: 9 },
  ];
  return { snake, food: randomFood(snake), score: 0, gameOver: false };
};

// Oru step move: pudhu state return pannum
const step = (prev, dir) => {
  if (prev.gameOver) return prev;

  // 1. Pudhu head = pazhaya head + direction
  const head = {
    x: prev.snake[0].x + dir.x,
    y: prev.snake[0].y + dir.y,
  };

  // 2. Collision check (wall / own body)
  const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
  const hitSelf = prev.snake.some((s) => s.x === head.x && s.y === head.y);
  if (hitWall || hitSelf) {
    return { ...prev, gameOver: true };
  }

  // 3. Food saapta?
  const ate = head.x === prev.food.x && head.y === prev.food.y;

  // 4. Head-a mun la serkkurom
  const newSnake = [head, ...prev.snake];

  // 5. Food saapala na tail remove (saaptaa remove pannama, so valarum)
  if (!ate) newSnake.pop();

  return {
    snake: newSnake,
    food: ate ? randomFood(newSnake) : prev.food,
    score: ate ? prev.score + 1 : prev.score,
    gameOver: false,
  };
};

/* ---------- Component ---------- */
function Proj() {
  const [game, setGame] = useState(initialState);

  const dirRef = useRef({ x: 0, y: -1 });   // next pogum direction (initial: mela)
  const movedDir = useRef({ x: 0, y: -1 }); // last-a evlo poyirukku (reverse block panna)

  // Game loop: ovvoru SPEED ms-kkum snake move aagum
  useEffect(() => {
    if (game.gameOver) return;

    const id = setInterval(() => {
      movedDir.current = dirRef.current;
      setGame((prev) => step(prev, dirRef.current));
    }, SPEED);

    return () => clearInterval(id); // cleanup
  }, [game.gameOver]);

  // Keyboard control
  useEffect(() => {
    const onKey = (e) => {
      const keys = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const next = keys[e.key];
      if (!next) return;
      e.preventDefault(); // arrow key press-na page scroll aagama

      // Opposite direction-ku poga koodathu
      const last = movedDir.current;
      if (next.x === -last.x && next.y === -last.y) return;

      dirRef.current = next;
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Restart
  const restart = () => {
    dirRef.current = { x: 0, y: -1 };
    movedDir.current = { x: 0, y: -1 };
    setGame(initialState());
  };

  // Head-oda kann (eyes) position
  const head = game.snake[0];
  const d = dirRef.current;
  const hx = head.x * CELL + CELL / 2;
  const hy = head.y * CELL + CELL / 2;
  const eye1 = { x: hx + d.x * 4 + -d.y * 4, y: hy + d.y * 4 + d.x * 4 };
  const eye2 = { x: hx + d.x * 4 - -d.y * 4, y: hy + d.y * 4 - d.x * 4 };

  return (
    <div className="snk-page">
      <div className="snk-card">
        {/* Title */}
        <h1 className="snk-title">
          <span className="snk-icon">🐍</span> SNAKE GAME
        </h1>

        {/* Board */}
        <div className="snk-board-wrap">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <defs>
              {/* Board background gradient */}
              <radialGradient id="boardGrad" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#16201b" />
                <stop offset="100%" stopColor="#0a0f0c" />
              </radialGradient>

              {/* Snake gradient */}
              <linearGradient id="snakeGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>

              {/* Food gradient */}
              <radialGradient id="foodGrad" cx="35%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#ff8a80" />
                <stop offset="100%" stopColor="#b71c1c" />
              </radialGradient>

              {/* Glow effect */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Grid lines */}
              <pattern
                id="gridPattern"
                width={CELL}
                height={CELL}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${CELL} 0 L 0 0 0 ${CELL}`}
                  fill="none"
                  stroke="#1f2b24"
                  strokeWidth="0.6"
                />
              </pattern>
            </defs>

            {/* Background + grid */}
            <rect width={SIZE} height={SIZE} fill="url(#boardGrad)" />
            <rect width={SIZE} height={SIZE} fill="url(#gridPattern)" />

            {/* Food */}
            <circle
              cx={game.food.x * CELL + CELL / 2}
              cy={game.food.y * CELL + CELL / 2}
              r={CELL / 2 - 3}
              fill="url(#foodGrad)"
              filter="url(#glow)"
            />

            {/* Snake body */}
            <g filter="url(#glow)">
              {game.snake.map((s, i) => (
                <rect
                  key={i}
                  x={s.x * CELL + 2}
                  y={s.y * CELL + 2}
                  width={CELL - 4}
                  height={CELL - 4}
                  rx={i === 0 ? 7 : 5}
                  fill="url(#snakeGrad)"
                  opacity={1 - (i / game.snake.length) * 0.5} // tail pogapoga light aagum
                />
              ))}
            </g>

            {/* Snake eyes */}
            <circle cx={eye1.x} cy={eye1.y} r="2" fill="#fff" />
            <circle cx={eye2.x} cy={eye2.y} r="2" fill="#fff" />
          </svg>

          {/* Game Over (center-la) */}
          {game.gameOver && (
            <div className="snk-over">
              <h2>GAME OVER</h2>
              <p>Score: {game.score}</p>
            </div>
          )}
        </div>

        {/* Score + Restart */}
        <div className="snk-footer">
          <span className="snk-score">Score: {game.score}</span>
          <button className="snk-btn" onClick={restart}>
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}

export default Proj;