const express = require("express");
const path = require("path");
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// libera a API para as telas abertas pelo Live Server (porta 5500)
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// telas do sistema (index.html é o gerenciador)
const PASTA_PUBLIC = path.join(__dirname, "..", "public");
app.use(express.static(PASTA_PUBLIC));
// aceita também http://localhost:3000/public/evento.html
app.use("/public", express.static(PASTA_PUBLIC));

const CAMPOS_EVENTO = { nome: 100, descricao: 255, local: 150 };
const CAMPOS_PALESTRANTE = { nome: 100, email: 150 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(body = {}, campos) {
  const dados = {};
  const erros = [];
  for (const [campo, max] of Object.entries(campos)) {
    const valor = typeof body[campo] === "string" ? body[campo].trim() : "";
    if (!valor) erros.push(`O campo "${campo}" é obrigatório.`);
    else if (valor.length > max)
      erros.push(`O campo "${campo}" aceita no máximo ${max} caracteres.`);
    dados[campo] = valor;
  }
  if ("email" in campos && dados.email && !EMAIL_RE.test(dados.email)) {
    erros.push("Informe um e-mail válido.");
  }
  return { dados, erros };
}

function lerId(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// a tela sempre manda o id_palestrante, mas pela API ele é opcional
// undefined = não veio | null = veio inválido
function lerPalestrante(body = {}) {
  if (body.id_palestrante === undefined) return undefined;
  return lerId(body.id_palestrante);
}

const INCLUIR_PALESTRANTES = {
  palestrantes: {
    include: { palestrante: true },
    orderBy: { palestrante: { nome: "asc" } },
  },
};

function formatarEvento(evento) {
  const { palestrantes, ...resto } = evento;
  return { ...resto, palestrantes: palestrantes.map((ep) => ep.palestrante) };
}

app.get("/api/eventos", async (req, res) => {
  const eventos = await prisma.evento.findMany({
    include: INCLUIR_PALESTRANTES,
    orderBy: { id_evento: "asc" },
  });
  res.json(eventos.map(formatarEvento));
});

app.get("/api/eventos/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de evento inválido." });

  const evento = await prisma.evento.findUnique({
    where: { id_evento: id },
    include: INCLUIR_PALESTRANTES,
  });
  if (!evento) return res.status(404).json({ erro: "Evento não encontrado." });
  res.json(formatarEvento(evento));
});

app.post("/api/eventos", async (req, res) => {
  const { dados, erros } = validar(req.body, CAMPOS_EVENTO);
  const idPalestrante = lerPalestrante(req.body);
  if (idPalestrante === null) erros.push("Selecione um palestrante válido.");
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

  if (idPalestrante) {
    dados.palestrantes = { create: { id_palestrante: idPalestrante } };
  }

  const evento = await prisma.evento.create({
    data: dados,
    include: INCLUIR_PALESTRANTES,
  });
  res.status(201).json(formatarEvento(evento));
});

app.put("/api/eventos/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de evento inválido." });

  const { dados, erros } = validar(req.body, CAMPOS_EVENTO);
  const idPalestrante = lerPalestrante(req.body);
  if (idPalestrante === null) erros.push("Selecione um palestrante válido.");
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

  const operacoes = [
    prisma.evento.update({ where: { id_evento: id }, data: dados }),
  ];

  if (idPalestrante) {
    // a tela de edição tem um palestrante só, então troca o vínculo pelo escolhido
    operacoes.push(
      prisma.eventoPalestrante.deleteMany({ where: { id_evento: id } }),
      prisma.eventoPalestrante.create({
        data: { id_evento: id, id_palestrante: idPalestrante },
      }),
    );
  }

  await prisma.$transaction(operacoes);

  const evento = await prisma.evento.findUnique({
    where: { id_evento: id },
    include: INCLUIR_PALESTRANTES,
  });
  res.json(formatarEvento(evento));
});

app.delete("/api/eventos/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de evento inválido." });

  await prisma.evento.delete({ where: { id_evento: id } });
  res.status(204).end();
});

app.post("/api/eventos/:id/palestrantes", async (req, res) => {
  const idEvento = lerId(req.params.id);
  const idPalestrante = lerId(req.body?.id_palestrante);
  if (!idEvento || !idPalestrante) {
    return res
      .status(400)
      .json({ erro: "Selecione um evento e um palestrante válidos." });
  }

  try {
    await prisma.eventoPalestrante.create({
      data: { id_evento: idEvento, id_palestrante: idPalestrante },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ erro: "Este palestrante já está no evento." });
    }
    throw err;
  }

  const evento = await prisma.evento.findUnique({
    where: { id_evento: idEvento },
    include: INCLUIR_PALESTRANTES,
  });
  res.status(201).json(formatarEvento(evento));
});

app.delete("/api/eventos/:id/palestrantes/:idPalestrante", async (req, res) => {
  const idEvento = lerId(req.params.id);
  const idPalestrante = lerId(req.params.idPalestrante);
  if (!idEvento || !idPalestrante) {
    return res.status(400).json({ erro: "IDs inválidos." });
  }

  await prisma.eventoPalestrante.delete({
    where: {
      id_evento_id_palestrante: {
        id_evento: idEvento,
        id_palestrante: idPalestrante,
      },
    },
  });
  res.status(204).end();
});
app.get("/api/relatorio", async (req, res) => {
  const linhas =
    await prisma.$queryRaw`SELECT * FROM vw_eventos_palestrantes ORDER BY id_evento`;

  const semBigInt = (linha) =>
    Object.fromEntries(
      Object.entries(linha).map(([campo, valor]) => [
        campo,
        typeof valor === "bigint" ? Number(valor) : valor,
      ]),
    );
  res.json(linhas.map(semBigInt));
});

app.get("/api/palestrantes", async (req, res) => {
  const palestrantes = await prisma.palestrante.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { eventos: true } } },
  });
  res.json(
    palestrantes.map(({ _count, ...p }) => ({
      ...p,
      qtd_eventos: _count.eventos,
    })),
  );
});

app.post("/api/palestrantes", async (req, res) => {
  const { dados, erros } = validar(req.body, CAMPOS_PALESTRANTE);
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

  const palestrante = await prisma.palestrante.create({ data: dados });
  res.status(201).json(palestrante);
});

app.put("/api/palestrantes/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de palestrante inválido." });

  const { dados, erros } = validar(req.body, CAMPOS_PALESTRANTE);
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

  const palestrante = await prisma.palestrante.update({
    where: { id_palestrante: id },
    data: dados,
  });
  res.json(palestrante);
});

app.delete("/api/palestrantes/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID de palestrante inválido." });

  await prisma.palestrante.delete({ where: { id_palestrante: id } });
  res.status(204).end();
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ erro: "JSON inválido no corpo da requisição." });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002")
      return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
    if (err.code === "P2025")
      return res.status(404).json({ erro: "Registro não encontrado." });
    if (err.code === "P2003")
      return res
        .status(400)
        .json({ erro: "Evento ou palestrante inexistente." });
  }
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
