"use strict";

// Static configuration: bounds/defaults for settings and fixed game values.
const CONFIG = {
    targetValue: 8192,
    slideDuration: 180,
    defaultBoardColor: "#e8cbd3",
    mergeSpeed: { min: 100, max: 1000, default: 350 },
    mergeAlpha: { min: 20, max: 100, default: 75 },
    boardSize: { min: 3, max: 8, default: 4 },
    fourChance: { min: 0, max: 100, default: 10 }
};

// localStorage keys, named to match the setting keys used throughout.
const STORAGE_KEYS = {
    best: "cat-evolution-2048-best",
    discovered: "cat-evolution-2048-discovered",
    mergeSpeed: "cat-evolution-2048-merge-speed",
    mergeAlpha: "cat-evolution-2048-merge-alpha",
    boardColor: "cat-evolution-2048-board-color",
    showNumbers: "cat-evolution-2048-show-numbers",
    boardSize: "cat-evolution-2048-board-size",
    fourChance: "cat-evolution-2048-four-chance"
};

/* =================================
   PERSISTENCE
================================= */

// Thin, validated wrapper around localStorage.
class Store {
    // A number within [min, max], otherwise the default.
    static number(key, { min, max, default: fallback }) {
        const value = Number(localStorage.getItem(key));
        return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
    }

    // A valid 6-digit hex colour, otherwise the fallback.
    static color(key, fallback) {
        const value = localStorage.getItem(key);
        return /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : fallback;
    }

    // A boolean stored as "1"/"0"; absent falls back.
    static bool(key, fallback) {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value === "1";
    }

    // Parse a stored JSON array, tolerating corruption.
    static json(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "null");
            return Array.isArray(value) ? value : null;
        } catch {
            return null;
        }
    }

    // Write any scalar; booleans become "1"/"0".
    static set(key, value) {
        localStorage.setItem(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
    }
}

/* =================================
   GAME LOGIC
================================= */

// Pure board model: grid, scoring, moves and spawning (no DOM).
class GameBoard {
    constructor(size, fourChance) {
        this.size = size;
        this.fourChance = fourChance;
        this.nextId = 0;
        this.reset();
    }

    // Start a fresh grid with two tiles.
    reset() {
        this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(null));
        this.score = 0;
        this.spawn();
        this.spawn();
    }

    // Unique id per tile for render/animation tracking.
    createId() {
        this.nextId += 1;
        return `tile-${this.nextId}`;
    }

    // Coordinates of every empty cell.
    emptyCells() {
        const cells = [];
        this.grid.forEach((row, r) => row.forEach((tile, c) => {
            if (!tile) cells.push({ row: r, col: c });
        }));
        return cells;
    }

    // Place a 2 or 4 (per fourChance) on a random empty cell.
    spawn() {
        const cells = this.emptyCells();
        if (!cells.length) return null;

        const { row, col } = cells[Math.floor(Math.random() * cells.length)];
        const value = Math.random() < this.fourChance / 100 ? 4 : 2;
        this.grid[row][col] = { id: this.createId(), value };
        return this.grid[row][col];
    }

    // Ordered cell coordinates for each line travelled in a direction.
    lines(direction) {
        const horizontal = direction === "left" || direction === "right";
        const forward = direction === "left" || direction === "up";
        const lines = [];

        for (let index = 0; index < this.size; index += 1) {
            const line = [];
            for (let offset = 0; offset < this.size; offset += 1) {
                const position = forward ? offset : this.size - 1 - offset;
                line.push(horizontal ? { row: index, col: position } : { row: position, col: index });
            }
            lines.push(line);
        }
        return lines;
    }

    // Slide and merge in a direction; returns what changed for rendering.
    move(direction) {
        const previous = this.grid.map((row) => row.slice());
        const mergedIds = new Set();
        let gained = 0;

        for (const coordinates of this.lines(direction)) {
            const tiles = coordinates.map(({ row, col }) => this.grid[row][col]).filter(Boolean);
            const result = [];

            for (let index = 0; index < tiles.length; index += 1) {
                const current = tiles[index];
                const next = tiles[index + 1];

                // Two equal neighbours evolve into one doubled tile.
                if (next && current.value === next.value) {
                    const merged = { id: this.createId(), value: current.value * 2 };
                    result.push(merged);
                    mergedIds.add(merged.id);
                    gained += merged.value;
                    index += 1;
                } else {
                    result.push(current);
                }
            }

            coordinates.forEach(({ row, col }, index) => {
                this.grid[row][col] = result[index] || null;
            });
        }

        const changed = this.grid.some((row, r) => row.some((tile, c) => tile !== previous[r][c]));
        if (changed) {
            this.score += gained;
            this.spawn();
        }
        return { changed, mergedIds };
    }

    // True while any move (empty cell or mergeable neighbour) remains.
    hasMoves() {
        for (let row = 0; row < this.size; row += 1) {
            for (let col = 0; col < this.size; col += 1) {
                const tile = this.grid[row][col];
                if (!tile) return true;
                const right = col + 1 < this.size ? this.grid[row][col + 1] : null;
                const below = row + 1 < this.size ? this.grid[row + 1][col] : null;
                if (right && right.value === tile.value) return true;
                if (below && below.value === tile.value) return true;
            }
        }
        return false;
    }

    // Highest tile value currently on the board.
    maxValue() {
        let max = 0;
        for (const row of this.grid) {
            for (const tile of row) {
                if (tile && tile.value > max) max = tile.value;
            }
        }
        return max;
    }

    // Every tile value on the board (for the collection).
    values() {
        const values = [];
        for (const row of this.grid) {
            for (const tile of row) {
                if (tile) values.push(tile.value);
            }
        }
        return values;
    }
}

