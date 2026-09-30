const express = require('express');
const router = express.Router();
const controller = require('../controllers/previsao.controller');

router.get('/', controller.previsaoEstoque);

module.exports = router;
