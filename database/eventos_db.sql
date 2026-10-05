
DROP VIEW  IF EXISTS vw_palestrantes_eventos;
DROP VIEW  IF EXISTS vw_evento_palestrante_detalhe;
DROP VIEW  IF EXISTS vw_eventos_palestrantes;
DROP TABLE IF EXISTS evento_palestrante;
DROP TABLE IF EXISTS palestrante;
DROP TABLE IF EXISTS evento;

CREATE TABLE evento (
    id_evento   INT          NOT NULL AUTO_INCREMENT,
    nome        VARCHAR(100) NOT NULL,
    descricao   VARCHAR(255) NOT NULL,
    `local`     VARCHAR(150) NOT NULL,
    CONSTRAINT pk_evento PRIMARY KEY (id_evento),
    CONSTRAINT ck_evento_nome      CHECK (CHAR_LENGTH(TRIM(nome)) > 0),
    CONSTRAINT ck_evento_descricao CHECK (CHAR_LENGTH(TRIM(descricao)) > 0),
    CONSTRAINT ck_evento_local     CHECK (CHAR_LENGTH(TRIM(`local`)) > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Tabela PALESTRANTE
CREATE TABLE palestrante (
    id_palestrante INT          NOT NULL AUTO_INCREMENT,
    nome           VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL,
    CONSTRAINT pk_palestrante PRIMARY KEY (id_palestrante),
    CONSTRAINT uk_palestrante_email UNIQUE (email),
    CONSTRAINT ck_palestrante_nome  CHECK (CHAR_LENGTH(TRIM(nome)) > 0),
    CONSTRAINT ck_palestrante_email CHECK (email LIKE '_%@_%._%')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE evento_palestrante (
    id_evento      INT NOT NULL,
    id_palestrante INT NOT NULL,
    CONSTRAINT pk_evento_palestrante PRIMARY KEY (id_evento, id_palestrante),
    CONSTRAINT fk_ep_evento FOREIGN KEY (id_evento)
        REFERENCES evento (id_evento)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ep_palestrante FOREIGN KEY (id_palestrante)
        REFERENCES palestrante (id_palestrante)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_ep_palestrante (id_palestrante)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO evento (nome, descricao, `local`) VALUES
    ('Semana de Tecnologia 2026', 'Palestras sobre desenvolvimento web, nuvem e inteligência artificial.', 'Auditório Central - Bloco A'),
    ('Encontro de Banco de Dados', 'Modelagem, SQL avançado e boas práticas em bancos relacionais.', 'Sala 204 - Bloco B'),
    ('Workshop Node.js e Prisma', 'Construção de APIs REST com Node.js, Express e Prisma ORM.', 'Laboratório de Informática 3'),
    ('Fórum de Carreira em TI', 'Bate-papo com profissionais sobre mercado de trabalho e carreira.', 'Centro de Convenções');

INSERT INTO palestrante (nome, email) VALUES
    ('Ana Souza',       'ana.souza@email.com'),
    ('Bruno Lima',      'bruno.lima@email.com'),
    ('Carla Mendes',    'carla.mendes@email.com'),
    ('Diego Ferreira',  'diego.ferreira@email.com'),
    ('Eduarda Rocha',   'eduarda.rocha@email.com');

INSERT INTO evento_palestrante (id_evento, id_palestrante) VALUES
    (1, 1), (1, 2), (1, 3),
    (2, 3), (2, 4),
    (3, 2), (3, 5),
    (4, 1), (4, 4), (4, 5);


-- View: eventos com a lista de palestrantes
CREATE VIEW vw_eventos_palestrantes AS
SELECT
    e.id_evento,
    e.nome        AS evento,
    e.descricao,
    e.`local`,
    COUNT(p.id_palestrante) AS qtd_palestrantes,
    COALESCE(
        GROUP_CONCAT(p.nome ORDER BY p.nome SEPARATOR ', '),
        'Nenhum palestrante'
    ) AS palestrantes
FROM evento e
LEFT JOIN evento_palestrante ep ON ep.id_evento = e.id_evento
LEFT JOIN palestrante p         ON p.id_palestrante = ep.id_palestrante
GROUP BY e.id_evento, e.nome, e.descricao, e.`local`;

CREATE VIEW vw_evento_palestrante_detalhe AS
SELECT
    e.id_evento,
    e.nome  AS evento,
    e.`local`,
    p.id_palestrante,
    p.nome  AS palestrante,
    p.email
FROM evento_palestrante ep
INNER JOIN evento e      ON e.id_evento = ep.id_evento
INNER JOIN palestrante p ON p.id_palestrante = ep.id_palestrante;

CREATE VIEW vw_palestrantes_eventos AS
SELECT
    p.id_palestrante,
    p.nome,
    p.email,
    COUNT(ep.id_evento) AS qtd_eventos
FROM palestrante p
LEFT JOIN evento_palestrante ep ON ep.id_palestrante = p.id_palestrante
GROUP BY p.id_palestrante, p.nome, p.email;

SELECT * FROM vw_eventos_palestrantes ORDER BY id_evento;
SELECT * FROM vw_evento_palestrante_detalhe ORDER BY evento, palestrante;
SELECT * FROM vw_palestrantes_eventos ORDER BY nome;
