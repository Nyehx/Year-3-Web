
import Grid from "./Grid.js"
import Tile from "./Tile.js"

const boardgame = document.querySelector('.board-game')
const scoreElem = document.getElementById('score')
const undoBtn = document.getElementById('undo-btn')

const grid = new Grid(boardgame)
let score = 0
let previousState = null

if (!loadGameFromLocalStorage()) {
    grid.randomEmptyCell().tile = new Tile(boardgame)
    grid.randomEmptyCell().tile = new Tile(boardgame)
}

setupInput()
setupUndo()
updateLeaderboardUI()
setupMobileControls()
setupRestart()

document.addEventListener('keydown', e => {
    if (e.key.startsWith("Arrow")) {
        e.preventDefault() 
    }
})

function setupUndo() {
    undoBtn.addEventListener("click", () => {
        if (!previousState) return

        score = previousState.score
        scoreElem.textContent = score

        const allTiles = document.querySelectorAll(".tile")
        allTiles.forEach(t => t.remove())

        grid.cells.forEach(cell => {
            cell.tile = null 
            cell.mergeTile = null
        })

        previousState.tiles.forEach(tileData => {
            const cell = grid.cells[tileData.index]
            const newTile = new Tile(boardgame)
            newTile.value = tileData.value
            cell.tile = newTile
        })

        previousState = null
        
        saveGameToLocalStorage()

        setupInput()
    })
}

function saveState() {
    previousState = {
        score: score,
        tiles: grid.cells
            .map((cell, index) => {
                if (cell.tile) {
                    return { 
                        index: index, 
                        value: cell.tile.value 
                    }
                }
                return null
            })
            .filter(t => t !== null)
    }
}

function saveGameToLocalStorage() {
    const gameState = {
        score: score,
        tiles: grid.cells
            .map((cell, index) => {
                if (cell.tile) {
                    return { 
                        index: index, 
                        value: cell.tile.value 
                    }
                }
                return null
            })
            .filter(t => t !== null)
    }
    
    localStorage.setItem("2048-game-state", JSON.stringify(gameState))
}

function loadGameFromLocalStorage() {
    const savedData = localStorage.getItem("2048-game-state")
    if (!savedData) return false

    const gameState = JSON.parse(savedData)

    score = gameState.score
    scoreElem.textContent = score

    gameState.tiles.forEach(tileData => {
        const cell = grid.cells[tileData.index]
        const newTile = new Tile(boardgame)
        newTile.value = tileData.value 
        cell.tile = newTile
    })

    return true 
}

function updateLeaderboardUI() {
    const list = document.getElementById('high-scores-list')
    const highScores = JSON.parse(localStorage.getItem("2048-leaderboard")) || []

    list.replaceChildren() 

    highScores.forEach(scoreData => {
        const li = document.createElement('li')
        li.classList.add('high-score-item')

        const nameSpan = document.createElement('span')
        nameSpan.textContent = scoreData.name

        const dateSpan = document.createElement('span')
        dateSpan.textContent = scoreData.date

        const scoreStrong = document.createElement('strong')
        scoreStrong.textContent = scoreData.score

        li.appendChild(nameSpan)
        li.appendChild(dateSpan)
        li.appendChild(scoreStrong)

        list.appendChild(li)
    })
}

function saveHighScore(name, score) {
    const highScores = JSON.parse(localStorage.getItem("2048-leaderboard")) || []
    
    const newScore = {
        score: score,
        name: name,
        date: new Date().toLocaleDateString()
    }
    
    highScores.push(newScore)

    highScores.sort((a, b) => b.score - a.score)
    
    highScores.splice(10)
    
    localStorage.setItem("2048-leaderboard", JSON.stringify(highScores))
}

function setupInput() {
    window.addEventListener("keydown", handleInput, { once: true })
}

async function handleInput(e) {

    switch (e.key) {
        case "ArrowUp":
            if (!canMoveUp()) {
                setupInput()
                return
            }
            saveState()
            await moveUp()
            break
        case "ArrowDown":
            if (!canMoveDown()) {
                setupInput()
                return
            }
            saveState()
            await moveDown()
            break
        case "ArrowLeft":
            if (!canMoveLeft()) {
                setupInput()
                return
            }
            saveState()
            await moveLeft()
            break
        case "ArrowRight":
            if (!canMoveRight()) {
                setupInput()
                return
            }
            saveState()
            await moveRight()
            break
        default:
            setupInput()
            return
    }

    grid.cells.forEach(cell => cell.mergeTiles())
    
    const newTile = new Tile(boardgame)
    grid.randomEmptyCell().tile = newTile

    saveGameToLocalStorage()

    if (!canMoveDown() && !canMoveUp() && !canMoveLeft() && !canMoveRight()) {
        newTile.waitForTransition(true).then(() => {
            openGameOverModal(score)
        })
        return
    }

    setupInput()
}

function moveUp() {
    return slideTiles(grid.cellsByColumn)
}
function moveDown() {
    return slideTiles(grid.cellsByColumn.map(column => [...column].reverse()))
}
function moveLeft() {
    return slideTiles(grid.cellsByRow)
}
function moveRight() {
    return slideTiles(grid.cellsByRow.map(row => [...row].reverse()))
}

