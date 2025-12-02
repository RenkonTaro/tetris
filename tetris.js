// --- 定数とグローバル変数の設定 ---

// キャンバス要素の取得
const canvas = document.getElementById('tetris-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');

// --- スコア関連 ---
const scoreDisplay = document.getElementById('score-display');
let score = 0;
const SCORE_TABLE = [0, 100, 300, 500, 800];

// --- レベル関連 ---
const levelDisplay = document.getElementById('level-display');
let level = 1;
let linesClearedTotal = 0;
const LEVEL_UP_LINES = 10;
const GAME_SPEEDS = [800, 720, 640, 560, 480, 400, 320, 240, 160, 100];
let gameSpeed;

// --- フィールドとブロック関連 ---
const FIELD_WIDTH = 10;
const FIELD_HEIGHT = 20;
const BLOCK_SIZE = 30;
let field = Array.from({ length: FIELD_HEIGHT }, () => Array(FIELD_WIDTH).fill(0));

// テトリミノの定義
const TETROMINOS = {
  'I': { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: 'cyan' },
  'O': { shape: [[1,1],[1,1]], color: 'yellow' },
  'T': { shape: [[0,1,0],[1,1,1],[0,0,0]], color: 'purple' },
  'S': { shape: [[0,1,1],[1,1,0],[0,0,0]], color: 'green' },
  'Z': { shape: [[1,1,0],[0,1,1],[0,0,0]], color: 'red' },
  'J': { shape: [[1,0,0],[1,1,1],[0,0,0]], color: 'blue' },
  'L': { shape: [[0,0,1],[1,1,1],[0,0,0]], color: 'orange' }
};
const MINO_TYPES = Object.keys(TETROMINOS); 

// --- 現在と次のミノの状態 ---
let currentMino;
let currentX;
let currentY;
let currentColor;
let nextMinoType;
let nextMino;
let nextColor;

// --- ゲーム状態 ---
let gameInterval;
// ▼▼▼ 追加 ▼▼▼
let isPaused = false; // ポーズ状態フラグ
// ▲▲▲ 追加 ▲▲▲


// --- 描画関数 ---

/**
 * 1マスを描画する補助関数
 */
function drawBlock(context, x, y, color) {
  context.fillStyle = color;
  context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  context.strokeStyle = '#222';
  context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

/**
 * メインのゲーム画面全体を描画する
 */
function drawGame() {
  // 1. キャンバス全体をクリア
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. 固定されたブロックを描画
  for (let y = 0; y < FIELD_HEIGHT; y++) {
    for (let x = 0; x < FIELD_WIDTH; x++) {
      if (field[y][x] !== 0) {
        const type = MINO_TYPES[field[y][x] - 1]; 
        drawBlock(ctx, x, y, TETROMINOS[type].color); 
      }
    }
  }

  // 3. 操作中のミノを描画
  if (currentMino) {
    for (let y = 0; y < currentMino.length; y++) {
      for (let x = 0; x < currentMino[y].length; x++) {
        if (currentMino[y][x] === 1) {
          drawBlock(ctx, currentX + x, currentY + y, currentColor);
        }
      }
    }
  }

  // ▼▼▼ 追加 ▼▼▼
  // 4. ポーズ画面の表示
  if (isPaused) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // 半透明の白
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
  }
  // ▲▲▲ 追加 ▲▲▲
}

/**
 * NEXTキャンバスに次のミノを描画する
 */
function drawNextMino() {
    nextCtx.fillStyle = '#111'; 
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextMino) return;
    const mino = nextMino;
    const size = mino.length; 
    const offsetX = (nextCanvas.width / BLOCK_SIZE - size) / 2; 
    const offsetY = (nextCanvas.height / BLOCK_SIZE - size) / 2;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (mino[y][x] === 1) {
                drawBlock(nextCtx, offsetX + x, offsetY + y, nextColor);
            }
        }
    }
}

