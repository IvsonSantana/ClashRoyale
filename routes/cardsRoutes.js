const express = require('express');
const router = express.Router({
  caseSensitive: false,
  strict: false
});
const { fetchCards, getCards } = require('../controllers/cardController');

router.get('/fetch', fetchCards);

router.get('/', getCards);

module.exports = router;