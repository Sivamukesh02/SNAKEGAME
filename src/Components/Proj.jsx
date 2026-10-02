import React, { useEffect, useState, useRef } from "react";
import "../assets/Style/style.css";
import snakehead from "../assets/Image/head.png";

/* ---------- Settings ---------- */
const CELL = 22;              // oru cell size
const GRID = 15;              // 15 x 15 grid
const SIZE = CELL * GRID;     // board size = 330
const SPEED = 150;            // ms. kammi pannna vegama pogum

const USE_HEAD_IMAGE = true;  // true = head.png, false = SVG head (kann + naakku)
const HEAD_SIZE = CELL * 2.3; // head image size
const HEAD_OFFSET = 180;      // head.png natively keezha paakkudhu, adhanaala 180
const HEAD_SHIFT = 0;         // head image-a munnadi thalla (px)

const MAX_W = 17;             // thalai pakkam odambu thadi
const MIN_W = 2;              // vaal nuni thadi

const UP = { x: 0, y: -1 };
const DOWN = { x: 0, y: 1 };
const LEFT = { x: -1, y: 0 };
const RIGHT = { x: 1, y: 0 };

/* ---------- Helper functions ---------- */

// Snake body mela vizhaadha random food position
const randomFood = (snake) => {
  while (true) {
    const f = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
    if (!snake.some((s) => s.x === f.x && s.y === f.y)) return f;
  }
};

// Game start state
const initialState = () => {
  const snake = [
    { x: 7, y: 7 }, // head
    { x: 7, y: 8 },
    { x: 7, y: 9 },
    { x: 7, y: 10 },
  ];
  return { snake, food: randomFood(snake), score: 0, gameOver: false };
};

// Oru step move
const step = (prev, dir) => {
  if (prev.gameOver) return prev;

  const head = {
    x: prev.snake[0].x + dir.x,
    y: prev.snake[0].y + dir.y,
  };

  const ate = head.x === prev.food.x && head.y === prev.food.y;

  // Food saapala na tail indha step-la nagarum, so tail cell-a collision-la edukka vendaam
  const body = ate ? prev.snake : prev.snake.slice(0, -1);

  const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
  const hitSelf = body.some((s) => s.x === head.x && s.y === head.y);
  if (hitWall || hitSelf) return { ...prev, gameOver: true };

  const newSnake = [head, ...prev.snake];
  if (!ate) newSnake.pop();

  return {
    snake: newSnake,
    food: ate ? randomFood(newSnake) : prev.food,
    score: ate ? prev.score + 1 : prev.score,
    gameOver: false,
  };
};

// RGB -> HSL (head.png colour-a body-ku maathikka)
const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  let h = 0;
  let s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Touch arrow button
function PadBtn({ cls, rot, onPress }) {
  return (
    <button
      className={`snk-pad ${cls}`}
      aria-label={cls}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="26"
        height="26"
        style={{ transform: `rotate(${rot}deg)` }}
      >
        <path d="M12 5 L21 19 H3 Z" fill="currentColor" />
      </svg>
    </button>
  );
}

