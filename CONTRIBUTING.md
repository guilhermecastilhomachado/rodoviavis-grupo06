# Regras de colaboração

## Branches

- `main`: versão estável;
- `develop`: integração;
- `feature/...`: desenvolvimento individual.

Ninguém deve fazer push diretamente em `main`.

## Branches individuais

- `feature/base-integracao-guilherme`
- `feature/calendario-tiago`
- `feature/matriz-geovanna`
- `feature/mapa-scatterplot-wothon`

## Commits

Utilizar mensagens claras:

- `feat(calendario): cria estrutura inicial do heatmap`
- `feat(mapa): adiciona projeção geográfica`
- `fix(matriz): corrige escala de cores`
- `data(preprocessamento): gera agregado por UF e ano`
- `docs(relatorio): descreve o layout temporal`

## Pull Requests

Todo código deve entrar em `develop` por Pull Request.

Antes de abrir um Pull Request:

1. testar o módulo;
2. verificar o console do navegador;
3. atualizar a branch com `develop`;
4. descrever o que foi implementado;
5. informar como testar;
6. confirmar que o responsável entende o código.

## Arquivos centrais

Os arquivos `index.html`, `app.js` e `state.js` devem ser alterados com
coordenação do responsável pela integração.