// --- UI更新関数 ---
function updateScoreDisplay() {
  scoreDisplay.textContent = score;
}
function updateLevelDisplay() {
  levelDisplay.textContent = level;
}

// --- ゲームロジック関数 ---

/**
 * ゲームの速度を更新（レベルに応じてインターバルを再設定）
 */
function updateGameSpeed() {
    clearInterval(gameInterval); 
    let speedIndex = Math.min(level - 1, GAME_SPEEDS.length - 1);
    gameSpeed = GAME_SPEEDS[speedIndex];
    gameInterval = setInterval(gameLoop, gameSpeed);
}

/**
 * ランダムなミノの情報を生成
 */
function generateNewMino() {
    const type = MINO_TYPES[Math.floor(Math.random() * MINO_TYPES.length)];
    const minoData = TETROMINOS[type];
    return {
        type: type,
        shape: minoData.shape,
        color: minoData.color
    };
}

/**
 * ミノが (x, y) の位置に移動可能かチェック
 */
function canMove(mino, x, y) {
  for (let dy = 0; dy < mino.length; dy++) {
    for (let dx = 0; dx < mino[dy].length; dx++) {
      if (mino[dy][dx] === 1) {
        let newX = x + dx;
        let newY = y + dy;
        if (newX < 0 || newX >= FIELD_WIDTH || newY >= FIELD_HEIGHT) {
          return false;
        }
        if (newY >= 0 && field[newY][newX] !== 0) {
          return false; 
        }
      }
    }
  }
  return true;
}

/**
 * ミノを時計回りに回転
 */
function rotate(mino) {
  const N = mino.length;
  let newMino = Array.from({ length: N }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      newMino[x][y] = mino[y][x];
    }
  }
  newMino.forEach(row => row.reverse());
  return newMino;
}

/**
 * 着地したブロックをフィールドに固定
 */
function fixMino() {
  for (let y = 0; y < currentMino.length; y++) {
    for (let x = 0; x < currentMino[y].length; x++) {
      if (currentMino[y][x] === 1) {
        if (currentY + y >= 0) {
            const typeKey = Object.keys(TETROMINOS).find(key => TETROMINOS[key].color === currentColor);
            const typeIndex = MINO_TYPES.indexOf(typeKey);
            field[currentY + y][currentX + x] = typeIndex + 1;
        }
      }
    }
  }
}

/**
 * 揃ったラインを消去し、スコアとレベルを更新
 */
function clearLines() {
  let linesCleared = 0;
  for (let y = FIELD_HEIGHT - 1; y >= 0; y--) {
    if (field[y].every(cell => cell !== 0)) {
      linesCleared++;
      field.splice(y, 1); 
      field.unshift(Array(FIELD_WIDTH).fill(0)); 
      y++; 
    }
  }

  // スコア・レベル更新
  if (linesCleared > 0) {
    score += SCORE_TABLE[linesCleared];
    updateScoreDisplay();

    linesClearedTotal += linesCleared;
    let nextLevel = Math.floor(linesClearedTotal / LEVEL_UP_LINES) + 1;
    
    if (nextLevel > level) {
        level = nextLevel; 
        updateLevelDisplay(); 
        updateGameSpeed(); // 速度を更新
    }
  }
}

/**
 * 新しいミノをフィールドに出現させる
 * @returns {boolean} ゲームオーバーなら false
 */
function spawnMino() {
  currentMino = nextMino;
  currentColor = nextColor;
  currentX = Math.floor((FIELD_WIDTH - currentMino.length) / 2);
  currentY = 0; 

  // ゲームオーバー判定
  if (!canMove(currentMino, currentX, currentY)) {
    return false; // ゲームオーバー
  }

  // 新しいNEXTミノを生成
  const newNext = generateNewMino();
  nextMinoType = newNext.type;
  nextMino = newNext.shape;
  nextColor = newNext.color;

  drawNextMino(); // NEXTキャンバスを更新
  
  return true; // 続行可能
}

// ▼▼▼ 新しい関数を追加 ▼▼▼
/**
 * ポーズ状態を切り替える
 */
