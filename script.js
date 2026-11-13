
// =====================================
// CAT EVOLUTION 2048
// =====================================

// Game variables
console.log("page loaded");
alert("✅ JavaScript file loaded successfully! V1.2 fixed scrolling issuesand pngs");

let board = [];
let score = 0;
let best = Number(localStorage.getItem("catevol")) || 0;

let won = false;
let gameOver = false;

const SIZE = 4;
const WIN_TILE = 8192;

// Store multiple tile movements

let animationPositions = [];

// Cat evolution progression

const cats = {
    2: {
        name: "Kitten",
        image: "2.png"
    },
    4: {
        name: "House Cat",
        image: "4.png"
    },
    8: {
        name: "Happy Cat",
        image: "8.png"
    },
    16: {
        name: "Black Cat",
        image: "16.png"
    },
    32: {
        name: "Wildcat",
        image: "32.png"
    },
    64: {
        name: "Serval",
        image: "64.png"
    },
    128: {
        name: "Cheetah",
        image: "128.png"
    },
    256: {
        name: "Leopard",
        image: "256.png"
    },
    512: {
        name: "Jaguar",
        image: "512.png"
    },
    1024: {
        name: "Tiger",
        image: "1024.png"
    },
    2048: {
        name: "Lion",
        image: "2048.png"
    },
    4096: {
        name: "White Lion",
        image: "4096.png"
    },
    8192: {
        name: "Ultimate Feline",
        image: "8192.png"
    }
};
// Find game elements

const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const messageElement = document.getElementById("message");

// =====================================
// START GAME
// =====================================

function startGame() {

    board = Array(SIZE).fill().map(() =>
        Array(SIZE).fill(0)
    );

    score = 0;
    won = false;
    gameOver = false;
    animationPositions = [];

    addTile();
    addTile();

    messageElement.textContent =
        "Combine matching cats to evolve!";

    updateBoard();
}

// =====================================
// ADD RANDOM TILE
// =====================================

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

// =====================================
// DISPLAY BOARD
// =====================================

function updateBoard() {

    boardElement.innerHTML = "";

    for (let r = 0; r < SIZE; r++) {

        for (let c = 0; c < SIZE; c++) {

            let value = board[r][c];

            let tile = document.createElement("div");

            tile.className = value === 0
                ? "tile empty"
                : "tile tile-" + value;

            if (value !== 0) {

                const cat = cats[value] || {
                    name: "Mystery Cat",
                    emoji: "🐱"
                };

                // Find this tile's movement

                const movement = animationPositions.find(
                    position =>
                        position.to.r === r &&
                        position.to.c === c
                );

                if (movement) {

                    const cellSize =
                        boardElement.clientWidth / SIZE;

                    const dx =
                        (movement.from.c - movement.to.c) *
                        cellSize;

                    const dy =
                        (movement.from.r - movement.to.r) *
                        cellSize;

                    tile.style.setProperty("--dx", dx + "px");
                    tile.style.setProperty("--dy", dy + "px");

                    tile.classList.add("moving");
                }

                tile.innerHTML = `
    <img src="${cat.image}" class="cat-image">
    <small class="value">${value}</small>
`;

                tile.title = cat.name;
            }

            boardElement.appendChild(tile);
        }
    }

    scoreElement.textContent = score;
    bestElement.textContent = best;

    updateCatCollection();
}

// =====================================
// CAT COLLECTION
// =====================================

function updateCatCollection() {

    const list = document.getElementById("cat-list");

    if (!list) return;

    list.innerHTML = "";

    const highest = Math.max(2, ...board.flat());

    for (const value of Object.keys(cats)) {

        const number = Number(value);
        const cat = cats[number];

        const item = document.createElement("div");

        item.className = number > highest
            ? "cat-item locked"
            : "cat-item";

       item.innerHTML = `
    ${
        number <= highest
        ? `<img src="${cat.image}" class="cat-image">`
        : `<span class="animal">❔</span>`
    }

    <strong>${number}</strong>

    <div>
        ${number <= highest ? cat.name : "Locked"}
    </div>
`;

        list.appendChild(item);
    }
}