function slideTiles(cells) {
    return Promise.all(
        cells.flatMap(group => {
            const promises = []
            for (let i = 1; i < group.length; i++) {
                const cell = group[i]
                if (cell.tile == null) continue
                let lastValidCell
                for (let j = i - 1; j >= 0; j--) {
                    const moveToCell = group[j]
                    if (!moveToCell.canAccept(cell.tile)) break
                    lastValidCell = moveToCell
                }
                if (lastValidCell != null) {
                    promises.push(cell.tile.waitForTransition())
                    if (lastValidCell.tile != null) {
                        lastValidCell.mergeTile = cell.tile
                        
                        const points = lastValidCell.tile.value * 2
                        score += points
                        scoreElem.textContent = score
                        
                    } else {
                        lastValidCell.tile = cell.tile
                    }
                    cell.tile = null
                }
            }
            return promises
        }))
}

function canMoveUp() {
    return canMove(grid.cellsByColumn)
}
function canMoveDown() {
    return canMove(grid.cellsByColumn.map(column => [...column].reverse()))
}
function canMoveLeft() {
    return canMove(grid.cellsByRow)
}
function canMoveRight() {
    return canMove(grid.cellsByRow.map(row => [...row].reverse()))
}

function canMove(cells) {
    return cells.some(group => {
        return group.some((cell, index) => {
            if (index === 0) return false
            if (cell.tile == null) return false
            const moveToCell = group[index - 1]
            return moveToCell.canAccept(cell.tile)
        })
    })
}

function setupMobileControls() {
  const buttons = document.querySelectorAll('.mobile-btn')
  if (!buttons.length) return

  buttons.forEach(btn => {
    const key = btn.dataset.key 
    const handler = (evt) => {
      evt.preventDefault()
      const synthetic = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      window.dispatchEvent(synthetic)
    }

    btn.addEventListener('pointerdown', handler)
    btn.addEventListener('click', handler)
  })
}

function setupRestart() {
    const restartBtn = document.getElementById("restart-btn")
    restartBtn.addEventListener("click", restartGame)
}

function restartGame() {

    closeGameOverModal();

    previousState = null

    score = 0
    scoreElem.textContent = score

    document.querySelectorAll(".tile").forEach(tile => tile.remove())

    grid.cells.forEach(cell => {
        cell.tile = null
        cell.mergeTile = null
    })

    grid.randomEmptyCell().tile = new Tile(boardgame)
    grid.randomEmptyCell().tile = new Tile(boardgame)

    localStorage.removeItem("2048-game-state")

    setupInput()

    setMobileControlsHidden(false)

    if (typeof undoBtn !== "undefined" && undoBtn !== null) {
        undoBtn.disabled = false
    }
}

const gameOverOverlay = document.getElementById("game-over-overlay");
const gameOverScoreElem = document.getElementById("game-over-score");
const saveScoreForm = document.getElementById("save-score-form");
const playerNameInput = document.getElementById("player-name");
const saveScoreBtn = document.getElementById("save-score-btn");
const modalRestartBtn = document.getElementById("modal-restart-btn");
const modalCloseBtn = document.getElementById("modal-close-btn");
const savedConfirmation = document.getElementById("saved-confirmation");

function setMobileControlsHidden(hidden) {
  const mobile = document.querySelector(".mobile-controls");
  if (!mobile) return;
  if (hidden) mobile.classList.add("hidden");
  else mobile.classList.remove("hidden");
}

function openGameOverModal(finalScore) {

  gameOverScoreElem.textContent = String(finalScore);

  playerNameInput.value = "";
  playerNameInput.required = true;
  savedConfirmation.classList.add("hidden");
  saveScoreForm.classList.remove("hidden");

  gameOverOverlay.classList.remove("hidden");
  gameOverOverlay.setAttribute("aria-hidden", "false");

  if (typeof undoBtn !== "undefined" && undoBtn !== null) {
    undoBtn.disabled = true;
  }

  setMobileControlsHidden(true);

}

function closeGameOverModal() {
  gameOverOverlay.classList.add("hidden");
  gameOverOverlay.setAttribute("aria-hidden", "true");

  if (typeof undoBtn !== "undefined" && undoBtn !== null) {
    undoBtn.disabled = false;
  }

  setMobileControlsHidden(false);
}

saveScoreForm.addEventListener("submit", (evt) => {
    evt.preventDefault();

    const name = playerNameInput.value && playerNameInput.value.trim();
    if (!name) {
        playerNameInput.focus();
        return;
    }

    saveHighScore(name, Number(score));
    updateLeaderboardUI();

    saveScoreForm.classList.add("hidden");
    savedConfirmation.classList.remove("hidden");

    localStorage.removeItem("2048-game-state");

});

modalRestartBtn.addEventListener("click", (evt) => {

    closeGameOverModal();
    restartGame();
});

modalCloseBtn.addEventListener("click", () => {
    closeGameOverModal();
    restartGame();
});

gameOverOverlay.addEventListener("pointerdown", (e) => {
    if (e.target === gameOverOverlay) {
        closeGameOverModal();
    }
});

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !gameOverOverlay.classList.contains("hidden")) {
        closeGameOverModal();
    }
});

const leaderboardToggle = document.getElementById("leaderboard-toggle");
const leaderboardPanel = document.getElementById("leaderboard-panel");

leaderboardToggle.addEventListener("click", () => {
    const isOpening = leaderboardPanel.classList.contains("hidden");

    leaderboardPanel.classList.toggle("hidden");

    leaderboardToggle.textContent = isOpening ? "Leaderboard ▲" : "Leaderboard ▼";

    setControlsHidden(isOpening);
});

function setControlsHidden(hidden) {
    undoBtn.style.display = hidden ? "none" : "";
    const restartBtn = document.getElementById("restart-btn");
    restartBtn.style.display = hidden ? "none" : "";

    setMobileControlsHidden(hidden);
}
