"""
RodoviaVis - Geracao dos arquivos agregados para os layouts
====================================================================

Etapa 3 do pre-processamento.
Responsavel: Guilherme Castilho Machado (dados, arquitetura e integracao).

Depende de preprocessing/preparar_dados.py ja executado com sucesso
(le data/processed/acidentes_2022_2024.csv).

O QUE ESTE SCRIPT FAZ
----------------------
Gera os 5 arquivos agregados que os layouts em D3.js vao consumir
diretamente. Dessa forma, o navegador trabalha com arquivos menores
e nao precisa carregar nem processar as ~205 mil linhas da base
detalhada durante a interacao:


  arquivo                               usado por
  -----------------------------------------------------------------------
  agregado_uf_ano.csv                   mapa e indicadores por UF
  agregado_data_uf.csv                  calendario por data e UF
  agregado_mes_uf.csv                   linha temporal por mes e UF
  agregado_causa_horario_uf.csv         matriz contextual por UF
  perfil_uf_ano.csv                     scatterplot de perfil das UFs   

Os agregados temporais e contextuais preservam a UF e a regiao para
permitir visualizacoes coordenadas. Assim, uma UF selecionada no mapa
pode filtrar o calendario, a linha temporal, a matriz e os indicadores.  

Todos os cinco compartilham a mesma definicao de gravidade:

  taxa_gravidade = total_graves_fatais / total_acidentes

  onde total_graves_fatais soma a coluna booleana
  'acidente_grave_ou_fatal' ja criada em preparar_dados.py (acidente
  com pelo menos 1 morto ou pelo menos 1 ferido grave).

O QUE ESTE SCRIPT NAO FAZ
--------------------------
Nao limita as causas de acidente a um "top 10/15" -- isso e uma
decisao de INTERACAO (busca, ordenacao, "outras causas") que fica por
conta do modulo js/matriz.js da Geovanna, e nao deveria ser decidida
aqui no pre-processamento, para nao tirar flexibilidade do layout.
"""

from pathlib import Path

import pandas as pd

from preparar_dados import SAIDA_PATH as ENTRADA_PATH
from preparar_dados import titulo, QUANTIDADE_ESPERADA

# ============================================================
# CONFIGURACAO
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"

SAIDAS = {
    "uf_ano": PROCESSED_DIR / "agregado_uf_ano.csv",
    "data_uf": PROCESSED_DIR / "agregado_data_uf.csv",
    "mes_uf": PROCESSED_DIR / "agregado_mes_uf.csv",
    "causa_horario_uf": PROCESSED_DIR / "agregado_causa_horario_uf.csv",
    "perfil_uf_ano": PROCESSED_DIR / "perfil_uf_ano.csv",
}

METRICAS_SAIDA = [
    "total_acidentes",
    "total_graves_fatais",
    "total_mortos",
    "total_feridos_graves",
    "total_vitimas",
    "taxa_gravidade",
]

COLUNAS_ENTRADA_OBRIGATORIAS = {
    "id",
    "data",
    "ano",
    "mes_numero",
    "mes_nome",
    "dia_semana",
    "dia_semana_numero",
    "fim_semana",
    "uf",
    "regiao",
    "causa_acidente",
    "faixa_horario",
    "mortos",
    "feridos_graves",
    "total_vitimas",
    "acidente_grave_ou_fatal",
}

# ============================================================
# CARREGAMENTO
# ============================================================

def carregar_base_tratada() -> pd.DataFrame:
    """
    Carrega a base detalhada criada na Etapa 2 e valida a estrutura
    mínima necessária para produzir os arquivos agregados.
    """
    if not ENTRADA_PATH.exists():
        raise FileNotFoundError(
            f"{ENTRADA_PATH} não encontrado. "
            "Rode preprocessing/preparar_dados.py primeiro."
        )

    df = pd.read_csv(
        ENTRADA_PATH,
        encoding="utf-8",
        keep_default_na=False,
        na_values=[""],
        parse_dates=["data"],
        low_memory=False,
    )

    colunas_faltantes = COLUNAS_ENTRADA_OBRIGATORIAS - set(df.columns)

    if colunas_faltantes:
        raise ValueError(
            "A base tratada não possui as colunas necessárias: "
            f"{sorted(colunas_faltantes)}"
        )

    if len(df) != QUANTIDADE_ESPERADA:
        raise ValueError(
            f"A base possui {len(df)} registros; "
            f"eram esperados {QUANTIDADE_ESPERADA}."
        )

    if df["id"].duplicated().any():
        raise ValueError("A base tratada possui IDs duplicados.")

    if df["data"].isna().any():
        raise ValueError("A base tratada possui datas inválidas.")

    return df

