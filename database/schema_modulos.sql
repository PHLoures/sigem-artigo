-- ============================================================
-- MODULOS ADICIONAIS - schema_modulos.sql
--
-- Alem do SIGEM (medicamentos), o site tera mais 3 sistemas
-- menores, todos ligados ao tema "precariedade hospitalar":
--
--   SIGLE - Gestao de Leitos
--   SIGEP - Escala de Profissionais
--   SIFEC - Fila de Espera para Cirurgias
--
-- Cada modulo usa o MESMO banco "sigem" (nao precisa criar um
-- banco separado para cada), so adiciona tabelas novas.
-- ============================================================


-- ------------------------------------------------------------
-- SIGLE - GESTAO DE LEITOS
-- ------------------------------------------------------------
CREATE TABLE leitos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(10) NOT NULL UNIQUE,
    setor VARCHAR(100) NOT NULL,

    -- ENUM e um tipo de coluna que so aceita uma lista fixa de
    -- valores - parecido com o CHECK que usamos no SIGEM, mas
    -- o MySQL tem um tipo proprio para isso.
    status ENUM('LIVRE', 'OCUPADO', 'MANUTENCAO') NOT NULL DEFAULT 'LIVRE',

    -- So preenchido quando o leito esta OCUPADO.
    paciente_nome VARCHAR(150) NULL,

    -- ON UPDATE CURRENT_TIMESTAMP: toda vez que a linha for
    -- atualizada (ex: mudar o status), essa coluna atualiza
    -- sozinha para a data/hora atual - nao precisamos fazer
    -- isso manualmente no codigo do backend.
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------
-- SIGEP - ESCALA DE PROFISSIONAIS
-- ------------------------------------------------------------

-- Cadastro de cada profissional de saude.
CREATE TABLE profissionais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cargo VARCHAR(80) NOT NULL,   -- Ex: Medico, Enfermeiro, Tecnico
    setor VARCHAR(100) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Cada linha e UM turno de UM profissional em UMA data.
-- Um mesmo profissional pode ter varias linhas (varios dias).
CREATE TABLE escalas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profissional_id INT NOT NULL,
    data_turno DATE NOT NULL,
    turno ENUM('MANHA', 'TARDE', 'NOITE') NOT NULL,
    setor VARCHAR(100) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Impede escalar o MESMO profissional duas vezes no MESMO
    -- turno do MESMO dia (evita cadastro duplicado por engano).
    UNIQUE (profissional_id, data_turno, turno),

    CONSTRAINT fk_escala_profissional
        FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
);


-- ------------------------------------------------------------
-- SIFEC - FILA DE ESPERA PARA CIRURGIAS
-- ------------------------------------------------------------
CREATE TABLE fila_cirurgias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_paciente VARCHAR(150) NOT NULL,
    procedimento VARCHAR(150) NOT NULL,

    -- Prioridade clinica - usada para ordenar a fila (URGENTE
    -- sempre aparece antes de BAIXA, independente da data).
    prioridade ENUM('BAIXA', 'MEDIA', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'MEDIA',

    status ENUM('AGUARDANDO', 'AGENDADA', 'REALIZADA') NOT NULL DEFAULT 'AGUARDANDO',

    data_entrada DATE NOT NULL DEFAULT (CURRENT_DATE),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
