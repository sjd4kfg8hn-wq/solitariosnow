
// Capa de Interacción Visual, Eventos UI y LocalStorage
document.addEventListener('DOMContentLoaded', () => {
    const game = new SolitaireGame();
    let selectedOrigin = null;

    // Cargar récord guardado
    const highScoreEl = document.getElementById('high-score');
    highScoreEl.textContent = localStorage.getItem('solitario_highscore') || 0;

    // Inicializar juego
    function startNewGame() {
        game.init();
        render();
    }

    // Botones de UI
    document.getElementById('btn-new-game').addEventListener('click', startNewGame);
    
    document.getElementById('btn-audio').addEventListener('click', (e) => {
        const active = soundFX.toggle();
        document.getElementById('audio-status').textContent = active ? 'ON' : 'OFF';
        e.target.classList.toggle('text-cyan-300', active);
    });

    document.getElementById('stock').addEventListener('click', () => {
        game.drawFromStock();
        soundFX.playCardFlip();
        render();
    });

    // Renderizado general de UI
    function render() {
        document.getElementById('score').textContent = game.score;
        document.getElementById('moves').textContent = game.moves;

        // Renderizar Stock
        const stockEl = document.getElementById('stock');
        stockEl.innerHTML = game.deck.length > 0 
            ? `<div class="card face-down w-full h-full"></div>` 
            : `<span class="text-cyan-500/40 text-2xl">🔄</span>`;

        // Renderizar Waste
        const wasteEl = document.getElementById('waste');
        wasteEl.innerHTML = '';
        if (game.waste.length > 0) {
            const card = game.waste[game.waste.length - 1];
            wasteEl.appendChild(createCardUI(card, { type: 'waste' }));
        }

        // Renderizar Fundaciones
        for (let i = 0; i < 4; i++) {
            const fEl = document.getElementById(`foundation-${i}`);
            fEl.innerHTML = '';
            const foundation = game.foundations[i];
            if (foundation.length > 0) {
                const card = foundation[foundation.length - 1];
                fEl.appendChild(createCardUI(card, { type: 'foundation', index: i }));
            } else {
                const suits = ["♠", "♥", "♣", "♦"];
                const colors = ["text-cyan-500/30", "text-fuchsia-500/30", "text-cyan-500/30", "text-fuchsia-500/30"];
                fEl.innerHTML = `<span class="${colors[i]} text-2xl">${suits[i]}</span>`;
            }
        }

        // Renderizar Tableau
        for (let col = 0; col < 7; col++) {
            const tEl = document.getElementById(`tableau-${col}`);
            tEl.innerHTML = '';
            const column = game.tableau[col];

            column.forEach((card, rowIdx) => {
                const cardEl = createCardUI(card, { type: 'tableau', col, row: rowIdx });
                cardEl.style.top = `${rowIdx * 24}px`;
                tEl.appendChild(cardEl);
            });
        }

        checkHighScore();
    }

    // Generador de Elementos DOM de cartas
    function createCardUI(card, loc) {
        const el = document.createElement('div');
        el.className = `card ${card.color} ${!card.faceUp ? 'face-down' : ''}`;
        
        if (card.faceUp) {
            el.innerHTML = `
                <div class="p-1 flex flex-col justify-between h-full">
                    <div class="text-xs font-bold leading-none">${getCardValueName(card.value)}<br>${card.suit}</div>
                    <div class="text-center text-lg">${card.suit}</div>
                    <div class="text-xs font-bold leading-none text-right rotate-180">${getCardValueName(card.value)}<br>${card.suit}</div>
                </div>
            `;

            // Eventos de Click y Doble Click Inteligente
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                handleCardClick(card, loc);
            });

            el.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                handleAutoMoveToFoundation(card, loc);
            });
        }

        return el;
    }

    function getCardValueName(val) {
        if (val === 1) return 'A';
        if (val === 11) return 'J';
        if (val === 12) return 'Q';
        if (val === 13) return 'K';
        return val;
    }

    // Lógica de Selección y Movimiento BIDIRECCIONAL
    function handleCardClick(card, loc) {
        if (!selectedOrigin) {
            // Seleccionar carta de origen
            selectedOrigin = { card, loc };
            highlightSelection(true, loc);
        } else {
            // Intentar mover carta previa seleccionada al nuevo destino
            const src = selectedOrigin.loc;
            
            if (loc.type === 'tableau') {
                attemptMoveToTableau(src, loc.col);
            } else if (loc.type === 'foundation') {
                attemptMoveToFoundation(src, loc.index);
            }

            highlightSelection(false, src);
            selectedOrigin = null;
        }
    }

    // Aplicar el bugfix CSS de selección (z-index solo a la primera carta de la pila)
    function highlightSelection(active, loc) {
        if (loc.type === 'tableau') {
            const colEl = document.getElementById(`tableau-${loc.col}`);
            const cards = colEl.children;
            if (cards[loc.row]) {
                cards[loc.row].classList.toggle('selected-root', active);
            }
        } else if (loc.type === 'waste') {
            const wasteEl = document.getElementById('waste');
            if (wasteEl.firstElementChild) {
                wasteEl.firstElementChild.classList.toggle('selected-root', active);
            }
        }
    }

    // Mover desde cualquier sitio al Tableau
    function attemptMoveToTableau(src, destCol) {
        const destColumn = game.tableau[destCol];
        const targetCard = destColumn.length > 0 ? destColumn[destColumn.length - 1] : null;

        let movingCards = [];

        if (src.type === 'waste') {
            movingCards = [game.waste[game.waste.length - 1]];
        } else if (src.type === 'tableau') {
            movingCards = game.tableau[src.col].slice(src.row);
        } else if (src.type === 'foundation') { // ❌ -> ✅ Foundation -> Tableau
            movingCards = [game.foundations[src.index][game.foundations[src.index].length - 1]];
        }

        if (movingCards.length > 0 && game.canMoveToTableau(movingCards[0], targetCard)) {
            // Ejecutar movimiento
            if (src.type === 'waste') {
                game.tableau[destCol].push(game.waste.pop());
            } else if (src.type === 'tableau') {
                const moved = game.tableau[src.col].splice(src.row);
                game.tableau[destCol].push(...moved);
                revealTopTableauCard(src.col);
            } else if (src.type === 'foundation') {
                game.tableau[destCol].push(game.foundations[src.index].pop());
                game.addScore(-15); // Restar puntos por sacar de fundaciones
            }

            game.moves++;
            game.addScore(5);
            soundFX.playCardFlip();
            render();
        }
    }

    // Mover desde cualquier sitio a Foundation
    function attemptMoveToFoundation(src, foundationIdx) {
        let cardToMove = null;

        if (src.type === 'waste') cardToMove = game.waste[game.waste.length - 1];
        if (src.type === 'tableau') cardToMove = game.tableau[src.col][game.tableau[src.col].length - 1];

        if (cardToMove && game.canMoveToFoundation(cardToMove, foundationIdx)) {
            if (src.type === 'waste') {
                game.foundations[foundationIdx].push(game.waste.pop());
            } else if (src.type === 'tableau') {
                game.foundations[foundationIdx].push(game.tableau[src.col].pop());
                revealTopTableauCard(src.col);
            }

            game.moves++;
            game.addScore(10);
            soundFX.playFoundationScore();
            render();
        }
    }

    // Doble Click Inteligente Rápido
    function handleAutoMoveToFoundation(card, loc) {
        for (let i = 0; i < 4; i++) {
            if (game.canMoveToFoundation(card, i)) {
                attemptMoveToFoundation(loc, i);
                break;
            }
        }
    }

    function revealTopTableauCard(col) {
        const column = game.tableau[col];
        if (column.length > 0 && !column[column.length - 1].faceUp) {
            column[column.length - 1].faceUp = true;
            game.addScore(5);
        }
    }

    function checkHighScore() {
        const currentHigh = parseInt(localStorage.getItem('solitario_highscore') || '0');
        if (game.score > currentHigh) {
            localStorage.setItem('solitario_highscore', game.score);
            highScoreEl.textContent = game.score;
        }
    }

    // Iniciar temporizador HUD
    setInterval(() => {
        if (game.startTime) {
            const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
            const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const secs = String(elapsed % 60).padStart(2, '0');
            document.getElementById('timer').textContent = `${mins}:${secs}`;
        }
    }, 1000);

    startNewGame();
});
