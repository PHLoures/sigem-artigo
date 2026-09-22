// medicamentos.routes.js
//
// Define os "enderecos" (rotas) da API de medicamentos e
// qual funcao do controller cada um deve chamar.

const express = require('express');
const router = express.Router();
const controller = require('../controllers/medicamentos.controller');

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.post('/', controller.criar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.remover);

module.exports = router;
