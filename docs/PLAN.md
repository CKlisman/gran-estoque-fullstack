# Plano de implementação — Estoque

Desenho aprovado pelo usuário em 04/11/2026. Execução direta nesta sessão.
Spec: docs/DESIGN.md. Objetivo: aplicação local Node/Express, React/Vite e SQLite, com três controladores e páginas.

## Restrições
JavaScript, Node 24, dados fictícios por comando explícito, uploads locais de até 2 MB. Sem login ou hospedagem pública do aplicativo. Projeto separado do Aprova T.I.

## Tarefas
- [ ] API: `backend/src/db/index.js` cria SQLite; `validation.js` valida campos; três controllers e `app.js` expõem rotas. Interface `createApp({dbPath, uploadDir})` retorna `{app, db}`. Testar CRUD, persistência, conflitos, vínculos, IDs/valores inválidos e uploads com supertest (`npm test`).
- [ ] Interface: cliente HTTP, componentes de formulário/diálogo, páginas de cadastros e associações. Teste Playwright cria, edita, associa, desassocia e exclui; conferir celular e teclado. Build `npm run build` deve retornar zero.
- [ ] Entrega: README, coleção Postman, screenshots reais e registros de continuidade; Git local e publicação com arquivos explicitamente selecionados. Confirmar árvore remota antes do link final.

## Foco de revisão
1. Código de barras vazio não causa duplicidade.
2. CNPJ formatado duplicado é detectado após normalização.
3. Excluir cadastro não exclui cadastro relacionado.
4. Arquivo inválido ou falha de validação não deixa upload órfão.
5. Erro de rede mantém dados do formulário e permite tentar novamente.

Cada tarefa terá evidência real registrada em PROJECT_STATE.md; não alegar testes ou publicação antes de confirmá-los.
