-- ============================================================
-- SIGEM - Sistema de Gestao de Medicamentos Hospitalares
-- seed.sql
--
-- Este arquivo insere dados FICTICIOS para testar o sistema.
-- "Seed" significa "semente" - e o dado inicial para o banco
-- nao comecar vazio.
--
-- As datas de validade foram escolhidas de proposito para
-- testar os 3 alertas do sistema:
--   - lote ja VENCIDO (data no passado)
--   - lote PROXIMO DO VENCIMENTO (poucos dias a frente)
--   - lote com validade NORMAL (bem no futuro)
-- ============================================================


-- ------------------------------------------------------------
-- 1) MEDICAMENTOS
--
-- INSERT INTO tabela (colunas) VALUES (valores);
-- Cada linha dentro de VALUES (...) e um medicamento novo.
-- Nao precisamos informar "id" nem "criado_em": o id e gerado
-- sozinho (SERIAL) e criado_em usa o DEFAULT NOW() do schema.
-- ------------------------------------------------------------
INSERT INTO medicamentos
    (nome, principio_ativo, dosagem, forma_farmaceutica, fabricante, estoque_minimo)
VALUES
    ('Dipirona',     'Dipirona Sodica',      '500mg', 'Comprimido', 'EMS',       100),
    ('Paracetamol',  'Paracetamol',          '750mg', 'Comprimido', 'Medley',     80),
    ('Amoxicilina',  'Amoxicilina Triidratada','500mg','Capsula',   'EuroFarma',  50),
    ('Azitromicina', 'Azitromicina Diidratada','500mg','Comprimido','Eurofarma',  30),
    ('Ibuprofeno',   'Ibuprofeno',           '600mg', 'Comprimido', 'Neo Quimica',60);


-- ------------------------------------------------------------
-- 2) SETORES
-- ------------------------------------------------------------
INSERT INTO setores (nome) VALUES
    ('Farmacia Central'),
    ('Pronto Atendimento'),
    ('UTI'),
    ('Centro Cirurgico');


-- ------------------------------------------------------------
-- 3) LOTES
--
-- Aqui usamos uma SUBCONSULTA (SELECT dentro do INSERT) para
-- pegar o "id" do medicamento pelo nome, em vez de precisar
-- saber o numero exato do id de cabeca.
--
-- Exemplo: (SELECT id FROM medicamentos WHERE nome = 'Dipirona')
-- retorna o id da Dipirona, seja ele 1, 2 ou qualquer outro.
--
-- CURRENT_DATE e uma funcao do PostgreSQL que retorna a data
-- de hoje. Somando ou subtraindo "INTERVAL 'X days'" a gente
-- calcula datas passadas ou futuras.
-- ------------------------------------------------------------

-- Dipirona: um lote com estoque OK e validade distante,
-- e um lote JA VENCIDO (para testar o alerta de vencido).
INSERT INTO lotes (medicamento_id, numero_lote, quantidade, data_validade) VALUES
    ((SELECT id FROM medicamentos WHERE nome = 'Dipirona'), 'DIP2026A', 480, CURRENT_DATE + INTERVAL '365 days'),
    ((SELECT id FROM medicamentos WHERE nome = 'Dipirona'), 'DIP2024B', 40,  CURRENT_DATE - INTERVAL '30 days');

-- Paracetamol: estoque baixo (abaixo do estoque_minimo = 80)
-- e validade proxima (dentro de 15 dias, para testar o alerta
-- de "proximo do vencimento").
INSERT INTO lotes (medicamento_id, numero_lote, quantidade, data_validade) VALUES
    ((SELECT id FROM medicamentos WHERE nome = 'Paracetamol'), 'PCT2026A', 25, CURRENT_DATE + INTERVAL '15 days');

-- Amoxicilina: estoque normal e validade normal.
INSERT INTO lotes (medicamento_id, numero_lote, quantidade, data_validade) VALUES
    ((SELECT id FROM medicamentos WHERE nome = 'Amoxicilina'), 'AMX2026A', 200, CURRENT_DATE + INTERVAL '180 days');

-- Azitromicina: estoque baixo (abaixo do estoque_minimo = 30).
INSERT INTO lotes (medicamento_id, numero_lote, quantidade, data_validade) VALUES
    ((SELECT id FROM medicamentos WHERE nome = 'Azitromicina'), 'AZI2026A', 10, CURRENT_DATE + INTERVAL '200 days');

-- Ibuprofeno: estoque normal, validade normal.
INSERT INTO lotes (medicamento_id, numero_lote, quantidade, data_validade) VALUES
    ((SELECT id FROM medicamentos WHERE nome = 'Ibuprofeno'), 'IBU2026A', 150, CURRENT_DATE + INTERVAL '300 days');


-- ------------------------------------------------------------
-- 4) MOVIMENTACOES
--
-- Registra o historico: as ENTRADAS que geraram os lotes acima
-- e algumas SAIDAS para setores.
-- ------------------------------------------------------------

-- Entrada: compra do lote DIP2026A
INSERT INTO movimentacoes (medicamento_id, lote_id, setor_id, tipo, quantidade, motivo) VALUES
    (
        (SELECT id FROM medicamentos WHERE nome = 'Dipirona'),
        (SELECT id FROM lotes WHERE numero_lote = 'DIP2026A'),
        NULL,
        'ENTRADA',
        500,
        'Compra'
    );

-- Saida: Pronto Atendimento usou Dipirona do lote DIP2026A
INSERT INTO movimentacoes (medicamento_id, lote_id, setor_id, tipo, quantidade, motivo) VALUES
    (
        (SELECT id FROM medicamentos WHERE nome = 'Dipirona'),
        (SELECT id FROM lotes WHERE numero_lote = 'DIP2026A'),
        (SELECT id FROM setores WHERE nome = 'Pronto Atendimento'),
        'SAIDA',
        20,
        'Atendimento aos pacientes'
    );

-- Entrada: compra do lote PCT2026A (Paracetamol)
INSERT INTO movimentacoes (medicamento_id, lote_id, setor_id, tipo, quantidade, motivo) VALUES
    (
        (SELECT id FROM medicamentos WHERE nome = 'Paracetamol'),
        (SELECT id FROM lotes WHERE numero_lote = 'PCT2026A'),
        NULL,
        'ENTRADA',
        50,
        'Compra'
    );

-- Saida: UTI usou Paracetamol
INSERT INTO movimentacoes (medicamento_id, lote_id, setor_id, tipo, quantidade, motivo) VALUES
    (
        (SELECT id FROM medicamentos WHERE nome = 'Paracetamol'),
        (SELECT id FROM lotes WHERE numero_lote = 'PCT2026A'),
        (SELECT id FROM setores WHERE nome = 'UTI'),
        'SAIDA',
        25,
        'Atendimento aos pacientes'
    );
