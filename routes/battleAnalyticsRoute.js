const express = require('express');
const router = express.Router();
const battleAnalyticsController = require('../controllers/battleAnalyticsController');

// 1. Porcentagem de vitórias e derrotas com a carta X em um intervalo de tempo
router.get('/win-loss-percentage-by-card', battleAnalyticsController.getWinLossPercentageByCard);

// 2. Decks com mais de X% de vitórias em um intervalo
router.get('/decks-with-winrate', battleAnalyticsController.getDecksWithWinRate);

// 3. Derrotas com combo específico de cartas
router.get('/losses-by-combo', battleAnalyticsController.getLossesByCardCombo);

// 4. Vitórias com carta X, menos troféus, partida <2min, oponente derrubou 2 torres
router.get('/special-wins', battleAnalyticsController.getSpecialWins);

// 5. Combos de tamanho N com mais de Y% de vitórias
router.get('/best-combos', battleAnalyticsController.getBestCardCombos);

module.exports = router;