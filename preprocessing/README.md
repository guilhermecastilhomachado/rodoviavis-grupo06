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

A pasta `.venv` é local e não deve ser enviada ao repositório.

## 1. `inspecionar_bases.py`

Lê os três arquivos originais em `data/raw/` e gera um diagnóstico
da estrutura e da qualidade inicial dos dados.

### Principais verificações

- quantidade de linhas e colunas;
- período coberto;
- duplicidade de IDs;
- valores ausentes;
- tipos identificados;
- categorias existentes;
- diferenças entre os anos;
- possíveis variações de grafia;
- validação inicial de latitude e longitude.

O script não modifica os arquivos de `data/raw/`.

### Execução

```powershell
python preprocessing/inspecionar_bases.py
```

### Saída

- diagnóstico exibido no terminal;
- `docs/relatorio-inspecao-dados.txt`.

## 2. `preparar_dados.py`

Unifica as bases de 2022, 2023 e 2024, padroniza os tipos, cria
variáveis derivadas e gera a base detalhada tratada.

### Principais transformações

- normalização dos IDs;
- conversão de latitude, longitude e quilômetro;
- padronização das variáveis de contagem;
- correção do nome da variável meteorológica;
- preservação da causa original;
- padronização de grafias confirmadas;
- criação de variáveis temporais;
- criação de indicadores de gravidade;
- inclusão da região brasileira de cada UF;
- validação da integridade antes da gravação.

### Execução

```powershell
python preprocessing/preparar_dados.py
```

### Saída

- `data/processed/acidentes_2022_2024.csv`.

## 3. Próxima etapa

O próximo script será responsável por gerar os arquivos agregados
utilizados diretamente nas visualizações em D3.js.

Arquivos previstos:

- `agregado_uf_ano.csv`;
- `agregado_data.csv`;
- `agregado_mes_ano.csv`;
- `agregado_causa_horario.csv`;
- `perfil_uf_ano.csv`.

## Formato das bases originais

- separador: `;`;
- codificação: `latin1`;
- arquivos:
  - `data/raw/datatran2022.csv`;
  - `data/raw/datatran2023.csv`;
  - `data/raw/datatran2024.csv`.

## Formato da base tratada

- separador: `,`;
- codificação: `UTF-8`;
- período: 2022–2024;
- unidade de análise: uma ocorrência de acidente por linha;
- arquivo: `data/processed/acidentes_2022_2024.csv`.