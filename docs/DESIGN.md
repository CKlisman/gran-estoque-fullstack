# Sistema de estoque — Projeto Integrador Gran

Data: 04/11/2026. Autor: Caio Klisman. Estado: aprovado pelo usuário em 04/11/2026; implementação concluída.

## Propósito e entrega

Construir uma aplicação fullstack acadêmica que permita cadastrar produtos e fornecedores, consultar seus dados e relacionar cada produto a vários fornecedores. A entrega será um repositório próprio no GitHub com código, README, instruções de execução e evidências reais das verificações. O endereço só será apresentado como disponível após confirmar a publicação.

O pedido do usuário autoriza criar o projeto. As escolhas abaixo são propostas técnicas baseadas nos dois textos de apoio anexados, não requisitos adicionais atribuídos ao usuário.

## Restrições e alternativas

- Tecnologias exigidas: backend Node.js, frontend React, banco inicial SQLite e três controladores/páginas: produtos, fornecedores e associações.
- Proposta recomendada: Express e React com Vite, num repositório com pastas `backend` e `frontend`. Mantém JavaScript e permite executar/testar cada parte separadamente. Vite substitui apenas a ferramenta de inicialização apresentada no material; as páginas continuam em React.
- Alternativa: Nest.js e React. O material permite Nest, mas sua estrutura e TypeScript acrescentam configuração para este escopo acadêmico.
- Alternativa: Next.js com serviço Node separado. Permitido pelo material, mas renderização no servidor não é necessária para as três telas de gestão.
- Pasta futura proposta: `C:/Users/caio.klisman/Documents/ChatGPT/Projeto Integrador Estoque`.
- Sem integração com Aprova T.I., Fiscalize ou dados das aplicações existentes. A interface será em português, para uso local acadêmico. Autenticação, cobrança, implantação pública do aplicativo e movimentação histórica de estoque ficam fora deste escopo.

## Comportamento e dados

### Produtos

Listar, pesquisar por nome/código, cadastrar, editar, consultar detalhes e excluir mediante confirmação. Nome, descrição e categoria obrigatórios. Código de barras opcional, composto de dígitos quando preenchido e único; campo vazio é armazenado como nulo, permitindo mais de um produto sem código. Quantidade inteira não negativa, com padrão zero. Preço não negativo com duas casas decimais, incluído porque a fase 2 o menciona; não haverá campo de preço de custo separado. Categoria em seleção com opção Outro e texto obrigatório nesse caso. Validade opcional, validada como data real. Imagem opcional enviada pelo formulário, limitada a PNG/JPEG/WebP de até 2 MB; arquivo validado e armazenado localmente, com nome gerado pelo servidor. Não aceitar SVG nem caminhos fornecidos pelo usuário.

Duplicidade de código retorna conflito e a mensagem do enunciado: “Produto com este código de barras já está cadastrado!”. Erros de preenchimento são apresentados junto aos campos. Sucesso: “Produto cadastrado com sucesso!”.

### Fornecedores

Listar, pesquisar, cadastrar, editar, consultar detalhes e excluir mediante confirmação. Nome da empresa, CNPJ, endereço, telefone, e-mail e contato principal obrigatórios. CNPJ no formato numérico de 14 dígitos previsto pelo protótipo, com normalização, validação dos dígitos verificadores e unicidade. Este recorte acadêmico não cobre CNPJ alfanumérico. Telefone aceita 10 ou 11 dígitos; e-mail precisa de formato válido. Espaços isolados não satisfazem campos obrigatórios.

Duplicidade após normalização retorna “Fornecedor com esse CNPJ já está cadastrado!”. Sucesso: “Fornecedor cadastrado com sucesso!”.

### Associações

Na terceira página, selecionar um produto, consultar seus detalhes e fornecedores associados, escolher um fornecedor e clicar em “Associar Fornecedor”. Criar vínculo somente se ambos existirem. Relação muitos para muitos com chave composta única. Duplicidade retorna “Fornecedor já está associado a este produto!”. Sucesso: “Fornecedor associado com sucesso ao produto!”. A ação “Desassociar” remove apenas o vínculo e retorna “Fornecedor desassociado com sucesso!”.

Permitir também selecionar um fornecedor e consultar os produtos vinculados, atendendo a consulta nos dois sentidos. Excluir produto ou fornecedor remove seus vínculos na mesma transação, preservando o outro cadastro. O diálogo de exclusão informa a quantidade de vínculos afetados.

