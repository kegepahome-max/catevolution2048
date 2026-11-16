
// =====================================
// CAT EVOLUTION 2048
// =====================================

// Game variables
console.log("page loaded");
alert("Welcome to Cat Evolution 2048! Enjoy!");

let board = [];
let score = 0;
let best = Number(localStorage.getItem("catevol")) || 0;

let won = false;
let gameOver = false;

const SIZE = 4;
const WIN_TILE = 8192;

// Store multiple tile movements

let animationPositions = [];

let isAnimating = false;
let animationId = 0;

// Cat evolution progression

const cats = {
    2: {
        name: "Kitten",
        image: "Assets/2.png"
    },
    4: {
        name: "House Cat",
        image: "Assets/4.png"
    },
    8: {
        name: "Happy Cat",
        image: "Assets/8.png"
    },
    16: {
        name: "Black Cat",
        image: "Assets/16.png"
    },
    32: {
        name: "Wildcat",
        image: "Assets/32.png"
    },
    64: {
        name: "Serval",
        image: "Assets/64.png"
    },
    128: {
        name: "Cheetah",
        image: "Assets/128.png"
    },
    256: {
        name: "Leopard",
        image: "Assets/256.png"
    },
    512: {
        name: "Jaguar",
        image: "Assets/512.png"
    },
    1024: {
        name: "Tiger",
        image: "Assets/1024.png"
    },
    2048: {
        name: "Lion",
        image: "Assets/2048.png"
    },
    4096: {
        name: "White Lion",
        image: "Assets/4096.png"
    },
    8192: {
        name: "Ultimate Feline",
        image: "Assets/8192.png"
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

        // Cancel any previous animations
    animationId++;
    isAnimating = false;

    document.querySelectorAll(".merge-ghost").forEach(ghost => {
        ghost.remove();
    });

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
    // Remove any leftover merge ghosts from a previous (possibly interrupted)
    // animation so stale clones can never pile up on the page.
    document.querySelectorAll(".merge-ghost").forEach(ghost => ghost.remove());

    const oldTiles = Array.from(boardElement.children);
    const fragment = document.createDocumentFragment();
    const newTiles = [];

    // Build the new board
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const value = board[r][c];
            const tile = document.createElement("div");

            tile.className = value === 0
                ? "tile empty"
                : "tile tile-" + value;

            if (value !== 0) {
                const cat = cats[value] || {
                    name: "Mystery Cat",
                    image: ""
                };

                const movement = animationPositions.find(
                    position =>
                        position.to.r === r &&
                        position.to.c === c
                );

if (movement) {
    if (movement.fromPositions.length > 1) {
        tile.classList.add("merge-result");
    } else if (
        oldTiles[0] &&
        (movement.from.r !== r ||
        movement.from.c !== c)
    ) {


const cellRect = oldTiles[0].getBoundingClientRect();
const boardStyle = getComputedStyle(boardElement);

const stepX =
    cellRect.width + parseFloat(boardStyle.columnGap);

const stepY =
    cellRect.height + parseFloat(boardStyle.rowGap);

const dx =
    (movement.from.c - movement.to.c) * stepX;

const dy =
    (movement.from.r - movement.to.r) * stepY;

                        tile.style.setProperty("--dx", dx + "px");
                        tile.style.setProperty("--dy", dy + "px");
                        tile.classList.add("moving");
                    }
                }

                tile.innerHTML = `
                    <img src="${cat.image}" class="cat-image">
                    <small class="value">${value}</small>
                `;

                tile.title = cat.name;
            }

            newTiles.push(tile);
            fragment.appendChild(tile);
        }
    }

    // Create copies of cats that will merge
    const mergeGhosts = [];

    animationPositions.forEach(movement => {
        if (movement.fromPositions.length < 2) return;

        const targetIndex = movement.to.r * SIZE + movement.to.c;
        const targetTile = newTiles[targetIndex];

        movement.fromPositions.forEach(position => {
            const sourceIndex = position.r * SIZE + position.c;
            const originalTile = oldTiles[sourceIndex];

            if (!originalTile || !targetTile) return;

            const ghost = originalTile.cloneNode(true);
            const rect = originalTile.getBoundingClientRect();

            ghost.classList.remove("moving", "merging", "merge-result");
            ghost.classList.add("merge-ghost");

            ghost.style.left = rect.left + "px";
            ghost.style.top = rect.top + "px";
            ghost.style.width = rect.width + "px";
            ghost.style.height = rect.height + "px";
            ghost.style.transform = "translate(0, 0)";

            document.body.appendChild(ghost);

            mergeGhosts.push({
                ghost: ghost,
                target: targetTile
            });
        });
    });

    // Display the new board
    boardElement.replaceChildren(fragment);

    const token = ++animationId;
    isAnimating = animationPositions.length > 0;

    // Animate cats sliding together
    if (mergeGhosts.length > 0) {
        requestAnimationFrame(() => {
            mergeGhosts.forEach(item => {
                const targetRect = item.target.getBoundingClientRect();
                const ghostRect = item.ghost.getBoundingClientRect();

                const dx = targetRect.left - ghostRect.left;
                const dy = targetRect.top - ghostRect.top;

                item.ghost.style.transform =
                    `translate(${dx}px, ${dy}px)`;
            });
        });

       // The evolved cat reveals itself through the CSS `.merge-result`
       // animation, so it is always visible once rendered — its visibility
       // never depends on this timer firing. Here we only clean up the
       // sliding ghosts and release the movement lock.
setTimeout(() => {
    if (token !== animationId) return;

    mergeGhosts.forEach(item => item.ghost.remove());

    isAnimating = false;
}, 350);

    } else {
        // Release movement lock after normal sliding
        setTimeout(() => {
            if (token !== animationId) return;

            isAnimating = false;
        }, 350);
    }

    // Update scores
    scoreElement.textContent = score;
    bestElement.textContent = best;

    // Update collections
    updateCatCollection();
    updateNewCatCollection();
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
    console.log("After updateBoard:", window.scrollY);
}

// =================================
// NEW SIDE CAT COLLECTION
// =================================

function updateNewCatCollection() {

    const container = document.getElementById("new-cat-list");

    if (!container) return;

    const highestCat = Math.max(...board.flat());

    container.innerHTML = "";

    Object.entries(cats).forEach(([value, cat]) => {

        const catValue = Number(value);

        const card = document.createElement("div");

        card.className = "new-cat-card";

        // Ultimate Feline mystery
        if (catValue === 8192) {

            card.innerHTML = `
                <div class="mystery-cat">❓</div>
                <p>Ultimate Feline</p>
                <small>8192</small>
            `;

        } else {

            // Only show unlocked cats
            if (catValue > highestCat) return;

            card.innerHTML = `
                <img src="${cat.image}" alt="${cat.name}">
                <p>${cat.name}</p>
                <small>${catValue}</small>
            `;

        }

        container.appendChild(card);

    });
}

// =====================================
// MOVE AND MERGE
// =====================================

function move(direction) {

if (gameOver || isAnimating) return;
    
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
    alert("Game over!");
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

    if (event.key in directions) {

        event.preventDefault();

        move(directions[event.key]);
    }

}, { passive: false });


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

window.addEventListener("scroll", () => {
    console.log("SCROLL EVENT:", window.scrollY);
});

window.addEventListener("focus", () => {
    console.log("WINDOW FOCUSED");
});