function togglePause() {
    if (!gameInterval) return; // ゲームオーバー中はポーズ不可
    
    isPaused = !isPaused; // 状態を反転
    
    if (isPaused) {
        // ポーズ画面を描画
        drawGame();
    } else {
        // 再開（再描画は次のgameLoopで行われる）
        drawGame(); // ポーズ画面を消すために即時再描画
    }
}
// ▲▲▲ 新しい関数を追加 ▲▲▲

// ▼▼▼ 新しい関数を追加 ▼▼▼
/**
 * ミノが着地した時の処理 (ハードドロップと自然落下で共通化)
 */
function handleLanding() {
    fixMino();
    clearLines();
    
    if (!spawnMino()) {
        // ゲームオーバー処理
        clearInterval(gameInterval); 
        gameInterval = null;
        alert(`GAME OVER\nScore: ${score}\nLevel: ${level}\n\nページをリロードして再挑戦してください。`);
    }
}
// ▲▲▲ 新しい関数を追加 ▲▲▲


// --- イベントリスナーとゲームループ ---

// キー入力の処理
document.addEventListener('keydown', (e) => {
  // ▼▼▼ 変更 ▼▼▼
  // Pキー (ポーズ) は、ゲーム状態に関わらず常に受け付ける
  if (e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
  }

  // ポーズ中、またはゲームオーバー後は操作不可
  if (isPaused || !gameInterval) return;

  switch (e.key) {
    case 'ArrowLeft': 
      if (canMove(currentMino, currentX - 1, currentY)) {
        currentX--;
      }
      break;
    case 'ArrowRight': 
      if (canMove(currentMino, currentX + 1, currentY)) {
        currentX++;
      }
      break;
    case 'ArrowDown': // ソフトドロップ
      if (canMove(currentMino, currentX, currentY + 1)) {
        currentY++;
      }
      break;
    case 'ArrowUp': // 回転
      const rotatedMino = rotate(currentMino);
      if (canMove(rotatedMino, currentX, currentY)) {
        currentMino = rotatedMino;
      }
      break;
    case ' ': // スペースキー (ハードドロップ)
      e.preventDefault(); // ページのスクロールを防ぐ
      // 1. 衝突するまでY座標を増やす
      while (canMove(currentMino, currentX, currentY + 1)) {
          currentY++;
      }
      // 2. 即座に着地処理を実行
      handleLanding();
      break;
  }
  // ▲▲▲ 変更 ▲▲▲

  drawGame(); // 操作のたびに再描画
});

/**
 * メインのゲームループ
 */
function gameLoop() {
  // ▼▼▼ 変更 ▼▼▼
  if (isPaused) return; // ポーズ中は処理をスキップ
  // ▲▲▲ 変更 ▲▲▲

  // 1. 落下
  if (canMove(currentMino, currentX, currentY + 1)) {
    currentY++;
  } else {
    // 2. 着地処理
    handleLanding();
  }
  
  // 3. 描画
  drawGame();
}

/**
 * ゲームを開始（またはリセット）する
 */
function startGame() {
    // リセット処理
    field = Array.from({ length: FIELD_HEIGHT }, () => Array(FIELD_WIDTH).fill(0));
    score = 0;
    updateScoreDisplay();
    level = 1;
    linesClearedTotal = 0;
    updateLevelDisplay();
    // ▼▼▼ 追加 ▼▼▼
    isPaused = false; // ポーズ状態をリセット
    // ▲▲▲ 追加 ▲▲▲

    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    // 最初のミノとNEXTミノを準備
    const firstNext = generateNewMino();
    nextMinoType = firstNext.type;
    nextMino = firstNext.shape;
    nextColor = firstNext.color;
    
    spawnMino(); 
    drawGame(); 

    // 最初の速度でゲームループ開始
    gameSpeed = GAME_SPEEDS[0]; 
    gameInterval = setInterval(gameLoop, gameSpeed); 
}

// --- ゲーム実行 ---
startGame();