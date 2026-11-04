# Decisões

- 04/11/2026: Node 24 com SQLite nativo, Express e React/Vite conforme desenho aprovado; Vite muda a inicialização do material, preservando React e API separada.
- SQLite local, consultas parametrizadas, dinheiro em centavos e exclusão de vínculos por chaves estrangeiras. Barcode opcional normalizado para NULL. CNPJ numérico validado e normalizado.
- Upload de até 2 MB/20 MP, decodificado por Sharp e convertido para WebP; arquivos e banco fora do Git. Sharp atualizado para 0.35.5 após aviso na instalação; audit de produção limpo.
- Aplicação sem login e limitada a loopback, para exercício local. Não hospedar esse servidor para acesso público.
- Execução direta autorizada pelo pedido de criação e aprovação do desenho; plano registrado sem nova rodada de aprovação para decisões rotineiras.
- Desenho copiado mantém texto histórico de proposta; a aprovação e implementação estão registradas neste arquivo e no estado atual.

- Revisão final: corrigida corrida entre upload PUT e DELETE/outro PUT mediante releitura após await e verificação de linhas alteradas. Teste de regressão RED→GREEN; suíte 8/8 HTTP e 3/3 navegador.
