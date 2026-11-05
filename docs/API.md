# API REST

Base local: `http://127.0.0.1:4316/api`. JSON em requisições e respostas, exceto upload. Preço enviado como `price: "49.90"`; resposta usa `price_cents: 4990`. IDs inteiros positivos gerados pelo SQLite.

| Método | Rota | Uso |
|---|---|---|
| GET | /health | Disponibilidade |
| GET | /reports/stock-summary | Novo: indicadores do estoque em JSON |
| GET | /reports/stock.csv | Novo: exportação do estoque em CSV |
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

## Fase 3 — duas novas chamadas de relatórios

Base pública: `https://gran-estoque-fullstack.onrender.com/api`.

### GET /reports/stock-summary

Retorna HTTP 200 e JSON com `filters`, `totals` e `categories`. Os indicadores são `product_count`, `total_quantity`, `total_value_cents`, `out_of_stock_count` e `low_stock_count`. Cada categoria inclui os mesmos indicadores e o nome `category`.

`total_value_cents` é **string de centavos**, para preservar cálculos monetários exatos até para totais acima da precisão de números JSON. Exemplo: `"26290"` corresponde a R$ 262,90. O valor é a soma de quantidade × preço cadastrado, sem depreciação. Quantidades são somadas conforme os cadastros, sem conversão de unidades de medida.

### GET /reports/stock.csv

Retorna HTTP 200, `Content-Type: text/csv; charset=utf-8` e download `estoque.csv`. UTF-8 com BOM; delimitador `;`; campos entre aspas; preços em reais com vírgula decimal. Colunas: `id`, `nome`, `categoria`, `codigo_barras`, `quantidade`, `valor_unitario_reais`, `valor_total_reais`, `validade`, `cadastrado_em`. Importar a coluna de código de barras como texto para preservar zeros iniciais. Textos que poderiam ser interpretados como fórmulas recebem apóstrofo de proteção.

### Filtros compartilhados (opcionais)

| Parâmetro | Regra |
|---|---|
| `q` | Até 100 caracteres; busca por nome ou código de barras; `%` e `_` são literais |
| `category` | Até 100 caracteres; categoria exata |
| `stock` | `all` (padrão), `low` (positivo até o limite), `out` (zerado) |
| `threshold` | Inteiro entre 0 e 1.000.000.000; padrão 5 |

O limite é parâmetro de análise, não estoque mínimo salvo por produto. Os indicadores se referem apenas aos registros selecionados pelos filtros. Filtros inválidos/desconhecidos ou repetidos retornam HTTP 400. Banco vazio ou filtro sem resultados: JSON com totais zerados e CSV apenas com o cabeçalho, ambos HTTP 200.

Exemplos:

```sh
curl -i "https://gran-estoque-fullstack.onrender.com/api/reports/stock-summary"
curl -o estoque.csv "https://gran-estoque-fullstack.onrender.com/api/reports/stock.csv"
curl -i "https://gran-estoque-fullstack.onrender.com/api/reports/stock-summary?stock=low&threshold=5"
```

As duas rotas são somente leitura e não requerem autenticação, conforme o escopo acadêmico. Nenhuma integração ou alteração foi feita no SGA oficial.
