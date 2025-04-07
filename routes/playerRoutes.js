const express = require('express');
const router = express.Router();
const { getPlayerData, getPlayerStats } = require('../controllers/playersController');

const validatePlayerTag = (req, res, next) => {
  const { tag } = req.params;
  
  if (!tag || tag.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'A tag do jogador é obrigatória'
    });
  }

  const cleanTag = tag.replace('#', '');
  if (cleanTag.length < 3 || !/^[0-9A-Z]+$/.test(cleanTag)) {
    return res.status(400).json({
      success: false,
      message: 'Formato de tag inválido. Use apenas letras maiúsculas e números'
    });
  }

  req.cleanTag = cleanTag;
  next();
};

/**
 * @route GET /api/players/:tag
 * @description Obtém os dados básicos de um jogador
 * @access Public
 */
router.get('/:tag', validatePlayerTag, getPlayerData);

/**
 * @route GET /api/players/:tag/stats
 * @description Obtém estatísticas detalhadas do jogador
 * @access Public
 */
router.get('/:tag/stats', validatePlayerTag, getPlayerStats);

module.exports = router;