/* =================================
   BOARD RENDERING
================================= */

// Renders the grid into the board element with FLIP + pop animations.
class BoardRenderer {
    constructor(element) {
        this.element = element;
        this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // Match the CSS grid to the current board size.
    setColumns(size) {
        this.element.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
    }

    // Feed the merge-animation CSS variables used by the stylesheet.
    setAnimation(duration, alpha) {
        this.element.style.setProperty("--merge-animation-duration", `${duration}ms`);
        this.element.style.setProperty("--merge-alpha", String(alpha / 100));
    }

    // Build a single tile element from a grid cell.
    buildTile(tile) {
        const element = document.createElement("div");
        if (!tile) {
            element.className = "tile empty";
            element.style.aspectRatio = "1";
            return element;
        }

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
        return element;
    }

    // Redraw the grid, animating moved and merged tiles.
    render(grid, mergedIds = new Set()) {
        // Capture where existing tiles sit before the DOM is rebuilt.
        const previous = new Map();
        this.element.querySelectorAll(".tile[data-tile-id]").forEach((element) => {
            previous.set(element.dataset.tileId, element.getBoundingClientRect());
        });

        const fragment = document.createDocumentFragment();
        grid.forEach((row) => row.forEach((tile) => fragment.appendChild(this.buildTile(tile))));
        this.element.replaceChildren(fragment);

        if (this.reduceMotion) return;

        // Pop merged tiles; slide the rest from their previous positions (FLIP).
        this.element.querySelectorAll(".tile[data-tile-id]").forEach((element) => {
            if (mergedIds.has(element.dataset.tileId)) {
                element.classList.add("merging");
                return;
            }

            const start = previous.get(element.dataset.tileId);
            if (!start) return;

            const current = element.getBoundingClientRect();
            const dx = start.left - current.left;
            const dy = start.top - current.top;
            if (!dx && !dy) return;

            element.animate(
                [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
                { duration: CONFIG.slideDuration, easing: "ease-out" }
            );
        });
    }
}

/* =================================
   CAT COLLECTION
================================= */

// Tracks discovered tile values and renders the collection grid.
class Collection {
    constructor(element, target) {
        this.element = element;
        this.target = target;
        this.discovered = new Set((Store.json(STORAGE_KEYS.discovered) || [])
            .filter((value) => Number.isInteger(value) && value >= 2));
        this.render();
    }

    // Record any newly-seen values; redraw and save only if something changed.
    record(values) {
        let changed = false;
        for (const value of values) {
            if (!this.discovered.has(value)) {
                this.discovered.add(value);
                changed = true;
            }
        }
        if (changed) {
            Store.set(STORAGE_KEYS.discovered, JSON.stringify([...this.discovered]));
            this.render();
        }
    }

    // One card per value from 2 up to the target, locked until discovered.
    render() {
        if (!this.element) return;

        const fragment = document.createDocumentFragment();
        for (let value = 2; value <= this.target; value *= 2) {
            const card = document.createElement("div");
            card.className = "new-cat-card";
            const found = this.discovered.has(value);

            if (found) {
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
            name.textContent = found ? `Cat ${value}` : "Undiscovered";
            const number = document.createElement("small");
            number.textContent = found ? `Tile ${value}` : "???";
            card.append(name, number);
            fragment.appendChild(card);
        }
        this.element.replaceChildren(fragment);
    }
}

/* =================================
   SETTINGS PANEL
================================= */

// Reads, reflects, persists and announces the settings controls.
class SettingsPanel {
    // onChange(key, value) is fired when a setting takes effect.
    constructor(onChange) {
        this.onChange = onChange;

        // Data-driven control table: each spec is one setting. el/outEl are
        // filled in by resolve(); bounds/fmt/out apply to numeric sliders only.
        const spec = (key, id, type, extra = {}) =>
            ({ key, id, type, restart: false, out: null, bounds: null, fmt: null, el: null, outEl: null, ...extra });
        this.specs = [
            spec("mergeSpeed", "merge-speed", "number",
                { out: "merge-speed-value", bounds: CONFIG.mergeSpeed, fmt: (v) => `${v} ms` }),
            spec("mergeAlpha", "merge-alpha", "number",
                { out: "merge-alpha-value", bounds: CONFIG.mergeAlpha, fmt: (v) => `${v}%` }),
            spec("boardColor", "board-color", "color"),
            spec("showNumbers", "show-numbers", "bool"),
            spec("boardSize", "board-size", "number",
                { out: "board-size-value", bounds: CONFIG.boardSize, fmt: (v) => `${v} × ${v}`, restart: true }),
            spec("fourChance", "four-chance", "number",
                { out: "four-chance-value", bounds: CONFIG.fourChance, fmt: (v) => `${v}%`, restart: true })
        ];

        this.values = {};
        this.resolve();
        this.load();
        this.reflect();
        this.bind();
    }

    // Grab each control and output element from the DOM.
    resolve() {
        for (const spec of this.specs) {
            spec.el = document.getElementById(spec.id);
            spec.outEl = spec.out ? document.getElementById(spec.out) : null;
            if (!spec.el || (spec.out && !spec.outEl)) {
                throw new Error(`Missing settings control: ${spec.id}`);
            }
        }
    }

    // Read saved values (or defaults) into this.values.
    load() {
        for (const spec of this.specs) {
            if (spec.type === "number") {
                this.values[spec.key] = Store.number(STORAGE_KEYS[spec.key], spec.bounds);
            } else if (spec.type === "color") {
                this.values[spec.key] = Store.color(STORAGE_KEYS[spec.key], CONFIG.defaultBoardColor);
            } else {
                this.values[spec.key] = Store.bool(STORAGE_KEYS[spec.key], true);
            }
        }
    }

    // Push current values onto the controls and output labels.
    reflect() {
        for (const spec of this.specs) {
            const value = this.values[spec.key];
            if (spec.type === "bool") spec.el.checked = value;
            else spec.el.value = value;
            if (spec.outEl) spec.outEl.value = spec.fmt(value);
        }
    }

    // Store a control's new value, persist it, and refresh its label.
    commit(spec) {
        const value = spec.type === "bool" ? spec.el.checked
            : spec.type === "color" ? spec.el.value
                : Number(spec.el.value);
        this.values[spec.key] = value;
        Store.set(STORAGE_KEYS[spec.key], value);
        if (spec.outEl) spec.outEl.value = spec.fmt(value);
    }

    // Wire up events. Restart settings fire onChange on "change" (once the
    // slider settles) while updating their label live during "input".
    bind() {
        for (const spec of this.specs) {
            if (spec.type === "bool") {
                spec.el.addEventListener("change", () => {
                    this.commit(spec);
                    this.onChange(spec.key, this.values[spec.key]);
                });
                continue;
            }

            spec.el.addEventListener("input", () => {
                this.commit(spec);
                if (!spec.restart) this.onChange(spec.key, this.values[spec.key]);
            });
            if (spec.restart) {
                spec.el.addEventListener("change", () => this.onChange(spec.key, this.values[spec.key]));
            }
        }
    }
}

/* =================================
   TAB NAVIGATION
================================= */

// Switches the visible top-level panel.
class TabBar {
    constructor() {
        this.buttons = [...document.querySelectorAll(".tab-button")];
        this.panels = {
            game: document.getElementById("tab-game"),
            collection: document.getElementById("tab-collection"),
            settings: document.getElementById("tab-settings")
        };
        this.buttons.forEach((button) => {
            button.addEventListener("click", () => this.activate(button.dataset.tab));
        });
    }

    // Mark the chosen tab/panel active and the rest inactive.
    activate(name) {
        this.buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === name));
        Object.entries(this.panels).forEach(([key, panel]) => {
            if (panel) panel.classList.toggle("is-active", key === name);
        });
    }
}

/* =================================
   APPLICATION
================================= */

// Wires the pieces together and handles input, scoring and game flow.
class CatEvolution {
    constructor() {
        this.boardElement = document.getElementById("board");
        this.scoreElement = document.getElementById("score");
        this.bestElement = document.getElementById("best");
        this.messageElement = document.getElementById("message");
        this.newGameButton = document.getElementById("new-game");
        const collectionElement = document.getElementById("new-cat-list");

        if (!this.boardElement || !this.scoreElement || !this.bestElement
            || !this.messageElement || !this.newGameButton) {
            throw new Error("The game requires its board, score, message and restart elements.");
        }

        // Compose the components.
        this.settings = new SettingsPanel((key, value) => this.onSettingChange(key, value));
        const values = this.settings.values;
        this.board = new GameBoard(values.boardSize, values.fourChance);
        this.renderer = new BoardRenderer(this.boardElement);
        this.collection = new Collection(collectionElement, CONFIG.targetValue);
        this.tabs = new TabBar();

        this.best = Store.number(STORAGE_KEYS.best, { min: 1, max: Infinity, default: 0 });
        this.hasWon = false;

        // Apply all visual settings and current score up front.
        this.bestElement.textContent = String(this.best);
        this.renderer.setAnimation(values.mergeSpeed, values.mergeAlpha);
        this.boardElement.style.background = values.boardColor;
        this.boardElement.classList.toggle("hide-numbers", !values.showNumbers);

        this.bindInput();
        this.startNewGame();
    }

