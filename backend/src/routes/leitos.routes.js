const express = require('express');
const router = express.Router();
const controller = require('../controllers/leitos.controller');

router.get('/', controller.listar);
router.post('/', controller.criar);
router.put('/:id', controller.atualizarStatus);
router.delete('/:id', controller.remover);

module.exports = router;
