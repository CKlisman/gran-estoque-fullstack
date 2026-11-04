# Estado do projeto

04/11/2026 — Caio Klisman. Desenho aprovado no chat. Projeto criado em pasta própria.

Concluídos: API Node/Express, SQLite, três controladores, três páginas React, validações, upload convertido em WebP, relações muitos para muitos, pesquisa e detalhes. README, coleção Postman, demonstração explícita e quatro capturas reais com dados fictícios.

Verificado: 8 grupos de testes HTTP passaram; 3 testes Playwright passaram; build Vite passou; npm audit de produção retornou zero vulnerabilidades. Corrigidos o retorno de foco ao fechar diálogo e o overflow horizontal da página em celular. Execução local em Windows/Node 24.16.0; CI Linux definido, ainda sem execução remota confirmada.

Publicado: https://github.com/CKlisman/gran-estoque-fullstack — 40 arquivos em main, conteúdo remoto conferido com a versão testada (textos equivalentes após normalizar CRLF/LF; quatro imagens idênticas). Aplicativo para uso local, sem hospedagem pública.

Revisão independente final concluída: um achado importante de concorrência em upload corrigido. Teste de regressão observado falhando e passando após releitura do produto depois da conversão. Suíte final: 8/8 HTTP e 3/3 navegador; sem achados pendentes registrados. Publicação confirmada.