# ============================================================
# AGREGACAO
# ============================================================

def calcular_metricas(df: pd.DataFrame, colunas_agrupamento: list) -> pd.DataFrame:
    """
    Agrupa a base tratada pelas colunas informadas e calcula o
    conjunto completo de metricas usadas nos agregados. Cada funcao
    gerar_* abaixo seleciona apenas as colunas que o seu arquivo de
    saida precisa, na ordem definida pelo contrato.

    dropna=False garante que nenhum grupo seja descartado caso alguma
    coluna de agrupamento tenha valor ausente -- o que nao deveria
    acontecer (a Etapa 2 ja validou isso), mas e melhor o script travar
    numa validacao explicita do que perder linhas silenciosamente.
    """
    agrupado = df.groupby(colunas_agrupamento, dropna=False, as_index=False).agg(
        total_acidentes=("id", "size"),
        total_graves_fatais=("acidente_grave_ou_fatal", "sum"),
        total_mortos=("mortos", "sum"),
        total_feridos_graves=("feridos_graves", "sum"),
        total_vitimas=("total_vitimas", "sum"),
    )

    agrupado["total_graves_fatais"] = agrupado["total_graves_fatais"].astype("int64")
    agrupado["taxa_gravidade"] = (
        agrupado["total_graves_fatais"] / agrupado["total_acidentes"]
    ).round(6)

    return agrupado


def gerar_agregado_uf_ano(df: pd.DataFrame) -> pd.DataFrame:
    chaves = ["ano", "uf", "regiao"]
    metricas = calcular_metricas(df, chaves)

    return (
        metricas[chaves + METRICAS_SAIDA]
        .sort_values(["ano", "uf"])
        .reset_index(drop=True)
    )


def gerar_agregado_data_uf(df: pd.DataFrame) -> pd.DataFrame:
    # As variáveis de calendário abaixo são determinadas pela data.
    # Elas são incluídas nas chaves para que o arquivo final já contenha
    # tudo o que o calendário precisa, sem reprocessar a data no JavaScript.
    chaves = [
        "data",
        "ano",
        "mes_numero",
        "dia_semana",
        "dia_semana_numero",
        "fim_semana",
        "uf",
        "regiao",
    ]

    metricas = calcular_metricas(df, chaves)

    resultado = (
        metricas[chaves + METRICAS_SAIDA]
        .sort_values(["data", "uf"])
        .reset_index(drop=True)
    )

    resultado["data"] = resultado["data"].dt.strftime("%Y-%m-%d")

    return resultado


def gerar_agregado_mes_uf(df: pd.DataFrame) -> pd.DataFrame:
    chaves = [
        "ano",
        "mes_numero",
        "mes_nome",
        "uf",
        "regiao",
    ]

    metricas = calcular_metricas(df, chaves)

    return (
        metricas[chaves + METRICAS_SAIDA]
        .sort_values(["ano", "mes_numero", "uf"])
        .reset_index(drop=True)
    )


def gerar_agregado_causa_horario_uf(
    df: pd.DataFrame,
) -> pd.DataFrame:
    chaves = [
        "ano",
        "uf",
        "regiao",
        "causa_acidente",
        "faixa_horario",
    ]

    metricas = calcular_metricas(df, chaves)

    return (
        metricas[chaves + METRICAS_SAIDA]
        .sort_values(
            ["ano", "uf", "causa_acidente", "faixa_horario"]
        )
        .reset_index(drop=True)
    )


def gerar_perfil_uf_ano(df: pd.DataFrame) -> pd.DataFrame:
    chaves = ["ano", "uf", "regiao"]
    metricas = calcular_metricas(df, chaves)

    return (
        metricas[chaves + METRICAS_SAIDA]
        .sort_values(["ano", "uf"])
        .reset_index(drop=True)
    )


# ============================================================
# VALIDACAO
# ============================================================