// =====================================
// MOVE AND MERGE
// =====================================

function move(direction) {

    if (gameOver) return;

    if (won) {
        const continuePlaying = confirm(
            "You reached 8192! Continue playing?"
        );

        if (!continuePlaying) return;

        won = false;
    }

    const oldBoard = board.map(row => [...row]);

    const newBoard = Array.from(
        { length: SIZE },
        () => Array(SIZE).fill(0)
    );

    animationPositions = [];

    // Process each row or column

    for (let line = 0; line < SIZE; line++) {

        let positions = [];

        // Read tiles in movement direction

        for (let i = 0; i < SIZE; i++) {

            let r, c;

            if (direction === "left") {
                r = line;
                c = i;
            } else if (direction === "right") {
                r = line;
                c = SIZE - 1 - i;
            } else if (direction === "up") {
                r = i;
                c = line;
            } else {
                r = SIZE - 1 - i;
                c = line;
            }

            if (oldBoard[r][c] !== 0) {

                positions.push({
                    value: oldBoard[r][c],
                    from: { r, c }
                });
            }
        }

        // Merge matching tiles

        let result = [];

        for (let i = 0; i < positions.length; i++) {

            let current = positions[i];
            let next = positions[i + 1];

            if (next && current.value === next.value) {

                let newValue = current.value * 2;

                result.push({
                    value: newValue,
                    from: current.from,
                    mergedFrom: [current.from, next.from]
                });

                score += newValue;

                i++;

            } else {

                result.push({
                    value: current.value,
                    from: current.from
                });

            }
        }

        // Place the new tiles

        for (let i = 0; i < result.length; i++) {

            let r, c;

            if (direction === "left") {
                r = line;
                c = i;
            } else if (direction === "right") {
                r = line;
                c = SIZE - 1 - i;
            } else if (direction === "up") {
                r = i;
                c = line;
            } else {
                r = SIZE - 1 - i;
                c = line;
            }

            newBoard[r][c] = result[i].value;

            // Save animation positions

            animationPositions.push({
                from: result[i].from,
                fromPositions: result[i].mergedFrom || [result[i].from],
                to: { r, c },
                value: result[i].value
            });
        }
    }

    // Check if the board changed

    const changed =
        JSON.stringify(oldBoard) !== JSON.stringify(newBoard);

    if (!changed) return;

    board = newBoard;

    // Update best score

    if (score > best) {

        best = score;

        localStorage.setItem("catevol", best);
    }

    // Add a new cat

    addTile();

    // Check game conditions

    checkWin();
    checkGameOver();

    updateBoard();
}

// =====================================
// WIN CONDITION
// =====================================

function checkWin() {

    if (!won && board.flat().includes(WIN_TILE)) {

        won = true;

        messageElement.textContent =
            "🏆 You discovered the Ultimate Feline! You win!";
    }
}

// =====================================
// GAME OVER CONDITION
// =====================================

function checkGameOver() {

    if (board.flat().includes(0)) return;

    for (let r = 0; r < SIZE; r++) {

        for (let c = 0; c < SIZE; c++) {

            if (
                c < SIZE - 1 &&
                board[r][c] === board[r][c + 1]
            ) return;

            if (
                r < SIZE - 1 &&
                board[r][c] === board[r + 1][c]
            ) return;
        }
    }

    gameOver = true;

    messageElement.textContent =
        "Game over! Start a new game to try again.";
}

// =====================================
// =====================================
// KEYBOARD CONTROLS
// =====================================

document.addEventListener("keydown", function(event) {

    const directions = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down"
    };

    // Prevent the page from scrolling
    if (directions[event.key]) {
        event.preventDefault();
        move(directions[event.key]);
    }

});


// =====================================
// NEW GAME BUTTON
// =====================================

document.getElementById("new-game")
    .addEventListener("click", function() {

        if (confirm("Start a new game?")) {
            startGame();
        }
    });

// =====================================
// INITIALIZE
// =====================================

bestElement.textContent = best;

startGame();
