# API REST

Base local: `http://127.0.0.1:4316/api`. JSON em requisições e respostas, exceto upload. Preço enviado como `price: "49.90"`; resposta usa `price_cents: 4990`. IDs inteiros positivos gerados pelo SQLite.

| Método | Rota | Uso |
|---|---|---|
| GET | /health | Disponibilidade |
| GET, POST | /products | Listar/criar produto |
| GET, PUT, DELETE | /products/:id | Consultar/substituir/excluir produto |
| GET, POST | /suppliers | Listar/criar fornecedor |
| GET, PUT, DELETE | /suppliers/:id | Consultar/substituir/excluir fornecedor |
| GET | /products/:id/suppliers | Fornecedores do produto |
| GET | /suppliers/:id/products | Produtos do fornecedor |
| POST, DELETE | /products/:productId/suppliers/:supplierId | Criar/remover vínculo |

GET nas listas aceita `?q=texto` para nome, código de barras ou CNPJ. A interface filtra o conjunto carregado. CNPJ na pesquisa da API deve ser informado sem pontuação. Respostas das listas incluem `link_count`; os detalhes incluem `created_at` e os campos armazenados.

POST/PUT de produto: `name`, `description`, `category` obrigatórios; `barcode` opcional, único e numérico; `quantity` inteiro >=0 (padrão 0), `price` decimal >=0 (padrão 0), `expiry_date` opcional YYYY-MM-DD. `remove_image: true` remove imagem atual. PUT substitui todos os campos do cadastro; campos obrigatórios devem ser reenviados.

Para imagem, envie multipart/form-data: campo de texto `data` contendo o JSON e arquivo `image`. O servidor valida o conteúdo e converte para WebP. Não define Content-Type manualmente no cliente multipart.

POST/PUT de fornecedor: `name`, `cnpj`, `address`, `phone`, `email`, `contact`, todos obrigatórios. CNPJ com ou sem pontuação; telefone com ou sem máscara. Ambos são normalizados.

Respostas: 201 criação, 200 leitura/edição, 204 exclusão (sem corpo), 400 dados inválidos, 403 origem de gravação bloqueada, 404 recurso/rota ausente, 409 conflito, 500 falha interna. Erro JSON: `{ "message": "Revise os campos destacados.", "fields": { "name": "Preencha este campo." } }`. `fields` aparece quando aplicável.