/* ---------- Component ---------- */
function Proj() {
  const [game, setGame] = useState(initialState);
  const [paused, setPaused] = useState(false);
  const [tone, setTone] = useState({ h: 140, s: 70, l: 45 }); // body colour

  const dirRef = useRef(UP);     // next pogum direction
  const movedDir = useRef(UP);   // last poyirukkira direction
  const touchStart = useRef(null);

  // head.png-la irundhu colour edukkurom -> body colour
  useEffect(() => {
    if (!USE_HEAD_IMAGE) return;
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 32, 32);
        const px = ctx.getImageData(0, 0, 32, 32).data;

        let r = 0, g = 0, b = 0, sum = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 200) continue; // transparent pixels venaam
          const mx = Math.max(px[i], px[i + 1], px[i + 2]);
          const mn = Math.min(px[i], px[i + 1], px[i + 2]);
          const w = mx - mn + 1; // colour irukkura pixel-ku adhigam weight (black/white outline kammi)
          r += px[i] * w;
          g += px[i + 1] * w;
          b += px[i + 2] * w;
          sum += w;
        }
        if (!sum) return;
        const hsl = rgbToHsl(r / sum, g / sum, b / sum);
        setTone({
          h: hsl.h,
          s: clamp(hsl.s, 45, 90),
          l: clamp(hsl.l, 36, 52),
        });
      } catch (err) {
        /* colour edukka mudiyala na default green */
      }
    };
    img.src = snakehead;
  }, []);

  // Ella input-um (keyboard / swipe / button) idhaiye use pannum
  const changeDir = (next) => {
    const last = movedDir.current;
    if (next.x === -last.x && next.y === -last.y) return; // opposite block
    dirRef.current = next;
  };

  // Restart
  const restart = () => {
    dirRef.current = UP;
    movedDir.current = UP;
    setPaused(false);
    setGame(initialState());
  };

  // Pause / Resume
  const togglePause = () => {
    if (game.gameOver) return;
    setPaused((p) => !p);
  };

  // Game loop (pause aanaa nikkum)
  useEffect(() => {
    if (game.gameOver || paused) return;
    const id = setInterval(() => {
      movedDir.current = dirRef.current;
      setGame((prev) => step(prev, dirRef.current));
    }, SPEED);
    return () => clearInterval(id);
  }, [game.gameOver, paused]);

  // Keyboard
  useEffect(() => {
    const keys = {
      ArrowUp: UP, ArrowDown: DOWN, ArrowLeft: LEFT, ArrowRight: RIGHT,
      w: UP, s: DOWN, a: LEFT, d: RIGHT,
    };
    const onKey = (e) => {
      // Space / Enter: game over na restart, illana pause-resume
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (game.gameOver) restart();
        else setPaused((p) => !p);
        return;
      }
      if (e.key === "p" || e.key === "P") {
        if (!game.gameOver) setPaused((p) => !p);
        return;
      }
      const next = keys[e.key];
      if (!next) return;
      e.preventDefault();
      changeDir(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game.gameOver]);

  // Swipe (page-la enga swipe pannalum work aagum)
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) changeDir(dx > 0 ? RIGHT : LEFT);
    else changeDir(dy > 0 ? DOWN : UP);
  };

  /* ---------- Snake drawing maths ---------- */
  const n = game.snake.length;
  const center = (c) => ({ x: c.x * CELL + CELL / 2, y: c.y * CELL + CELL / 2 });

  // Thalai (0) -> vaal (n-1): odambu migaiyaaga melliyadhaagum
  const widthAt = (i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    return MIN_W + (MAX_W - MIN_W) * Math.pow(1 - t, 0.75);
  };
  const colorAt = (i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    return `hsl(${tone.h}, ${tone.s}%, ${tone.l - t * 12}%)`;
  };

  const order = [...Array(n).keys()].reverse(); // vaal -> thalai

  // Head facing direction (head - mudhal body cell)
  const head = center(game.snake[0]);
  const nx = game.snake[0].x - game.snake[1].x;
  const ny = game.snake[0].y - game.snake[1].y;
  const angle = (Math.atan2(nx, -ny) * 180) / Math.PI + HEAD_OFFSET;

  return (
    <div
      className="snk-page"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="snk-card">
        {/* Title */}
        <h1 className="snk-title">
          <span className="snk-icon">🐍</span> SNAKE GAME
        </h1>

        {/* Board */}
        <div className="snk-board-wrap">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <defs>
              {/* Board background: konjam lighter */}
              <radialGradient id="boardGrad" cx="50%" cy="50%" r="75%">
                <stop offset="0%" stopColor="#2e4b3e" />
                <stop offset="100%" stopColor="#1c3128" />
              </radialGradient>

              {/* Apple gradient */}
              <radialGradient id="appleGrad" cx="35%" cy="35%" r="75%">
                <stop offset="0%" stopColor="#ff8a80" />
                <stop offset="55%" stopColor="#e53935" />
                <stop offset="100%" stopColor="#8e0000" />
              </radialGradient>

              {/* SVG head gradient (fallback head) */}
              <radialGradient id="headGrad" cx="50%" cy="35%" r="75%">
                <stop offset="0%" stopColor={`hsl(${tone.h}, ${tone.s}%, ${tone.l + 18}%)`} />
                <stop offset="100%" stopColor={`hsl(${tone.h}, ${tone.s}%, ${tone.l - 6}%)`} />
              </radialGradient>

              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <pattern
                id="gridPattern"
                width={CELL}
                height={CELL}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${CELL} 0 L 0 0 0 ${CELL}`}
                  fill="none"
                  stroke="#3d6150"
                  strokeWidth="0.6"
                />
              </pattern>
            </defs>

            {/* Background + grid */}
            <rect width={SIZE} height={SIZE} fill="url(#boardGrad)" />
            <rect width={SIZE} height={SIZE} fill="url(#gridPattern)" />

            {/* Apple */}
            <g
              transform={`translate(${game.food.x * CELL + CELL / 2} ${
                game.food.y * CELL + CELL / 2 + 1
              }) scale(0.85)`}
              filter="url(#glow)"
            >
              <path
                d="M 0 -4 C -3 -8 -11 -5 -10 3 C -9 10 -4 12 0 10 C 4 12 9 10 10 3 C 11 -5 3 -8 0 -4 Z"
                fill="url(#appleGrad)"
              />
              <ellipse
                cx="-4.5"
                cy="-0.5"
                rx="2"
                ry="3.6"
                fill="#fff"
                opacity="0.35"
                transform="rotate(-20 -4.5 -0.5)"
              />
              <path
                d="M 0 -4 Q 1 -9 3 -11"
                stroke="#7c4a1e"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M 1 -8 Q 6 -13 11 -9 Q 6 -5 1 -8 Z" fill="#4ade80" />
            </g>

            {/* Snake body: vaal -> thalai (thalai mela varum) */}
            <g filter="url(#glow)">
              {order.map((i) => {
                const p = center(game.snake[i]);
                const w = widthAt(i);
                const col = colorAt(i);
                const q = i < n - 1 ? center(game.snake[i + 1]) : null;
                return (
                  <g key={i}>
                    {q && (
                      <line
                        x1={p.x}
                        y1={p.y}
                        x2={q.x}
                        y2={q.y}
                        stroke={col}
                        strokeWidth={widthAt(i + 1)}
                        strokeLinecap="round"
                      />
                    )}
                    <circle cx={p.x} cy={p.y} r={w / 2} fill={col} />
                  </g>
                );
              })}
            </g>

            {/* Body decoration: mele light stripe + dark spots */}
            {order.map((i) => {
              if (i === 0) return null;
              const p = center(game.snake[i]);
              const w = widthAt(i);
              return (
                <g key={`d${i}`}>
                  <circle cx={p.x} cy={p.y} r={w * 0.16} fill="rgba(210,255,220,0.28)" />
                  {i % 2 === 0 && w > 6 && (
                    <circle cx={p.x} cy={p.y} r={w * 0.26} fill="rgba(0,40,15,0.35)" />
                  )}
                </g>
              );
            })}

            {/* Head */}
            <g transform={`translate(${head.x} ${head.y}) rotate(${angle})`}>
              {USE_HEAD_IMAGE ? (
                <image
                  href={snakehead}
                  x={-HEAD_SIZE / 2}
                  y={-HEAD_SIZE / 2 - HEAD_SHIFT}
                  width={HEAD_SIZE}
                  height={HEAD_SIZE}
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : (
                <g filter="url(#glow)">
                  {/* Naakku (aadum) */}
                  <g transform="translate(0 -10.5)">
                    <g>
                      <animateTransform
                        attributeName="transform"
                        type="scale"
                        values="1 0.05;1 1;1 0.4;1 1;1 0.05;1 0.05"
                        keyTimes="0;0.12;0.22;0.34;0.46;1"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                      <path d="M 0 0 L 0 -7" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                      <path d="M 0 -7 L -3 -11 M 0 -7 L 3 -11" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                    </g>
                  </g>

                  {/* Thalai */}
                  <ellipse cx="0" cy="-1" rx="9.5" ry="10.5" fill="url(#headGrad)" />

                  {/* Rendu kann */}
                  <circle cx="-5.2" cy="-4" r="3" fill="#fde047" />
                  <circle cx="5.2" cy="-4" r="3" fill="#fde047" />
                  <ellipse cx="-5.2" cy="-4" rx="0.9" ry="2.4" fill="#111" />
                  <ellipse cx="5.2" cy="-4" rx="0.9" ry="2.4" fill="#111" />
                  <circle cx="-5.9" cy="-5" r="0.7" fill="#fff" />
                  <circle cx="4.5" cy="-5" r="0.7" fill="#fff" />

                  {/* Mookku */}
                  <circle cx="-2" cy="-9" r="0.8" fill="rgba(0,0,0,0.5)" />
                  <circle cx="2" cy="-9" r="0.8" fill="rgba(0,0,0,0.5)" />
                </g>
              )}
            </g>
          </svg>

          {/* Paused (center-la) */}
          {paused && !game.gameOver && (
            <div className="snk-over">
              <h2 className="pause">PAUSED</h2>
              <small>Resume</small>
            </div>
          )}

          {/* Game Over (center-la) */}
          {game.gameOver && (
            <div className="snk-over">
              <h2>GAME OVER</h2>
              <p>Score: {game.score}</p>
              <small>Restart</small>
            </div>
          )}
        </div>

        {/* Score | Pause-Resume | Restart */}
        <div className="snk-footer">
          <span className="snk-score">Score: {game.score}</span>

          <button
            className="snk-btn pause"
            disabled={game.gameOver}
            onClick={(e) => {
              e.currentTarget.blur();
              togglePause();
            }}
          >
            {paused ? "Resume" : "Pause"}
          </button>

          <button
            className="snk-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              restart();
            }}
          >
            Restart
          </button>
        </div>

        {/* Touch arrow buttons */}
        <div className="snk-dpad">
          <PadBtn cls="up" rot={0} onPress={() => changeDir(UP)} />
          <PadBtn cls="left" rot={-90} onPress={() => changeDir(LEFT)} />
          <PadBtn cls="down" rot={180} onPress={() => changeDir(DOWN)} />
          <PadBtn cls="right" rot={90} onPress={() => changeDir(RIGHT)} />
        </div>
      </div>
    </div>
  );
}

export default Proj;