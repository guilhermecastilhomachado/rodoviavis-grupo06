# Dados processados — RodoviaVis

Esta pasta contém as bases tratadas e os arquivos agregados utilizados
pelo sistema RodoviaVis.

Os arquivos deste diretório são gerados pelos scripts existentes em
`preprocessing/` e não devem ser editados manualmente.

## `acidentes_2022_2024.csv`

Base detalhada unificada dos acidentes registrados pela Polícia
Rodoviária Federal nos anos de 2022, 2023 e 2024.

### Características

- unidade de análise: uma ocorrência de acidente por linha;
- período: 2022 a 2024;
- registros: 205.528;
- colunas: 44;
- separador: vírgula;
- codificação: UTF-8;
- IDs únicos: 205.528;
- tamanho aproximado: 71,32 MiB.

### Quantidade de registros por ano

- 2022: 64.606;
- 2023: 67.766;
- 2024: 73.156.

### Principais variáveis derivadas

- `ano`;
- `mes_numero`;
- `mes_nome`;
- `dia_mes`;
- `dia_semana_numero`;
- `fim_semana`;
- `hora`;
- `faixa_horario`;
- `regiao`;
- `causa_acidente_original`;
- `acidente_fatal`;
- `acidente_com_ferido_grave`;
- `acidente_grave_ou_fatal`;
- `total_vitimas`.

### Reprodução

Para gerar novamente o arquivo, execute na raiz do projeto:

```powershell
.\.venv\Scripts\Activate.ps1
python preprocessing/preparar_dados.py
```

## Utilização no sistema

Esta base detalhada serve como origem para a criação dos arquivos
agregados. Os layouts em D3.js deverão utilizar prioritariamente os
arquivos agregados, pois são menores e mais adequados para carregamento
no navegador.

## Arquivos agregados previstos

- `agregado_uf_ano.csv`;
- `agregado_data.csv`;
- `agregado_mes_ano.csv`;
- `agregado_causa_horario.csv`;
- `perfil_uf_ano.csv`.