const axios = require('axios');
const Card = require('../models/cardModels');
const dotenv = require('dotenv');
dotenv.config();


const api = axios.create({
  baseURL: 'https://api.clashroyale.com/v1',
  timeout: 10000,
  headers: {
    'Authorization': `Bearer ${process.env.TOKEN}`,
    'Accept': 'application/json'
  }
});

const fetchCards = async (req, res) => {
    try {
      if (!process.env.TOKEN) {
        throw new Error('Token não configurado no .env');
      }
  
      const response = await api.get('/cards');
      
      const cardsData = response.data.items.map(card => {
        const elixirCost = card.elixirCost !== undefined ? card.elixirCost : 0;
        
        return {
          id: card.id.toString(),
          name: card.name,
          rarity: card.rarity.toLowerCase(),
          maxLevel: card.maxLevel,
          elixirCost: elixirCost, 
          maxEvolutionLevel: card.maxEvolutionLevel || 0,
          iconUrls: card.iconUrls || {}
        };
      });
  
      await Card.deleteMany({});
      const result = await Card.insertMany(cardsData);
  
      res.json({
        success: true,
        message: `${result.length} cartas atualizadas`,
        data: result
      });
    } catch (error) {
      console.error('Erro detalhado:', error);
      res.status(500).json({
        success: false,
        message: 'Falha ao buscar cartas',
        error: error.message
      });
    }
  };

const getCards = async (req, res) => {
  try {
    const cards = await Card.find({});
    
    if (!cards.length) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma carta encontrada. Execute /fetch primeiro.'
      });
    }

    res.json({
      success: true,
      count: cards.length,
      data: cards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar cartas no banco',
      error: error.message
    });
  }
};

module.exports = {
  fetchCards,
  getCards
};