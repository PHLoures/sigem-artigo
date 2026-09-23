-- ============================================================
-- seed_modulos.sql - dados ficticios dos modulos SIGLE/SIGEP/SIFEC
-- ============================================================


-- ------------------------------------------------------------
-- SIGLE - LEITOS
-- ------------------------------------------------------------
INSERT INTO leitos (numero, setor, status, paciente_nome) VALUES
    ('101-A', 'UTI', 'OCUPADO', 'Joao da Silva'),
    ('101-B', 'UTI', 'OCUPADO', 'Maria Oliveira'),
    ('102-A', 'UTI', 'LIVRE', NULL),
    ('201-A', 'Enfermaria', 'LIVRE', NULL),
    ('201-B', 'Enfermaria', 'OCUPADO', 'Carlos Souza'),
    ('202-A', 'Enfermaria', 'MANUTENCAO', NULL),
    ('301-A', 'Pronto Atendimento', 'OCUPADO', 'Ana Pereira'),
    ('301-B', 'Pronto Atendimento', 'LIVRE', NULL);


-- ------------------------------------------------------------
-- SIGEP - PROFISSIONAIS E ESCALAS
-- ------------------------------------------------------------
INSERT INTO profissionais (nome, cargo, setor) VALUES
    ('Dra. Fernanda Lima', 'Medico', 'UTI'),
    ('Dr. Ricardo Alves', 'Medico', 'Pronto Atendimento'),
    ('Enf. Juliana Costa', 'Enfermeiro', 'UTI'),
    ('Enf. Marcos Pereira', 'Enfermeiro', 'Enfermaria'),
    ('Tec. Beatriz Santos', 'Tecnico', 'Enfermaria');

-- CURDATE() = hoje. Criamos escalas para hoje e para os
-- proximos 2 dias, em turnos diferentes.
INSERT INTO escalas (profissional_id, data_turno, turno, setor) VALUES
    ((SELECT id FROM profissionais WHERE nome = 'Dra. Fernanda Lima'), CURDATE(), 'MANHA', 'UTI'),
    ((SELECT id FROM profissionais WHERE nome = 'Enf. Juliana Costa'), CURDATE(), 'MANHA', 'UTI'),
    ((SELECT id FROM profissionais WHERE nome = 'Dr. Ricardo Alves'), CURDATE(), 'NOITE', 'Pronto Atendimento'),
    ((SELECT id FROM profissionais WHERE nome = 'Enf. Marcos Pereira'), CURDATE() + INTERVAL 1 DAY, 'TARDE', 'Enfermaria'),
    ((SELECT id FROM profissionais WHERE nome = 'Tec. Beatriz Santos'), CURDATE() + INTERVAL 1 DAY, 'TARDE', 'Enfermaria'),
    ((SELECT id FROM profissionais WHERE nome = 'Dra. Fernanda Lima'), CURDATE() + INTERVAL 2 DAY, 'NOITE', 'UTI');


-- ------------------------------------------------------------
-- SIFEC - FILA DE ESPERA PARA CIRURGIAS
-- ------------------------------------------------------------
INSERT INTO fila_cirurgias (nome_paciente, procedimento, prioridade, status, data_entrada) VALUES
    ('Jose Ferreira', 'Apendicectomia', 'URGENTE', 'AGUARDANDO', CURDATE()),
    ('Helena Martins', 'Cirurgia de catarata', 'BAIXA', 'AGUARDANDO', CURDATE() - INTERVAL 20 DAY),
    ('Paulo Rodrigues', 'Colecistectomia', 'ALTA', 'AGENDADA', CURDATE() - INTERVAL 5 DAY),
    ('Sonia Barbosa', 'Protese de quadril', 'MEDIA', 'AGUARDANDO', CURDATE() - INTERVAL 10 DAY),
    ('Antonio Nunes', 'Cirurgia cardiaca', 'URGENTE', 'AGENDADA', CURDATE() - INTERVAL 1 DAY);
