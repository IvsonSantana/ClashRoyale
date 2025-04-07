const axios = require('axios');
const moment = require('moment');
const Player = require('../models/playersModels');
const dotenv = require('dotenv');
dotenv.config();

const API = axios.create({
  baseURL: 'https://api.clashroyale.com/v1',
  timeout: 10000,
  headers: {
    'Authorization': `Bearer ${process.env.TOKEN}`,
    'Accept': 'application/json'
  }
});

// Função auxiliar para calcular win rate por carta
const calculateCardWinRate = (cardId, battleLog) => {
  const battlesWithCard = battleLog.filter(battle => 
    battle.deckUsed.some(card => card.id === cardId)
  ).length;
  
  if (battlesWithCard === 0) return 0;
  
  const winsWithCard = battleLog.filter(battle => 
    battle.result === 'win' && 
    battle.deckUsed.some(card => card.id === cardId)
  ).length;
    
  return (winsWithCard / battlesWithCard * 100).toFixed(2);
};

const getPlayerData = async (req, res) => {
  try {
    const tag = encodeURIComponent(req.cleanTag);
    
    // Busca dados do jogador e batalhas em paralelo
    const [playerResponse, battlesResponse] = await Promise.all([
      API.get(`/players/%23${tag}`),
      API.get(`/players/%23${tag}/battlelog`)
    ]);

    const playerData = {
      tag: playerResponse.data.tag.replace('#', ''),
      name: playerResponse.data.name,
      trophies: playerResponse.data.trophies,
      battleCount: playerResponse.data.battleCount,
      wins: playerResponse.data.wins,
      losses: playerResponse.data.losses,
      currentDeck: playerResponse.data.currentDeck?.map(card => ({
        id: card.id,
        name: card.name,
        elixirCost: card.elixirCost
      })) || [],
      battleLog: battlesResponse.data.map(battle => ({
        battleTime: moment(battle.battleTime, 'YYYYMMDDTHHmmss.SSS[Z]').toDate(),
        deckUsed: battle.team[0].cards.map(card => ({
          id: card.id,
          name: card.name,
          elixirCost: card.elixirCost
        })),
        opponent: {
          tag: battle.opponent[0].tag.replace('#', ''),
          trophies: battle.opponent[0].startingTrophies,
          deck: battle.opponent[0].cards.map(card => ({
            id: card.id,
            name: card.name,
            elixirCost: card.elixirCost
          }))
        },
        result: battle.team[0].crowns > battle.opponent[0].crowns ? 'win' : 'loss',
        trophyChange: battle.team[0].trophyChange
      }))
    };

    const player = await Player.findOneAndUpdate(
      { tag: playerData.tag },
      playerData,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      data: {
        playerTag: player.tag,
        name: player.name,
        trophies: player.trophies,
        battles: player.battleCount,
        winRate: ((player.wins / player.battleCount) * 100).toFixed(2) + '%'
      }
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({
      success: false,
      message: status === 404 ? 'Jogador não encontrado' : 'Erro ao processar solicitação',
      error: error.response?.data || error.message
    });
  }
};

const getPlayerStats = async (req, res) => {
  try {
    const tag = req.params.tag.replace('#', '');
    const player = await Player.findOne({ tag });
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Jogador não encontrado no banco de dados'
      });
    }

    const deckStats = player.currentDeck.map(card => ({
      cardId: card.id,
      cardName: card.name,
      usageCount: player.battleLog.filter(b => 
        b.deckUsed.some(c => c.id === card.id)
      ).length,
      winRate: calculateCardWinRate(card.id, player.battleLog) + '%'
    }));

    const recentBattles = player.battleLog
      .sort((a, b) => new Date(b.battleTime) - new Date(a.battleTime))
      .slice(0, 5)
      .map(battle => ({
        result: battle.result,
        trophyChange: battle.trophyChange,
        opponentTrophies: battle.opponent.trophies
      }));

    res.json({
      success: true,
      data: {
        playerTag: player.tag,
        battleStats: {
          totalBattles: player.battleCount,
          wins: player.wins,
          losses: player.losses,
          winRate: ((player.wins / player.battleCount) * 100).toFixed(2) + '%'
        },
        deckAnalysis: deckStats,
        recentBattles
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar estatísticas',
      error: error.message
    });
  }
};

module.exports = {
  getPlayerData,
  getPlayerStats
};