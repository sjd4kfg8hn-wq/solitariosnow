
// Motor completo de Solitario Klondike (reglas, movimientos bidireccionales y puntuación oficial)
class SolitaireGame {
    constructor() {
        this.deck = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];
        this.score = 0;
        this.moves = 0;
        this.startTime = null;
    }

    init() {
        this.deck = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];
        this.score = 0;
        this.moves = 0;
        this.startTime = Date.now();

        this.createDeck();
        this.shuffle();
        this.dealCards();
    }

    createDeck() {
        const suits = ["♠", "♥", "♦", "♣"];
        const colors = { "♠": "black", "♣": "black", "♥": "red", "♦": "red" };

        for (const suit of suits) {
            for (let value = 1; value <= 13; value++) {
                this.deck.push({
                    id: `${suit}-${value}`,
                    suit,
                    value,
                    color: colors[suit],
                    faceUp: false
                });
            }
        }
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = this.deck.pop();
                if (row === col) card.faceUp = true;
                this.tableau[col].push(card);
            }
        }
    }

    drawFromStock() {
        if (this.deck.length > 0) {
            const card = this.deck.pop();
            card.faceUp = true;
            this.waste.push(card);
            this.moves++;
        } else if (this.waste.length > 0) {
            // Reciclar descarte al mazo principal
            while (this.waste.length > 0) {
                const card = this.waste.pop();
                card.faceUp = false;
                this.deck.push(card);
            }
            this.moves++;
        }
    }

    // Regla de colocación en el Tableau (Colores alternos y orden descendente)
    canMoveToTableau(card, targetCard) {
        if (!targetCard) return card.value === 13; // Solo Reyes en columnas vacías
        return card.color !== targetCard.color && card.value === targetCard.value - 1;
    }

    // Regla de colocación en las Fundaciones (Mismo palo y orden ascendente desde el As)
    canMoveToFoundation(card, foundationIdx) {
        const foundation = this.foundations[foundationIdx];
        if (foundation.length === 0) return card.value === 1; // Debe ser un As
        const topCard = foundation[foundation.length - 1];
        return card.suit === topCard.suit && card.value === topCard.value + 1;
    }

    // Puntuación Klondike Estándar Windows
    addScore(points) {
        this.score = Math.max(0, this.score + points);
    }
}
