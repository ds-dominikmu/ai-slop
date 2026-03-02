const CELL_SIZE = 12;
const COLS = 80;
const ROWS = 60;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = COLS * CELL_SIZE;
canvas.height = ROWS * CELL_SIZE;

let grid = createEmptyGrid();
let running = false;
let animationId = null;
let generation = 0;
let lastTime = 0;

const startBtn = document.getElementById("startBtn");
const stepBtn = document.getElementById("stepBtn");
const clearBtn = document.getElementById("clearBtn");
const randomBtn = document.getElementById("randomBtn");
const speedSlider = document.getElementById("speedSlider");
const genDisplay = document.getElementById("generation");
const popDisplay = document.getElementById("population");

// ── Grid helpers ──────────────────────────────────────────────────────────────

function createEmptyGrid() {
  return Array.from({ length: ROWS }, () => new Uint8Array(COLS));
}

function countNeighbours(g, row, col) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = (row + dr + ROWS) % ROWS;
      const c = (col + dc + COLS) % COLS;
      count += g[r][c];
    }
  }
  return count;
}

function nextGeneration(g) {
  const next = createEmptyGrid();
  let pop = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const neighbours = countNeighbours(g, r, c);
      const alive = g[r][c] === 1;
      if (alive && (neighbours === 2 || neighbours === 3)) {
        next[r][c] = 1;
        pop++;
      } else if (!alive && neighbours === 3) {
        next[r][c] = 1;
        pop++;
      }
    }
  }
  return { next, pop };
}

function countPopulation(g) {
  let pop = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      pop += g[r][c];
    }
  }
  return pop;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function draw(g) {
  ctx.fillStyle = "#0d0d1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid lines
  ctx.strokeStyle = "#1c1c2e";
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL_SIZE, 0);
    ctx.lineTo(c * CELL_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL_SIZE);
    ctx.lineTo(canvas.width, r * CELL_SIZE);
    ctx.stroke();
  }

  // Draw live cells
  ctx.fillStyle = "#a8dadc";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c]) {
        ctx.fillRect(
          c * CELL_SIZE + 1,
          r * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2
        );
      }
    }
  }
}

// ── Simulation loop ───────────────────────────────────────────────────────────

function getInterval() {
  // Slider 1–10 → interval 1000ms–50ms (logarithmic feel)
  const val = parseInt(speedSlider.value, 10);
  return Math.round(1000 / (val * val * 0.1 + 0.9));
}

function step() {
  const { next, pop } = nextGeneration(grid);
  grid = next;
  generation++;
  genDisplay.textContent = generation;
  popDisplay.textContent = pop;
  draw(grid);
}

function loop(timestamp) {
  if (!running) return;
  if (timestamp - lastTime >= getInterval()) {
    step();
    lastTime = timestamp;
  }
  animationId = requestAnimationFrame(loop);
}

function startStop() {
  running = !running;
  if (running) {
    startBtn.textContent = "⏹ Stop";
    startBtn.classList.add("running");
    stepBtn.disabled = true;
    lastTime = performance.now();
    animationId = requestAnimationFrame(loop);
  } else {
    startBtn.textContent = "▶ Start";
    startBtn.classList.remove("running");
    stepBtn.disabled = false;
    if (animationId) cancelAnimationFrame(animationId);
  }
}

// ── Drawing on canvas ─────────────────────────────────────────────────────────

let isMouseDown = false;
let isPlacingCells = null; // true = placing cells, false = erasing

canvas.addEventListener("mousedown", (e) => {
  isMouseDown = true;
  const { r, c } = eventToCell(e);
  isPlacingCells = grid[r][c] === 0; // if cell is dead, we're placing; else erasing
  grid[r][c] = isPlacingCells ? 1 : 0;
  popDisplay.textContent = countPopulation(grid);
  draw(grid);
});

canvas.addEventListener("mousemove", (e) => {
  if (!isMouseDown) return;
  const { r, c } = eventToCell(e);
  grid[r][c] = isPlacingCells ? 1 : 0;
  popDisplay.textContent = countPopulation(grid);
  draw(grid);
});

canvas.addEventListener("mouseup", () => { isMouseDown = false; });
canvas.addEventListener("mouseleave", () => { isMouseDown = false; });

function eventToCell(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return {
    r: Math.floor(y / CELL_SIZE),
    c: Math.floor(x / CELL_SIZE),
  };
}

// ── Button handlers ───────────────────────────────────────────────────────────

startBtn.addEventListener("click", startStop);

stepBtn.addEventListener("click", () => {
  if (!running) step();
});

clearBtn.addEventListener("click", () => {
  if (running) startStop();
  grid = createEmptyGrid();
  generation = 0;
  genDisplay.textContent = 0;
  popDisplay.textContent = 0;
  draw(grid);
});

randomBtn.addEventListener("click", () => {
  grid = createEmptyGrid();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = Math.random() < 0.3 ? 1 : 0;
    }
  }
  generation = 0;
  genDisplay.textContent = 0;
  popDisplay.textContent = countPopulation(grid);
  draw(grid);
});

// ── Preset patterns ───────────────────────────────────────────────────────────

const PATTERNS = {
  Glider: [
    [0, 1], [1, 2], [2, 0], [2, 1], [2, 2]
  ],
  "Blinker": [
    [0, 0], [0, 1], [0, 2]
  ],
  "Toad": [
    [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2]
  ],
  "Beacon": [
    [0, 0], [0, 1], [1, 0],
    [2, 3], [3, 2], [3, 3]
  ],
  "Pulsar": [
    [0,2],[0,3],[0,4],[0,8],[0,9],[0,10],
    [2,0],[2,5],[2,7],[2,12],
    [3,0],[3,5],[3,7],[3,12],
    [4,0],[4,5],[4,7],[4,12],
    [5,2],[5,3],[5,4],[5,8],[5,9],[5,10],
    [7,2],[7,3],[7,4],[7,8],[7,9],[7,10],
    [8,0],[8,5],[8,7],[8,12],
    [9,0],[9,5],[9,7],[9,12],
    [10,0],[10,5],[10,7],[10,12],
    [12,2],[12,3],[12,4],[12,8],[12,9],[12,10]
  ],
  "Glider Gun": [
    [0,24],
    [1,22],[1,24],
    [2,12],[2,13],[2,20],[2,21],[2,34],[2,35],
    [3,11],[3,15],[3,20],[3,21],[3,34],[3,35],
    [4,0],[4,1],[4,10],[4,16],[4,20],[4,21],
    [5,0],[5,1],[5,10],[5,14],[5,16],[5,17],[5,22],[5,24],
    [6,10],[6,16],[6,24],
    [7,11],[7,15],
    [8,12],[8,13]
  ],
};

document.querySelectorAll(".pattern-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.pattern;
    const cells = PATTERNS[name];
    if (!cells) return;
    if (running) startStop();
    grid = createEmptyGrid();
    generation = 0;
    // Center the pattern
    const minR = Math.min(...cells.map(([r]) => r));
    const maxR = Math.max(...cells.map(([r]) => r));
    const minC = Math.min(...cells.map(([, c]) => c));
    const maxC = Math.max(...cells.map(([, c]) => c));
    const offR = Math.floor((ROWS - (maxR - minR + 1)) / 2) - minR;
    const offC = Math.floor((COLS - (maxC - minC + 1)) / 2) - minC;
    cells.forEach(([r, c]) => {
      grid[r + offR][c + offC] = 1;
    });
    genDisplay.textContent = 0;
    popDisplay.textContent = countPopulation(grid);
    draw(grid);
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────

draw(grid);
