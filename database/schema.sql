-- ============================================================
-- SIGEM - Sistema de Gestao de Medicamentos Hospitalares
-- schema.sql
--
-- Este arquivo cria todas as tabelas do sistema.
-- Ele NAO cria o banco de dados em si (isso e feito com
-- CREATE DATABASE, veja as instrucoes no README).
-- ============================================================


-- ------------------------------------------------------------
-- TABELA: medicamentos
--
-- Guarda o "cadastro" de cada tipo de medicamento (ex: Dipirona).
-- Aqui NAO fica a quantidade em estoque - isso fica na tabela
-- "lotes", porque um mesmo medicamento pode ter varios lotes
-- diferentes chegando em datas diferentes.
-- ------------------------------------------------------------
CREATE TABLE medicamentos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    principio_ativo VARCHAR(150) NOT NULL,
    dosagem VARCHAR(50) NOT NULL,
    forma_farmaceutica VARCHAR(50) NOT NULL,
    fabricante VARCHAR(150) NOT NULL,
    estoque_minimo INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Explicando as colunas:
--   id SERIAL PRIMARY KEY
--     -> SERIAL cria um numero inteiro que aumenta sozinho
--        (1, 2, 3, 4...) a cada novo medicamento inserido.
--        PRIMARY KEY diz que essa coluna identifica a linha
--        de forma unica.
--   estoque_minimo ... DEFAULT 0 CHECK (estoque_minimo >= 0)
--     -> Se ninguem informar um valor, o banco usa 0.
--        O CHECK impede que alguem cadastre um estoque minimo
--        negativo (isso nao faria sentido).
--   criado_em TIMESTAMP NOT NULL DEFAULT NOW()
--     -> NOW() e uma funcao do PostgreSQL que retorna a data
--        e hora atuais. Assim, sempre que um medicamento for
--        criado, essa coluna e preenchida automaticamente.


-- ------------------------------------------------------------
-- TABELA: setores
--
-- Guarda os setores do hospital que podem RECEBER medicamentos
-- em uma saida de estoque (ex: Farmacia, Pronto Atendimento,
-- UTI, Centro Cirurgico).
-- ------------------------------------------------------------
CREATE TABLE setores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

-- Explicando:
--   UNIQUE em "nome"
--     -> Impede cadastrar dois setores com o mesmo nome
--        (ex: nao pode ter dois setores chamados "UTI").


-- ------------------------------------------------------------
-- TABELA: lotes
--
-- Cada linha e um lote FISICO de um medicamento que chegou
-- ao hospital. Um mesmo medicamento (ex: Dipirona) pode ter
-- varios lotes, cada um com sua propria validade e quantidade.
-- ------------------------------------------------------------
CREATE TABLE lotes (
    id SERIAL PRIMARY KEY,
    medicamento_id INTEGER NOT NULL REFERENCES medicamentos(id),
    numero_lote VARCHAR(50) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    data_validade DATE NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Um mesmo medicamento nao pode ter dois lotes com o
    -- mesmo numero (mas medicamentos diferentes podem ter
    -- lotes com numeros iguais por coincidencia).
    UNIQUE (medicamento_id, numero_lote)
);

-- Explicando as partes novas:
--   medicamento_id INTEGER NOT NULL REFERENCES medicamentos(id)
--     -> Isso e uma FOREIGN KEY. A coluna medicamento_id guarda
--        o "id" de uma linha da tabela medicamentos. REFERENCES
--        diz "essa coluna aponta para a tabela medicamentos,
--        coluna id". E assim que ligamos as duas tabelas.
--        NOT NULL porque todo lote TEM que pertencer a um
--        medicamento - nao existe lote "sem dono".
--   UNIQUE (medicamento_id, numero_lote)
--     -> Essa e uma UNIQUE composta (envolve 2 colunas ao
--        mesmo tempo). Ela garante que a COMBINACAO das duas
--        colunas seja unica, e nao cada coluna sozinha.


-- ------------------------------------------------------------
-- TABELA: movimentacoes
--
-- Registra toda ENTRADA ou SAIDA de medicamentos do estoque.
-- E o "historico" do sistema.
-- ------------------------------------------------------------
CREATE TABLE movimentacoes (
    id SERIAL PRIMARY KEY,
    medicamento_id INTEGER NOT NULL REFERENCES medicamentos(id),
    lote_id INTEGER NOT NULL REFERENCES lotes(id),
    setor_id INTEGER REFERENCES setores(id),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    motivo VARCHAR(255),
    data_movimentacao TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Explicando as partes novas:
--   setor_id INTEGER REFERENCES setores(id)
--     -> Repare que aqui NAO tem NOT NULL. Isso e proposital:
--        numa ENTRADA de estoque (ex: compra de medicamento),
--        normalmente nao existe um "setor" envolvido, entao
--        deixamos essa coluna opcional.
--   tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA'))
--     -> O CHECK aqui funciona como uma "lista de valores
--        permitidos". So aceita o texto 'ENTRADA' ou 'SAIDA' -
--        qualquer outro valor e rejeitado pelo banco.
--   quantidade INTEGER NOT NULL CHECK (quantidade > 0)
--     -> Diferente do estoque_minimo (que pode ser 0), aqui
--        exigimos maior que 0, porque nao faz sentido registrar
--        uma movimentacao de 0 unidades.


-- ------------------------------------------------------------
-- INDICES (opcional, mas recomendado)
--
-- Indices aceleram buscas nas colunas mais consultadas.
-- Nao sao obrigatorios para o projeto funcionar, mas sao uma
-- boa pratica que vale a pena citar no trabalho.
-- ------------------------------------------------------------
CREATE INDEX idx_lotes_medicamento_id ON lotes(medicamento_id);
CREATE INDEX idx_movimentacoes_medicamento_id ON movimentacoes(medicamento_id);
CREATE INDEX idx_movimentacoes_lote_id ON movimentacoes(lote_id);
