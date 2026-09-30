# Gerenciamento de Eventos e Palestrantes

API REST em **Node.js + Express + Prisma** para cadastrar eventos e palestrantes,
alterar eventos e adicionar/remover palestrantes de um evento.

A API usa **SQLite** (o banco é um arquivo, `prisma/eventos.db`), então não é preciso
instalar nenhum servidor de banco para testar. O script **MySQL** com a estrutura, os
dados e as views do banco está em `database/eventos_db.sql`.

## Requisitos

- Node.js 18 ou superior

## Como executar

```bash
npm install
npm run setup
npm start
```

- `npm run setup` cria o banco e as tabelas, insere os dados de exemplo e cria as views.
  Pode ser executado de novo a qualquer momento para voltar aos dados iniciais.
- A API fica disponível em `http://localhost:3000/api`.

## Estrutura

```
database/eventos_db.sql   script MySQL do banco (estrutura, dados, views e consultas)
prisma/schema.prisma      modelo das tabelas para o Prisma
prisma/seed.js            dados de exemplo + criação das views
src/server.js             API
testes.http               requisições prontas para testar a API
```

## Rotas

| Método | Rota | Descrição |
|---|---|---|
| GET | /api/eventos | Lista eventos com seus palestrantes |
| GET | /api/eventos/:id | Busca um evento |
| POST | /api/eventos | Cadastra evento (`nome`, `descricao`, `local`) |
| PUT | /api/eventos/:id | Altera evento |
| DELETE | /api/eventos/:id | Exclui evento |
| POST | /api/eventos/:id/palestrantes | Adiciona palestrante ao evento (`id_palestrante`) |
| DELETE | /api/eventos/:id/palestrantes/:idPalestrante | Remove palestrante do evento |
| GET | /api/palestrantes | Lista palestrantes |
| POST | /api/palestrantes | Cadastra palestrante (`nome`, `email`) |
| PUT | /api/palestrantes/:id | Altera palestrante |
| DELETE | /api/palestrantes/:id | Exclui palestrante |
| GET | /api/relatorio | Lista eventos usando a view `vw_eventos_palestrantes` |

Todos os campos são obrigatórios: a API retorna **400** se algum faltar,
**409** para e-mail repetido ou palestrante já vinculado e **404** para registro inexistente.

## Testes

Abra `testes.http` no VS Code com a extensão **REST Client** e clique em
**Send Request** acima de cada requisição. Também é possível usar Postman, Insomnia ou Thunder Client.
