"use strict";

(() => {
    const CONFIG = {
        boardSize: 4,
        spawnValues: [{ value: 2, chance: 0.9 }, { value: 4, chance: 0.1 }],
        targetValue: 8192,
        animationDuration: 180,
        mergeAnimationDuration: { min: 100, max: 1000, default: 350 },
        mergeAlpha: { min: 20, max: 100, default: 75 }
    };

    const boardElement = document.getElementById("board");
    const scoreElement = document.getElementById("score");
    const bestElement = document.getElementById("best");
    const messageElement = document.getElementById("message");
    const newGameButton = document.getElementById("new-game");
    const collectionElement = document.getElementById("new-cat-list");
    const mergeSpeedControl = document.getElementById("merge-speed");
    const mergeSpeedValue = document.getElementById("merge-speed-value");
    const mergeAlphaControl = document.getElementById("merge-alpha");
    const mergeAlphaValue = document.getElementById("merge-alpha-value");

    if (!boardElement || !scoreElement || !bestElement || !messageElement || !newGameButton
        || !mergeSpeedControl || !mergeSpeedValue || !mergeAlphaControl || !mergeAlphaValue) {
        throw new Error("The game requires its board, score, message, restart, and animation control elements.");
    }

    boardElement.style.gridTemplateColumns = `repeat(${CONFIG.boardSize}, minmax(0, 1fr))`;

    const STORAGE_KEYS = {
        best: "cat-evolution-2048-best",
        discovered: "cat-evolution-2048-discovered",
        mergeSpeed: "cat-evolution-2048-merge-speed",
        mergeAlpha: "cat-evolution-2048-merge-alpha"
    };

    let nextTileId = 0;
    let score = 0;
    let best = readBestScore();
    let mergeAnimationDuration = readSetting(
        STORAGE_KEYS.mergeSpeed,
        CONFIG.mergeAnimationDuration
    );
    let mergeAlpha = readSetting(STORAGE_KEYS.mergeAlpha, CONFIG.mergeAlpha);
    let hasWon = false;
    let discovered = readDiscoveredValues();
    let grid = createEmptyGrid();
    let touchStart = null;

    bestElement.textContent = String(best);
    mergeSpeedControl.value = String(mergeAnimationDuration);
    mergeAlphaControl.value = String(mergeAlpha);
    updateAnimationSettings();
    newGameButton.addEventListener("click", startNewGame);
    mergeSpeedControl.addEventListener("input", () => {
        mergeAnimationDuration = Number(mergeSpeedControl.value);
        localStorage.setItem(STORAGE_KEYS.mergeSpeed, String(mergeAnimationDuration));
        updateAnimationSettings();
    });
    mergeAlphaControl.addEventListener("input", () => {
        mergeAlpha = Number(mergeAlphaControl.value);
        localStorage.setItem(STORAGE_KEYS.mergeAlpha, String(mergeAlpha));
        updateAnimationSettings();
    });
    document.addEventListener("keydown", handleKeydown);

    boardElement.addEventListener("pointerdown", (event) => {
        touchStart = { x: event.clientX, y: event.clientY };
    });

    boardElement.addEventListener("pointerup", (event) => {
        if (!touchStart) return;

        const dx = event.clientX - touchStart.x;
        const dy = event.clientY - touchStart.y;
        touchStart = null;

        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        move(Math.abs(dx) > Math.abs(dy)
            ? (dx < 0 ? "left" : "right")
            : (dy < 0 ? "up" : "down"));
    });

    boardElement.addEventListener("pointercancel", () => {
        touchStart = null;
    });

    startNewGame();

    function createEmptyGrid() {
        return Array.from({ length: CONFIG.boardSize }, () =>
            Array(CONFIG.boardSize).fill(null)
        );
    }

    function readBestScore() {
        const saved = Number(localStorage.getItem(STORAGE_KEYS.best));
        return Number.isFinite(saved) && saved > 0 ? saved : 0;
    }

    function readSetting(key, setting) {
        const saved = Number(localStorage.getItem(key));
        if (!Number.isFinite(saved) || saved < setting.min || saved > setting.max) {
            return setting.default;
        }
        return saved;
    }

    function updateAnimationSettings() {
        mergeSpeedValue.value = `${mergeAnimationDuration} ms`;
        mergeAlphaValue.value = `${mergeAlpha}%`;
        boardElement.style.setProperty("--merge-animation-duration", `${mergeAnimationDuration}ms`);
        boardElement.style.setProperty("--merge-alpha", String(mergeAlpha / 100));
    }

    function readDiscoveredValues() {
        const saved = localStorage.getItem(STORAGE_KEYS.discovered);
        if (!saved) return new Set();

        try {
            const values = JSON.parse(saved);
            return new Set(Array.isArray(values)
                ? values.filter((value) => Number.isInteger(value) && value >= 2)
                : []);
        } catch (error) {
            console.warn("Could not read the saved cat collection.", error);
            return new Set();
        }
    }

    function startNewGame() {
        grid = createEmptyGrid();
        score = 0;
        hasWon = false;
        messageElement.textContent = "Combine matching cats to evolve!";
        spawnTile();
        spawnTile();
        recordDiscoveredValues();
        updateScore();
        render();
    }

    function handleKeydown(event) {
        const directions = {
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowUp: "up",
            ArrowDown: "down"
        };
        const direction = directions[event.key];

        if (!direction) return;
        event.preventDefault();
        move(direction);
    }

    function move(direction) {
        const previousGrid = grid.map((row) => row.slice());
        const mergedIds = new Set();
        let changed = false;

        for (const coordinates of getLines(direction)) {
            const tiles = coordinates
                .map(({ row, col }) => grid[row][col])
                .filter(Boolean);
            const result = [];

            for (let index = 0; index < tiles.length; index += 1) {
                const current = tiles[index];
                const next = tiles[index + 1];

                if (next && current.value === next.value) {
                    const merged = { id: createTileId(), value: current.value * 2 };
                    result.push(merged);
                    mergedIds.add(merged.id);
                    score += merged.value;
                    index += 1;
                } else {
                    result.push(current);
                }
            }

            coordinates.forEach(({ row, col }, index) => {
                grid[row][col] = result[index] || null;
            });
        }

        changed = grid.some((row, rowIndex) =>
            row.some((tile, colIndex) => tile !== previousGrid[rowIndex][colIndex])
        );

        if (!changed) return;

        updateScore();
        spawnTile();
        recordDiscoveredValues();
        render(mergedIds);

        if (!hasWon && grid.some((row) => row.some((tile) => tile && tile.value >= CONFIG.targetValue))) {
            hasWon = true;
            messageElement.textContent = `Amazing! You discovered ${CONFIG.targetValue}! Keep playing or start a new game.`;
        } else if (!hasMoves()) {
            messageElement.textContent = "No more moves. Start a new game to play again!";
        }
    }

    function getLines(direction) {
        const lines = [];
        for (let index = 0; index < CONFIG.boardSize; index += 1) {
            const line = [];
            for (let offset = 0; offset < CONFIG.boardSize; offset += 1) {
                const forward = direction === "left" || direction === "up";
                const position = forward ? offset : CONFIG.boardSize - 1 - offset;
                line.push(direction === "left" || direction === "right"
                    ? { row: index, col: position }
                    : { row: position, col: index });
            }
            lines.push(line);
        }
        return lines;
    }

    function spawnTile() {
        const emptyCells = [];
        grid.forEach((row, rowIndex) => {
            row.forEach((tile, colIndex) => {
                if (!tile) emptyCells.push({ row: rowIndex, col: colIndex });
            });
        });

        if (!emptyCells.length) return null;

        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const roll = Math.random();
        let chance = 0;
        const choice = CONFIG.spawnValues.find((spawn) => {
            chance += spawn.chance;
            return roll < chance;
        }) || CONFIG.spawnValues[CONFIG.spawnValues.length - 1];

        grid[row][col] = { id: createTileId(), value: choice.value };
        return grid[row][col];
    }

    function createTileId() {
        nextTileId += 1;
        return `tile-${nextTileId}`;
    }

    function hasMoves() {
        for (let row = 0; row < CONFIG.boardSize; row += 1) {
            for (let col = 0; col < CONFIG.boardSize; col += 1) {
                const tile = grid[row][col];
                if (!tile) return true;
                const right = col + 1 < CONFIG.boardSize ? grid[row][col + 1] : null;
                const below = row + 1 < CONFIG.boardSize ? grid[row + 1][col] : null;
                if (right && right.value === tile.value) return true;
                if (below && below.value === tile.value) return true;
            }
        }
        return false;
    }

    function updateScore() {
        scoreElement.textContent = String(score);
        if (score > best) {
            best = score;
            bestElement.textContent = String(best);
            localStorage.setItem(STORAGE_KEYS.best, String(best));
        }
    }

    function render(mergedIds = new Set()) {
        const previousPositions = new Map();
        boardElement.querySelectorAll(".tile[data-tile-id]").forEach((element) => {
            previousPositions.set(element.dataset.tileId, element.getBoundingClientRect());
        });

        const fragment = document.createDocumentFragment();
        grid.forEach((row) => {
            row.forEach((tile) => {
                const element = document.createElement("div");
                element.className = "tile empty";
                element.style.aspectRatio = "1";
                if (tile) {
                    element.className = `tile tile-${tile.value}`;
                    element.dataset.tileId = tile.id;

                    const image = document.createElement("img");
                    image.className = "cat-image";
                    image.src = `Assets/${tile.value}.png`;
                    image.alt = `Cat tile ${tile.value}`;
                    image.addEventListener("error", () => image.remove(), { once: true });

                    const value = document.createElement("span");
                    value.className = "value";
                    value.textContent = String(tile.value);
                    element.append(image, value);
                }
                fragment.appendChild(element);
            });
        });

        boardElement.replaceChildren(fragment);

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) return;

        boardElement.querySelectorAll(".tile[data-tile-id]").forEach((element) => {
            if (mergedIds.has(element.dataset.tileId)) {
                element.classList.add("merging");
                return;
            }

            const previous = previousPositions.get(element.dataset.tileId);
            if (!previous) return;

            const current = element.getBoundingClientRect();
            const dx = previous.left - current.left;
            const dy = previous.top - current.top;
            if (!dx && !dy) return;

            element.animate(
                [
                    { transform: `translate(${dx}px, ${dy}px)` },
                    { transform: "translate(0, 0)" }
                ],
                { duration: CONFIG.animationDuration, easing: "ease-out" }
            );
        });
    }

    function saveDiscoveredValues() {
        localStorage.setItem(STORAGE_KEYS.discovered, JSON.stringify([...discovered]));
    }

    function recordDiscoveredValues() {
        let changed = false;
        for (const row of grid) {
            for (const tile of row) {
                if (tile && !discovered.has(tile.value)) {
                    discovered.add(tile.value);
                    changed = true;
                }
            }
        }

        if (changed) {
            saveDiscoveredValues();
            renderCollection();
        }
    }

    function renderCollection() {
        if (!collectionElement) return;

        const fragment = document.createDocumentFragment();
        for (let value = 2; value <= CONFIG.targetValue; value *= 2) {
            const card = document.createElement("div");
            card.className = "new-cat-card";

            if (discovered.has(value)) {
                const image = document.createElement("img");
                image.src = `Assets/${value}.png`;
                image.alt = `Cat tile ${value}`;
                image.addEventListener("error", () => image.remove(), { once: true });
                card.appendChild(image);
            } else {
                const mystery = document.createElement("div");
                mystery.className = "mystery-cat";
                mystery.textContent = "?";
                card.appendChild(mystery);
            }

            const name = document.createElement("p");
            name.textContent = discovered.has(value) ? `Cat ${value}` : "Undiscovered";
            const number = document.createElement("small");
            number.textContent = discovered.has(value) ? `Tile ${value}` : "???";
            card.append(name, number);
            fragment.appendChild(card);
        }
        collectionElement.replaceChildren(fragment);
    }

    renderCollection();
})();
