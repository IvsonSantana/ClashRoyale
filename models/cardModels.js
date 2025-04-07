const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  rarity: { 
    type: String, 
    enum: ['common', 'rare', 'epic', 'legendary', 'champion'],
    required: true 
  },
  maxLevel: { type: Number, required: true },
  elixirCost: { type: Number, required: true }, // Campo obrigatório
  maxEvolutionLevel: { type: Number, default: 0 },
  iconUrls: {
    medium: String,
    evolutionMedium: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Card', CardSchema);