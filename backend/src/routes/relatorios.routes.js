const express = require('express');
const router = express.Router();
const controller = require('../controllers/relatorios.controller');

router.get('/movimentacoes', controller.movimentacoes);

module.exports = router;
