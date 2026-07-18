# Pré-processamento — RodoviaVis

Scripts responsáveis por transformar as bases brutas da PRF em dados
prontos para os layouts em D3.js. Devem ser executados na ordem
documentada neste arquivo.

## Ambiente Python

Recomenda-se utilizar um ambiente virtual para manter as dependências
isoladas e reproduzíveis.

### Windows — PowerShell

Na raiz do projeto:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Caso a ativação seja bloqueada pelo PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

1. inspecionar_bases.py

Lê os três arquivos originais em data/raw/ e gera um diagnóstico
completo:

* quantidade de linhas e colunas;
* período coberto;
* duplicidade de IDs;
* valores ausentes;
* tipos identificados;
* categorias;
* diferenças entre os anos;
* possíveis variações de grafia;
* validação inicial de latitude e longitude.

O script não altera os arquivos de data/raw/.

## Execução

Com o ambiente virtual ativado e a partir da raiz do projeto:

```powershell
python preprocessing/inspecionar_bases.py
```

## Saída
* diagnóstico no terminal;
* docs/relatorio-inspecao-dados.txt.

## Formato das bases originais
* separador: ;;
* codificação: latin1;
* arquivos:
  * data/raw/datatran2022.csv;
  * data/raw/datatran2023.csv;
  * data/raw/datatran2024.csv.