    // Keyboard and swipe controls plus the New Game button.
    bindInput() {
        this.newGameButton.addEventListener("click", () => this.startNewGame());

        const directions = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
        document.addEventListener("keydown", (event) => {
            const direction = directions[event.key];
            if (!direction) return;
            event.preventDefault();
            this.handleMove(direction);
        });

        let touchStart = null;
        this.boardElement.addEventListener("pointerdown", (event) => {
            touchStart = { x: event.clientX, y: event.clientY };
        });
        this.boardElement.addEventListener("pointerup", (event) => {
            if (!touchStart) return;
            const dx = event.clientX - touchStart.x;
            const dy = event.clientY - touchStart.y;
            touchStart = null;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
            this.handleMove(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down"));
        });
        this.boardElement.addEventListener("pointercancel", () => { touchStart = null; });
    }

    // React to a setting taking effect.
    onSettingChange(key, value) {
        switch (key) {
            case "mergeSpeed":
            case "mergeAlpha":
                this.renderer.setAnimation(this.settings.values.mergeSpeed, this.settings.values.mergeAlpha);
                break;
            case "boardColor":
                this.boardElement.style.background = value;
                break;
            case "showNumbers":
                this.boardElement.classList.toggle("hide-numbers", !value);
                break;
            case "boardSize":
                this.board.size = value;
                this.startNewGame();
                break;
            case "fourChance":
                this.board.fourChance = value;
                this.startNewGame();
                break;
        }
    }

    // Reset the board and draw the opening position.
    startNewGame() {
        this.hasWon = false;
        this.board.reset();
        this.renderer.setColumns(this.board.size);
        this.messageElement.textContent = "Combine matching cats to evolve!";
        this.collection.record(this.board.values());
        this.updateScore();
        this.renderer.render(this.board.grid);
    }

    // Perform a move, then redraw and update status.
    handleMove(direction) {
        const { changed, mergedIds } = this.board.move(direction);
        if (!changed) return;

        this.updateScore();
        this.collection.record(this.board.values());
        this.renderer.render(this.board.grid, mergedIds);

        if (!this.hasWon && this.board.maxValue() >= CONFIG.targetValue) {
            this.hasWon = true;
            this.messageElement.textContent = `Amazing! You discovered ${CONFIG.targetValue}! Keep playing or start a new game.`;
        } else if (!this.board.hasMoves()) {
            this.messageElement.textContent = "No more moves. Start a new game to play again!";
        }
    }

    // Reflect the score and persist a new best.
    updateScore() {
        this.scoreElement.textContent = String(this.board.score);
        if (this.board.score > this.best) {
            this.best = this.board.score;
            this.bestElement.textContent = String(this.best);
            Store.set(STORAGE_KEYS.best, this.best);
        }
    }
}

// Boot the game.
new CatEvolution();
