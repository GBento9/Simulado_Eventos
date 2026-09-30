const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.eventoPalestrante.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.palestrante.deleteMany();

  await prisma.evento.createMany({
    data: [
      { id_evento: 1, nome: 'Semana de Tecnologia 2026', descricao: 'Palestras sobre desenvolvimento web, nuvem e inteligência artificial.', local: 'Auditório Central - Bloco A' },
      { id_evento: 2, nome: 'Encontro de Banco de Dados', descricao: 'Modelagem, SQL avançado e boas práticas em bancos relacionais.', local: 'Sala 204 - Bloco B' },
      { id_evento: 3, nome: 'Workshop Node.js e Prisma', descricao: 'Construção de APIs REST com Node.js, Express e Prisma ORM.', local: 'Laboratório de Informática 3' },
      { id_evento: 4, nome: 'Fórum de Carreira em TI', descricao: 'Bate-papo com profissionais sobre mercado de trabalho e carreira.', local: 'Centro de Convenções' },
    ],
  });

  await prisma.palestrante.createMany({
    data: [
      { id_palestrante: 1, nome: 'Ana Souza', email: 'ana.souza@email.com' },
      { id_palestrante: 2, nome: 'Bruno Lima', email: 'bruno.lima@email.com' },
      { id_palestrante: 3, nome: 'Carla Mendes', email: 'carla.mendes@email.com' },
      { id_palestrante: 4, nome: 'Diego Ferreira', email: 'diego.ferreira@email.com' },
      { id_palestrante: 5, nome: 'Eduarda Rocha', email: 'eduarda.rocha@email.com' },
    ],
  });

  await prisma.eventoPalestrante.createMany({
    data: [
      { id_evento: 1, id_palestrante: 1 }, { id_evento: 1, id_palestrante: 2 }, { id_evento: 1, id_palestrante: 3 },
      { id_evento: 2, id_palestrante: 3 }, { id_evento: 2, id_palestrante: 4 },
      { id_evento: 3, id_palestrante: 2 }, { id_evento: 3, id_palestrante: 5 },
      { id_evento: 4, id_palestrante: 1 }, { id_evento: 4, id_palestrante: 4 }, { id_evento: 4, id_palestrante: 5 },
    ],
  });

  // Views (mesma ideia das views do database/eventos_db.sql)
  await prisma.$executeRawUnsafe('DROP VIEW IF EXISTS vw_eventos_palestrantes');
  await prisma.$executeRawUnsafe(`
    CREATE VIEW vw_eventos_palestrantes AS
    SELECT e.id_evento, e.nome AS evento, e.descricao, e.local,
           COUNT(p.id_palestrante) AS qtd_palestrantes,
           COALESCE(GROUP_CONCAT(p.nome, ', '), 'Nenhum palestrante') AS palestrantes
    FROM evento e
    LEFT JOIN evento_palestrante ep ON ep.id_evento = e.id_evento
    LEFT JOIN palestrante p ON p.id_palestrante = ep.id_palestrante
    GROUP BY e.id_evento, e.nome, e.descricao, e.local`);

  await prisma.$executeRawUnsafe('DROP VIEW IF EXISTS vw_evento_palestrante_detalhe');
  await prisma.$executeRawUnsafe(`
    CREATE VIEW vw_evento_palestrante_detalhe AS
    SELECT e.id_evento, e.nome AS evento, e.local,
           p.id_palestrante, p.nome AS palestrante, p.email
    FROM evento_palestrante ep
    INNER JOIN evento e ON e.id_evento = ep.id_evento
    INNER JOIN palestrante p ON p.id_palestrante = ep.id_palestrante`);

  await prisma.$executeRawUnsafe('DROP VIEW IF EXISTS vw_palestrantes_eventos');
  await prisma.$executeRawUnsafe(`
    CREATE VIEW vw_palestrantes_eventos AS
    SELECT p.id_palestrante, p.nome, p.email, COUNT(ep.id_evento) AS qtd_eventos
    FROM palestrante p
    LEFT JOIN evento_palestrante ep ON ep.id_palestrante = p.id_palestrante
    GROUP BY p.id_palestrante, p.nome, p.email`);

  console.log('Banco pronto: 4 eventos, 5 palestrantes e 3 views criadas.');
}

main()
  .catch((erro) => {
    console.error('Erro ao popular o banco:', erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