## Arquitetura proposta

`backend/app.js` inicia o servidor. `backend/src/app.js` configura Express e exporta a aplicação para testes. Três controladores ficam em `backend/src/controllers`; conexão, criação de tabelas e consultas ficam em `backend/src/db`. Validações ficam em módulo próprio. Consultas sempre parametrizadas e chaves estrangeiras habilitadas. Banco, uploads e dependências ficam fora do Git.

`frontend/src` contém o cliente HTTP, componentes de formulário/tabela, navegação e as três páginas. O proxy local encaminha `/api` e `/uploads` ao backend; a versão compilada pode ser servida pelo mesmo processo Node. Requisições tratam falha de rede, erros de validação e respostas de conflito. Formulários preservam valores quando falham; ações de gravação ficam desabilitadas durante o envio.

Tabelas: `products` (id e campos do produto), `suppliers` (id e campos do fornecedor), `product_suppliers` (product_id, supplier_id, created_at). IDs positivos inteiros. Preço armazenado em centavos. Criar dados demonstrativos apenas por comando explícito e identificá-los como fictícios.

API: `/api/products` e `/api/suppliers` com GET/POST; `/:id` com GET/PUT/DELETE. `/api/products/:id/suppliers` e `/api/suppliers/:id/products` consultam vínculos. POST/DELETE em `/api/products/:productId/suppliers/:supplierId` criam/removem associação. `/api/health` verifica disponibilidade. HTTP 201 para criação, 200 para consulta/edição, 204 para exclusão, 400 para dados inválidos, 404 para registro ausente e 409 para duplicidade. JSON de erro com `message` e `fields` quando pertinente, sem expor detalhes internos.

## Interface proposta

Nome visível: “Estoque”. Navegação lateral com Produtos, Fornecedores e Associações; cabeçalho com título da página e ação principal. Listas em tabelas legíveis, formulários em painel próprio e contadores discretos acima da lista. Em celular, navegação superior e listas adaptadas, sem esconder ações essenciais.

Paleta: fundo #F4F6F3, texto #19332B, verde principal #235C45, bordas #D3DED6, alerta #9B3A28 e branco #FFFFFF. Fonte de sistema Segoe UI/Arial para leitura sem downloads. Alinhamento à esquerda, espaçamento consistente e bordas suaves apenas em painéis e controles. O destaque visual é a relação entre produto e fornecedor na terceira tela; evitar um painel inicial decorativo que duplique as listas.

Todos os campos têm rótulo, erro associado, indicação de obrigatoriedade e foco visível. Mensagens de status são anunciadas a leitores de tela. Confirmações e formulários devem funcionar por teclado. Estados vazios explicam como cadastrar o primeiro registro.

## Etapas e critérios de aceitação

1. API e SQLite: criar os três controladores, schema, validações e testes HTTP com banco temporário. Verificar CRUD, persistência após reabrir banco, duplicidades normalizadas, campos inválidos, IDs inexistentes, negativos, tentativa de injeção como texto, e remoção de vínculos na exclusão.
2. React: implementar as três telas consumindo a API, estados de envio/erro, pesquisa, edição, exclusão, upload e consulta de vínculos nos dois sentidos. Verificar no navegador um fluxo completo: criar fornecedor/produto, editar, associar, recusar duplicidade, desassociar e excluir. Conferir teclado e largura de celular. Executar build.
3. Entrega: README começa com “FACULDADE GRAN” e “Projeto Disciplina Projeto Integrador”; incluir instalação, comandos, requisitos de Node, API, dados fictícios, arquitetura, limites e roteiro de demonstração. Incluir coleção Postman compatível com importação no Insomnia. Registrar resultados reais em `PROJECT_STATE.md`, `MODEL_HANDOFF.md`, `DECISIONS.md` e `CHANGELOG.md` do novo projeto.
4. GitHub: revisar a lista de arquivos, excluir banco local/uploads/dados pessoais e publicar o projeto próprio quando a autorização aplicável estiver atendida. Confirmar arquivos remotos e README antes de entregar o link para Gran. Não confundir repositório publicado com hospedagem do aplicativo.

## Situação atual

Os textos de apoio foram lidos. Node v24.16.0, npm 11.13.0 e Git 2.54.0 estão disponíveis. Implementação concluída conforme este desenho aprovado. Testes: 8 grupos HTTP, 3 fluxos de navegador e build aprovados. Repositório GitHub publicado; consulte PROJECT_STATE.md.
