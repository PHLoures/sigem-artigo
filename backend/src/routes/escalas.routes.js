const express = require('express');
const router = express.Router();
const controller = require('../controllers/escalas.controller');

router.get('/', controller.listar);
router.post('/', controller.criar);
router.delete('/:id', controller.remover);

module.exports = router;
