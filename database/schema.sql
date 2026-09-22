-- ============================================================
-- SIGEM - Sistema de Gestao de Medicamentos Hospitalares
-- schema.sql (versao MySQL)
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
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    principio_ativo VARCHAR(150) NOT NULL,
    dosagem VARCHAR(50) NOT NULL,
    forma_farmaceutica VARCHAR(50) NOT NULL,
    fabricante VARCHAR(150) NOT NULL,
    estoque_minimo INT NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Explicando as colunas (diferencas do MySQL para o PostgreSQL):
--   id INT AUTO_INCREMENT PRIMARY KEY
--     -> No PostgreSQL usavamos "SERIAL". No MySQL o equivalente
--        e "INT AUTO_INCREMENT": um numero inteiro que aumenta
--        sozinho (1, 2, 3, 4...) a cada nova linha inserida.
--        PRIMARY KEY diz que essa coluna identifica a linha
--        de forma unica.
--   estoque_minimo ... DEFAULT 0 CHECK (estoque_minimo >= 0)
--     -> Se ninguem informar um valor, o banco usa 0.
--        O CHECK impede que alguem cadastre um estoque minimo
--        negativo. (O MySQL so passou a aplicar CHECK de verdade
--        a partir da versao 8 - versoes antigas aceitavam o
--        comando mas ignoravam a regra.)
--   criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
--     -> No PostgreSQL usavamos a funcao NOW(). No MySQL o
--        equivalente mais comum e CURRENT_TIMESTAMP. As duas
--        fazem a mesma coisa: preenchem a data/hora atual
--        automaticamente quando a linha e criada.


-- ------------------------------------------------------------
-- TABELA: setores
--
-- Guarda os setores do hospital que podem RECEBER medicamentos
-- em uma saida de estoque (ex: Farmacia, Pronto Atendimento,
-- UTI, Centro Cirurgico).
-- ------------------------------------------------------------
CREATE TABLE setores (
    id INT AUTO_INCREMENT PRIMARY KEY,
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
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicamento_id INT NOT NULL,
    numero_lote VARCHAR(50) NOT NULL,
    quantidade INT NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    data_validade DATE NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Um mesmo medicamento nao pode ter dois lotes com o
    -- mesmo numero (mas medicamentos diferentes podem ter
    -- lotes com numeros iguais por coincidencia).
    UNIQUE (medicamento_id, numero_lote),

    -- FOREIGN KEY no MySQL precisa ser declarada com a palavra
    -- "CONSTRAINT ... FOREIGN KEY ... REFERENCES", diferente do
    -- PostgreSQL que aceita "REFERENCES" direto na coluna.
    CONSTRAINT fk_lotes_medicamento
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
);

-- Explicando as partes novas:
--   CONSTRAINT fk_lotes_medicamento FOREIGN KEY (medicamento_id)
--   REFERENCES medicamentos(id)
--     -> Isso e uma FOREIGN KEY. A coluna medicamento_id guarda
--        o "id" de uma linha da tabela medicamentos. Damos um
--        NOME para essa restricao (fk_lotes_medicamento) porque
--        o MySQL exige/recomenda nomear FOREIGN KEYs quando
--        declaradas dessa forma. E assim que ligamos as tabelas.
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
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicamento_id INT NOT NULL,
    lote_id INT NOT NULL,
    setor_id INT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    quantidade INT NOT NULL CHECK (quantidade > 0),
    motivo VARCHAR(255),
    data_movimentacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mov_medicamento
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id),
    CONSTRAINT fk_mov_lote
        FOREIGN KEY (lote_id) REFERENCES lotes(id),
    CONSTRAINT fk_mov_setor
        FOREIGN KEY (setor_id) REFERENCES setores(id)
);

-- Explicando as partes novas:
--   setor_id INT NULL
--     -> Repare que aqui e NULL (opcional), nao NOT NULL. Isso e
--        proposital: numa ENTRADA de estoque (ex: compra de
--        medicamento), normalmente nao existe um "setor"
--        envolvido, entao deixamos essa coluna opcional.
--   tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA'))
--     -> O CHECK aqui funciona como uma "lista de valores
--        permitidos". So aceita o texto 'ENTRADA' ou 'SAIDA' -
--        qualquer outro valor e rejeitado pelo banco.
--   quantidade INT NOT NULL CHECK (quantidade > 0)
--     -> Diferente do estoque_minimo (que pode ser 0), aqui
--        exigimos maior que 0, porque nao faz sentido registrar
--        uma movimentacao de 0 unidades.


-- ------------------------------------------------------------
-- INDICES (opcional, mas recomendado)
--
-- Indices aceleram buscas nas colunas mais consultadas.
-- No MySQL, toda FOREIGN KEY ja cria um indice automaticamente,
-- entao aqui criamos so os que achamos uteis a mais.
-- ------------------------------------------------------------
CREATE INDEX idx_movimentacoes_data ON movimentacoes(data_movimentacao);