CHAVES_AGREGADOS = {
    "uf_ano": ["ano", "uf", "regiao"],
    "data_uf": [
        "data",
        "ano",
        "mes_numero",
        "dia_semana",
        "dia_semana_numero",
        "fim_semana",
        "uf",
        "regiao",
    ],
    "mes_uf": [
        "ano",
        "mes_numero",
        "mes_nome",
        "uf",
        "regiao",
    ],
    "causa_horario_uf": [
        "ano",
        "uf",
        "regiao",
        "causa_acidente",
        "faixa_horario",
    ],
    "perfil_uf_ano": ["ano", "uf", "regiao"],
}

def validar_agregados(
    agregados: dict[str, pd.DataFrame],
    df_base: pd.DataFrame,
) -> None:
    """Valida estrutura, chaves, totais e taxas dos agregados."""
    titulo("VALIDACAO DOS AGREGADOS", nivel=2)

    totais_esperados = {
        "total_acidentes": len(df_base),
        "total_graves_fatais": int(
            df_base["acidente_grave_ou_fatal"].sum()
        ),
        "total_mortos": int(df_base["mortos"].sum()),
        "total_feridos_graves": int(
            df_base["feridos_graves"].sum()
        ),
        "total_vitimas": int(df_base["total_vitimas"].sum()),
    }

    for nome, df_agregado in agregados.items():
        chaves = CHAVES_AGREGADOS[nome]

        colunas_faltantes = (
            set(chaves + METRICAS_SAIDA) - set(df_agregado.columns)
        )

        if colunas_faltantes:
            raise ValueError(
                f"'{nome}': colunas ausentes: "
                f"{sorted(colunas_faltantes)}"
            )

        if df_agregado[chaves].isna().any().any():
            raise ValueError(
                f"'{nome}': existem valores ausentes nas chaves."
            )

        if df_agregado.duplicated(subset=chaves).any():
            raise ValueError(
                f"'{nome}': existem chaves de agrupamento duplicadas."
            )

        for metrica, esperado in totais_esperados.items():
            encontrado = int(df_agregado[metrica].sum())

            if encontrado != esperado:
                raise ValueError(
                    f"'{nome}': soma de {metrica} igual a "
                    f"{encontrado}, mas eram esperados {esperado}."
                )

        metricas_numericas = [
            coluna
            for coluna in METRICAS_SAIDA
            if coluna != "taxa_gravidade"
        ]

        if (df_agregado[metricas_numericas] < 0).any().any():
            raise ValueError(
                f"'{nome}': foram encontradas métricas negativas."
            )

        taxa_recalculada = (
            df_agregado["total_graves_fatais"]
            / df_agregado["total_acidentes"]
        ).round(6)

        diferenca = (
            df_agregado["taxa_gravidade"] - taxa_recalculada
        ).abs()

        if (diferenca > 0.000001).any():
            raise ValueError(
                f"'{nome}': taxa_gravidade inconsistente."
            )

        print(
            f"OK - {nome}: {len(df_agregado):,} linha(s), "
            "chaves únicas e totais validados."
            .replace(",", ".")
        )


# ============================================================
# EXECUCAO PRINCIPAL
# ============================================================

def main():
    titulo("GERACAO DOS ARQUIVOS AGREGADOS - RODOVIAVIS")

    df = carregar_base_tratada()
    print(f"Base tratada carregada: {len(df):,} linhas.".replace(",", "."))

    titulo("CALCULANDO AGREGADOS", nivel=2)
    agregados = {
        "uf_ano": gerar_agregado_uf_ano(df),
        "data_uf": gerar_agregado_data_uf(df),
        "mes_uf": gerar_agregado_mes_uf(df),
        "causa_horario_uf": gerar_agregado_causa_horario_uf(df),
        "perfil_uf_ano": gerar_perfil_uf_ano(df),
    }
    for nome, df_agregado in agregados.items():
        print(f"  - {nome}: {len(df_agregado):,} linha(s), {df_agregado.shape[1]} coluna(s)".replace(",", "."))

    validar_agregados(agregados, df)

    titulo("SALVANDO ARQUIVOS", nivel=2)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    for nome, df_agregado in agregados.items():
        caminho = SAIDAS[nome]
        df_agregado.to_csv(caminho, index=False, encoding="utf-8")
        print(f"  - {caminho.relative_to(BASE_DIR)}")

    titulo("CONCLUIDO COM SUCESSO")


if __name__ == "__main__":
    main()
