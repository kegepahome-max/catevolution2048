
// CAT EVOLUTION 2048

// Game variables

let board = [];
let score = 0;
let best = 0;

const SIZE = 4;
const WIN_TILE = 8192;

// Cat evolution progression

const cats = {
    2: "🐱",
    4: "🐈",
    8: "😺",
    16: "🐈‍⬛",
    32: "🐾",
    64: "🐆",
    128: "🐈",
    256: "🐆",
    512: "🐅",
    1024: "🐯",
    2048: "🦁",
    4096: "🦁",
    8192: "👑"
};

// Find game elements

const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");

// Initialize board

function startGame() {

    board = Array(SIZE).fill().map(() =>
        Array(SIZE).fill(0)
    );

    score = 0;

    addTile();
    addTile();

    updateBoard();
}

// Add a new tile

function addTile() {

    let emptyCells = [];

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {

            if (board[r][c] === 0) {
                emptyCells.push([r, c]);
            }

        }
    }

    if (emptyCells.length === 0) return;

    let position =
        emptyCells[Math.floor(Math.random() * emptyCells.length)];

    let [r, c] = position;

    board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

// Display board

function updateBoard() {

    boardElement.innerHTML = "";

    for (let r = 0; r < SIZE; r++) {

        for (let c = 0; c < SIZE; c++) {

            let value = board[r][c];

            let tile = document.createElement("div");

            tile.className = "tile";

            if (value !== 0) {

                tile.classList.add("tile-" + value);

                tile.innerHTML = `
                    <span>${cats[value] || "🐱"}</span>
                    <small>${value}</small>
                `;

            }

            boardElement.appendChild(tile);

        }
    }

    scoreElement.textContent = score;
    bestElement.textContent = best;
}

// Start game

document.getElementById("new-game")
    .addEventListener("click", startGame);

startGame();
