const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const players = require('./routes/playerRoutes');
const cards = require('./routes/cardsRoutes');
const battleAnalytics = require('./routes/battleAnalyticsRoute');


dotenv.config();

connectDB();

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/players', players);
app.use('/api/cards', cards);
app.use('/api/analytics', battleAnalytics); 

app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'online',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});


app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.path}`
  });
});


app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno no servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta: ${PORT}`);
});
