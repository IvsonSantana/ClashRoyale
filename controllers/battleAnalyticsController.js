const Player = require('../models/playersModels');
const _ = require('lodash');

// 1. Porcentagem de vitórias e derrotas com a carta X
const getWinLossPercentageByCard = async (req, res) => {
  const { cardName, start, end } = req.query;
  if (!cardName || !start || !end) {
    return res.status(400).json({ success: false, message: 'Parâmetros cardName, start e end são obrigatórios' });
  }

  try {
    const result = await Player.aggregate([
      { $unwind: "$battleLog" },
      {
        $match: {
          "battleLog.battleTime": { $gte: new Date(start), $lte: new Date(end) },
          "battleLog.deckUsed.name": cardName
        }
      },
      {
        $group: {
          _id: "$battleLog.result",
          total: { $sum: 1 }
        }
      }
    ]);

    let total = 0, win = 0, loss = 0;
    result.forEach(r => {
      total += r.total;
      if (r._id === 'win') win = r.total;
      if (r._id === 'loss') loss = r.total;
    });

    res.json({ success: true, data: {
      winPct: total ? ((win / total) * 100).toFixed(2) : 0,
      lossPct: total ? ((loss / total) * 100).toFixed(2) : 0
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Decks com mais de X% de vitórias
const getDecksWithWinRate = async (req, res) => {
  const { minWinRate, start, end } = req.query;
  if (!minWinRate || !start || !end) {
    return res.status(400).json({ success: false, message: 'Parâmetros minWinRate, start e end são obrigatórios' });
  }

  try {
    const result = await Player.aggregate([
      { $unwind: "$battleLog" },
      {
        $match: {
          "battleLog.battleTime": { $gte: new Date(start), $lte: new Date(end) },
          "battleLog.deckUsed.7": { $exists: true }
        }
      },
      {
        $project: {
          deckKey: {
            $reduce: {
              input: { $map: { input: "$battleLog.deckUsed", as: "c", in: "$$c.name" } },
              initialValue: "",
              in: { $cond: [{ $eq: ["$$value", ""] }, "$$this", { $concat: ["$$value", ",", "$$this"] }] }
            }
          },
          result: "$battleLog.result"
        }
      },
      {
        $group: {
          _id: "$deckKey",
          total: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ["$result", "win"] }, 1, 0] } }
        }
      },
      {
        $project: {
          deck: { $split: ["$_id", ","] },
          winRate: { $multiply: [{ $divide: ["$wins", "$total"] }, 100] }
        }
      },
      { $match: { winRate: { $gte: Number(minWinRate) } } },
      { $sort: { winRate: -1 } }
    ]);

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Derrotas com combo
const getLossesByCardCombo = async (req, res) => {
  const { combo, start, end } = req.query;
  if (!combo || !start || !end) {
    return res.status(400).json({ success: false, message: 'Parâmetros combo, start e end são obrigatórios' });
  }

  const comboArray = combo.split(',').map(c => c.trim());

  try {
    const result = await Player.aggregate([
      { $unwind: "$battleLog" },
      {
        $match: {
          "battleLog.battleTime": { $gte: new Date(start), $lte: new Date(end) },
          "battleLog.result": "loss",
          "battleLog.deckUsed.name": { $all: comboArray }
        }
      },
      { $count: "losses" }
    ]);

    res.json({ success: true, data: { combo: comboArray, losses: result[0]?.losses || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Vitórias com condições específicas
const getSpecialWins = async (req, res) => {
  const { cardName, trophyDiffPercent } = req.query;
  if (!cardName || !trophyDiffPercent) {
    return res.status(400).json({ success: false, message: 'Parâmetros cardName e trophyDiffPercent são obrigatórios' });
  }

  try {
    const percent = parseFloat(trophyDiffPercent) / 100;

    const result = await Player.aggregate([
      { $unwind: "$battleLog" },
      {
        $match: {
          "battleLog.result": "win",
          "battleLog.deckUsed.name": cardName,
          "battleLog.duration": { $lt: 120 },
          "battleLog.opponent.towersDestroyed": { $gte: 2 },
          $expr: {
            $lte: ["$trophies", { $subtract: ["$battleLog.opponent.trophies", { $multiply: ["$battleLog.opponent.trophies", percent] }] }]
          }
        }
      },
      { $count: "victories" }
    ]);

    res.json({ success: true, data: { victories: result[0]?.victories || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Combos de N cartas com mais de Y% de vitórias
const getBestCardCombos = async (req, res) => {
  const { size, minWinRate, start, end } = req.query;
  if (!size || !minWinRate || !start || !end) {
    return res.status(400).json({ success: false, message: 'Parâmetros size, minWinRate, start e end são obrigatórios' });
  }

  const sizeN = Number(size);

  try {
    const result = await Player.aggregate([
      { $unwind: "$battleLog" },
      {
        $match: {
          "battleLog.battleTime": { $gte: new Date(start), $lte: new Date(end) }
        }
      },
      {
        $project: {
          cards: { $map: { input: "$battleLog.deckUsed", as: "c", in: "$$c.name" } },
          isWin: { $cond: [{ $eq: ["$battleLog.result", "win"] }, 1, 0] }
        }
      },
      {
        $project: {
          combo: { $slice: ["$cards", sizeN] },
          isWin: 1
        }
      },
      {
        $group: {
          _id: "$combo",
          total: { $sum: 1 },
          wins: { $sum: "$isWin" }
        }
      },
      {
        $project: {
          combo: "$_id",
          winRate: { $multiply: [{ $divide: ["$wins", "$total"] }, 100] }
        }
      },
      { $match: { winRate: { $gte: Number(minWinRate) } } },
      { $sort: { winRate: -1 } }
    ]);

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getWinLossPercentageByCard,
  getDecksWithWinRate,
  getLossesByCardCombo,
  getSpecialWins,
  getBestCardCombos
};