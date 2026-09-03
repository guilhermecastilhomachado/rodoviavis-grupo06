# Dados processados - RodoviaVis

Esta pasta contém a base tratada e os arquivos agregados produzidos pelo pipeline em `preprocessing/`.

## Base detalhada

`acidentes_2022_2024.csv` reúne uma ocorrência por linha:

- período: 2022 a 2024;
- registros: 205.528;
- colunas: 44;
- codificação: UTF-8;
- tamanho aproximado: 71 MiB.

Registros por ano:

- 2022: 64.606;
- 2023: 67.766;
- 2024: 73.156.

A base detalhada é um produto intermediário do pipeline e **não é carregada pelo navegador**.

## Arquivos agregados gerados

| Arquivo | Linhas | Finalidade |
|---|---:|---|
| `agregado_uf_ano.csv` | 81 | análise anual por UF / rastreabilidade |
| `agregado_data_uf.csv` | 25.774 | runtime: KPIs, mapa, scatterplot, calendário e linha temporal |
| `agregado_mes_uf.csv` | 972 | análise mensal / rastreabilidade |
| `agregado_causa_horario_uf.csv` | 12.631 | runtime: matriz contextual |
| `perfil_uf_ano.csv` | 81 | perfil anual por UF / rastreabilidade |

A versão atual do front-end carrega somente `agregado_data_uf.csv` e `agregado_causa_horario_uf.csv`. Os demais agregados continuam sendo produzidos para documentação, conferência e possíveis extensões.

## Métricas compartilhadas

- `total_acidentes`;
- `total_graves_fatais`;
- `total_mortos`;
- `total_feridos_graves`;
- `total_vitimas`;
- `taxa_gravidade`.

A taxa de gravidade é calculada como:

```text
total_graves_fatais / total_acidentes
```

Ao reagrupar dados, a taxa deve ser recalculada a partir dos totais; não deve ser somada nem obtida pela média simples das taxas existentes.

## Reprodução

Depois de colocar as três bases originais em `data/raw/`, execute:

```powershell
python preprocessing/preparar_dados.py
python preprocessing/gerar_agregados.py
```

Os arquivos produzidos pelo pipeline são determinísticos para as mesmas entradas. Na revisão de portfólio, a regeneração foi conferida por hash contra os arquivos existentes.
