const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  id: Number,
  name: String,
  elixirCost: Number
}, { _id: false });

const opponentSchema = new mongoose.Schema({
  tag: String,
  trophies: Number,
  deck: [cardSchema]
}, { _id: false });

const battleSchema = new mongoose.Schema({
  battleTime: Date, 
  deckUsed: [cardSchema],
  opponent: opponentSchema,
  result: {
    type: String,
    enum: ['win', 'loss']
  },
  trophyChange: Number
}, { _id: false });

const PlayerSchema = new mongoose.Schema({
  tag: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  trophies: { 
    type: Number, 
    required: true 
  },
  battleCount: { 
    type: Number, 
    required: true 
  },
  wins: {
    type: Number,
    required: true
  },
  losses: {
    type: Number,
    required: true
  },
  currentDeck: [cardSchema],  
  battleLog: [battleSchema]   
}, { timestamps: true });

module.exports = mongoose.model('Player', PlayerSchema);