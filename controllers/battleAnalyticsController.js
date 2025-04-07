const Player = require('../models/playersModels');
const _ = require('lodash');


const getWinLossPercentageByCard = async (req, res) => {
  const { cardName, start, end } = req.query;

  if (!cardName || !start || !end) {
    return res.status(400).json({ success: false, message: 'Parâmetros cardName, start e end são obrigatórios' });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  const players = await Player.find({ 'battleLog.battleTime': { $gte: startDate, $lte: endDate } });

  let wins = 0;
  let losses = 0;

  players.forEach(player => {
    player.battleLog.forEach(battle => {
      if (
        new Date(battle.battleTime) >= startDate &&
        new Date(battle.battleTime) <= endDate &&
        battle.deckUsed.some(card => card.name === cardName)
      ) {
        if (battle.result === 'win') wins++;
        else if (battle.result === 'loss') losses++;
      }
    });
  });

  const total = wins + losses;
  const winPct = total ? ((wins / total) * 100).toFixed(2) : 0;
  const lossPct = total ? ((losses / total) * 100).toFixed(2) : 0;

  res.json({ success: true, data: { winPct, lossPct } });
};

// 2. Decks completos com mais de X% de vitórias em um intervalo
const getDecksWithWinRate = async (req, res) => {
  const { minWinRate, start, end } = req.query;

  if (!minWinRate || !start || !end) {
    return res.status(400).json({ success: false, message: 'Parâmetros minWinRate, start e end são obrigatórios' });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const deckStats = {};

  const players = await Player.find({ 'battleLog.battleTime': { $gte: startDate, $lte: endDate } });

  players.forEach(player => {
    player.battleLog.forEach(battle => {
      if (
        new Date(battle.battleTime) >= startDate &&
        new Date(battle.battleTime) <= endDate &&
        battle.deckUsed.length === 8
      ) {
        const deckKey = battle.deckUsed.map(card => card.name).sort().join(',');

        if (!deckStats[deckKey]) deckStats[deckKey] = { wins: 0, total: 0 };

        deckStats[deckKey].total++;
        if (battle.result === 'win') deckStats[deckKey].wins++;
      }
    });
  });

  const result = Object.entries(deckStats)
    .map(([deck, stats]) => ({
      deck: deck.split(','),
      winRate: ((stats.wins / stats.total) * 100).toFixed(2),
    }))
    .filter(entry => entry.winRate >= minWinRate);

  res.json({ success: true, data: result });
};

// 3. Derrotas com combo específico de cartas
const getLossesByCardCombo = async (req, res) => {
  const { combo, start, end } = req.query;

  if (!combo || !start || !end) {
    return res.status(400).json({ success: false, message: 'Parâmetros combo, start e end são obrigatórios' });
  }

  const comboArray = combo.split(',').map(name => name.trim());
  const startDate = new Date(start);
  const endDate = new Date(end);

  let lossCount = 0;

  const players = await Player.find({ 'battleLog.battleTime': { $gte: startDate, $lte: endDate } });

  players.forEach(player => {
    player.battleLog.forEach(battle => {
      if (
        new Date(battle.battleTime) >= startDate &&
        new Date(battle.battleTime) <= endDate &&
        battle.result === 'loss'
      ) {
        const usedCards = battle.deckUsed.map(card => card.name);
        if (comboArray.every(card => usedCards.includes(card))) {
          lossCount++;
        }
      }
    });
  });

  res.json({ success: true, data: { combo: comboArray, losses: lossCount } });
};

// 4. Vitórias com carta X, menos troféus, <2min, oponente destruiu >=2 torres
const getSpecialWins = async (req, res) => {
  const { cardName, trophyDiffPercent } = req.query;

  if (!cardName || !trophyDiffPercent) {
    return res.status(400).json({ success: false, message: 'Parâmetros cardName e trophyDiffPercent são obrigatórios' });
  }

  const players = await Player.find();

  let count = 0;

  players.forEach(player => {
    player.battleLog.forEach(battle => {
      if (
        battle.result === 'win' &&
        battle.deckUsed.some(card => card.name === cardName) &&
        battle.opponent &&
        battle.opponent.trophies &&
        player.trophies &&
        (player.trophies <= battle.opponent.trophies * (1 - parseFloat(trophyDiffPercent) / 100)) &&
        battle.duration < 120 && // em segundos
        battle.opponent.towersDestroyed >= 2
      ) {
        count++;
      }
    });
  });

  res.json({ success: true, data: { victories: count } });
};

// 5. Combos de N cartas com mais de Y% de vitórias
const getBestCardCombos = async (req, res) => {
  const { size, minWinRate, start, end } = req.query;

  if (!size || !minWinRate || !start || !end) {
    return res.status(400).json({ success: false, message: 'Parâmetros size, minWinRate, start e end são obrigatórios' });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const comboStats = {};

  const players = await Player.find({ 'battleLog.battleTime': { $gte: startDate, $lte: endDate } });

  players.forEach(player => {
    player.battleLog.forEach(battle => {
      if (
        new Date(battle.battleTime) >= startDate &&
        new Date(battle.battleTime) <= endDate &&
        battle.deckUsed.length >= size
      ) {
        const cardNames = battle.deckUsed.map(card => card.name).sort();
        const combos = _.combinations(cardNames, parseInt(size));

        combos.forEach(combo => {
          const key = combo.join(',');
          if (!comboStats[key]) comboStats[key] = { wins: 0, total: 0 };
          comboStats[key].total++;
          if (battle.result === 'win') comboStats[key].wins++;
        });
      }
    });
  });

  const result = Object.entries(comboStats)
    .map(([combo, stats]) => ({
      combo: combo.split(','),
      winRate: ((stats.wins / stats.total) * 100).toFixed(2),
    }))
    .filter(entry => entry.winRate >= minWinRate);

  res.json({ success: true, data: result });
};

module.exports = {
  getWinLossPercentageByCard,
  getDecksWithWinRate,
  getLossesByCardCombo,
  getSpecialWins,
  getBestCardCombos
};
