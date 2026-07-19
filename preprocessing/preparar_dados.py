"""
RodoviaVis - Preparacao da base tratada da PRF (2022-2024)
====================================================================

Etapa 2 do pre-processamento.
Responsavel: Guilherme Castilho Machado (dados, arquitetura e integracao).

Depende da Etapa 1 (preprocessing/inspecionar_bases.py) ja validada.
Todas as decisoes de tratamento tomadas aqui foram guiadas pelo
docs/relatorio-inspecao-dados.txt gerado naquela etapa.

O QUE ESTE SCRIPT FAZ
----------------------
1. Carrega as tres bases brutas (mesma leitura da Etapa 1);
2. Marca explicitamente o ano de cada registro;
3. Normaliza o id para texto, sem casas decimais;
4. Padroniza latitude, longitude e km para numero (aceita virgula e ponto);
5. Corrige o nome da coluna 'condicao_metereologica';
6. Preserva a grafia original da causa em 'causa_acidente_original' e cria
   uma versao padronizada em 'causa_acidente';
7. Cria variaveis temporais (data, ano, mes, dia, hora, faixa_horario etc.);
8. Cria indicadores de gravidade (fatal, ferido grave, grave_ou_fatal,
   total de vitimas);
9. Adiciona a regiao brasileira de cada UF;
10. Valida o resultado final antes de salvar (interrompe se algo estiver
    fora do esperado);
11. Salva data/processed/acidentes_2022_2024.csv.

Reaproveita de preprocessing/inspecionar_bases.py: a configuracao de
leitura (sep=';', encoding='latin1', keep_default_na=False,
na_values=['']), a validacao de colunas obrigatorias e as funcoes
converter_coordenada() e normalizar_texto(), para nao duplicar logica
ja validada na Etapa 1.

O QUE ESTE SCRIPT NAO FAZ
--------------------------
Nao gera os arquivos agregados (agregado_uf_ano.csv, agregado_data.csv
etc.) -- isso fica para a proxima etapa, depois que este CSV detalhado
estiver validado.
"""

from datetime import datetime
from pathlib import Path

import pandas as pd

from inspecionar_bases import (
    ARQUIVOS,
    carregar_base,
    converter_coordenada,
    normalizar_texto,
)

# ============================================================
# CONFIGURACAO
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
SAIDA_PATH = PROCESSED_DIR / "acidentes_2022_2024.csv"

QUANTIDADE_ESPERADA = 205_528  # confirmado pelo relatorio da Etapa 1
ANOS_VALIDOS = {2022, 2023, 2024}
QUANTIDADES_ESPERADAS_POR_ANO = {
    2022: 64_606,
    2023: 67_766,
    2024: 73_156,
}

# Unica substituicao de grafia confirmada pela Etapa 1. Qualquer outra
# causa que pareca semelhante NAO foi unificada aqui de proposito --
# nao ha justificativa registrada para presumir que sejam a mesma coisa.
MAPA_CAUSAS_PADRONIZADAS = {
    "Transitar no Acostamento": "Transitar no acostamento",
}

MESES_PT = {
    1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
    5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
    9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
}

# dia_semana_numero segue a convencao do JavaScript Date.getDay():
# domingo = 0, segunda = 1, ..., sabado = 6. A escolha e proposital:
# o consumidor final desses dados e o D3.js no navegador, entao evita
# uma conversao (e uma fonte de bug de off-by-one) no js/utils.js.
DIAS_FIM_DE_SEMANA_JS = {0, 6}  # domingo, sabado

REGIOES_POR_UF = {
    "AC": "Norte", "AP": "Norte", "AM": "Norte", "PA": "Norte",
    "RO": "Norte", "RR": "Norte", "TO": "Norte",
    "AL": "Nordeste", "BA": "Nordeste", "CE": "Nordeste", "MA": "Nordeste",
    "PB": "Nordeste", "PE": "Nordeste", "PI": "Nordeste", "RN": "Nordeste",
    "SE": "Nordeste",
    "DF": "Centro-Oeste", "GO": "Centro-Oeste", "MT": "Centro-Oeste",
    "MS": "Centro-Oeste",
    "ES": "Sudeste", "MG": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
    "PR": "Sul", "RS": "Sul", "SC": "Sul",
}

COLUNAS_CONTAGEM = [
    "pessoas",
    "mortos",
    "feridos_leves",
    "feridos_graves",
    "ilesos",
    "ignorados",
    "feridos",
    "veiculos",
]

# Colunas que o arquivo final precisa ter, independente da ordem.
# Usada na validacao do passo 10 para travar o script caso alguma
# transformacao abaixo seja alterada no futuro e acabe removendo algo.
COLUNAS_ESSENCIAIS_FINAIS = {
    "id", "data", "ano", "mes_numero", "mes_nome", "dia_mes",
    "dia_semana_numero", "fim_semana", "hora", "faixa_horario",
    "uf", "regiao", "br", "km",
    "causa_acidente", "causa_acidente_original", "tipo_acidente",
    "classificacao_acidente", "condicao_meteorologica", "tipo_pista",
    "mortos", "feridos_graves", "feridos_leves", "total_vitimas",
    "acidente_fatal", "acidente_com_ferido_grave", "acidente_grave_ou_fatal",
    "latitude", "longitude",
}

COLUNAS_SAIDA = [
    "id",
    "data",
    "ano",
    "mes_numero",
    "mes_nome",
    "dia_mes",
    "dia_semana",
    "dia_semana_numero",
    "fim_semana",
    "horario",
    "hora",
    "faixa_horario",
    "uf",
    "regiao",
    "br",
    "km",
    "municipio",
    "causa_acidente_original",
    "causa_acidente",
    "tipo_acidente",
    "classificacao_acidente",
    "fase_dia",
    "sentido_via",
    "condicao_meteorologica",
    "tipo_pista",
    "tracado_via",
    "uso_solo",
    "pessoas",
    "mortos",
    "feridos_leves",
    "feridos_graves",
    "feridos",
    "ilesos",
    "ignorados",
    "veiculos",
    "total_vitimas",
    "acidente_fatal",
    "acidente_com_ferido_grave",
    "acidente_grave_ou_fatal",
    "latitude",
    "longitude",
    "regional",
    "delegacia",
    "uop",
]

def titulo(texto: str, nivel: int = 1):
    marcador = "=" if nivel == 1 else "-"
    largura = 72
    print()
    print(marcador * largura)
    print(texto)
    print(marcador * largura)


# ============================================================
# PASSO 2 e 3 — ANO E ID
# ============================================================

def normalizar_id(serie: pd.Series) -> pd.Series:
    """
    Normaliza a coluna id para texto, sem casas decimais.

    A Etapa 1 mostrou que o id e lido como inteiro (int64) em 2022 e
    2023, mas como decimal (float64) em 2024 -- efeito colateral do
    pandas ao nao encontrar nenhum valor ausente na coluna em nenhum
    dos anos, mas ainda assim inferir tipos diferentes conforme o
    arquivo. Como id e identificador (nao quantidade), o formato mais
    seguro para uso no front-end e texto, sem o ".0" que apareceria
    numa conversao direta de float para string.

    Passos: (1) forca para numerico; (2) confirma que nao existe parte
    decimal de verdade; (3) converte para inteiro anulavel (Int64);
    (4) converte para texto.
    """
    numerico = pd.to_numeric(serie, errors="coerce")

    if numerico.isna().any():
        exemplos = serie[numerico.isna()].head(5).tolist()
        raise ValueError(f"Existe(m) id(s) que nao pode(m) ser convertido(s) para numero: {exemplos}")

    tem_parte_decimal = (numerico % 1 != 0)
    if tem_parte_decimal.any():
        exemplos = numerico[tem_parte_decimal].head(5).tolist()
        raise ValueError(f"Existe(m) id(s) com parte decimal, o que nao deveria acontecer: {exemplos}")

    return numerico.astype("Int64").astype(str)


# ============================================================
# PASSO 7 — VARIAVEIS TEMPORAIS
# ============================================================

def criar_variaveis_temporais(df: pd.DataFrame) -> pd.DataFrame:
    df["data"] = pd.to_datetime(df["data_inversa"], format="%Y-%m-%d", errors="coerce")

    if df["data"].isna().any():
        qtd = int(df["data"].isna().sum())
        raise ValueError(f"{qtd} data(s) em 'data_inversa' nao puderam ser convertidas.")

    df["mes_numero"] = df["data"].dt.month
    df["mes_nome"] = df["mes_numero"].map(MESES_PT)
    df["dia_mes"] = df["data"].dt.day

    # pandas: segunda=0 ... domingo=6  ->  convertido para JS: domingo=0 ... sabado=6
    dia_semana_pandas = df["data"].dt.weekday
    df["dia_semana_numero"] = (dia_semana_pandas + 1) % 7
    df["fim_semana"] = df["dia_semana_numero"].isin(DIAS_FIM_DE_SEMANA_JS)

    horario_convertido = pd.to_datetime(df["horario"], format="%H:%M:%S", errors="coerce")
    if horario_convertido.isna().any():
        qtd = int(horario_convertido.isna().sum())
        raise ValueError(f"{qtd} horario(s) fora do formato HH:MM:SS esperado.")
    df["hora"] = horario_convertido.dt.hour

    df["faixa_horario"] = pd.cut(
        df["hora"],
        bins=[-1, 5, 11, 17, 23],
        labels=["Madrugada", "Manhã", "Tarde", "Noite"],
    ).astype(str)

    return df


# ============================================================
# PASSO 8 — INDICADORES DE GRAVIDADE
# ============================================================

def normalizar_colunas_de_contagem(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converte as variáveis de contagem para inteiros não negativos.
    Interrompe o tratamento se encontrar texto inválido, valor decimal
    ou valor negativo.
    """
    for coluna in COLUNAS_CONTAGEM:
        valores = pd.to_numeric(df[coluna], errors="coerce")

        if valores.isna().any():
            exemplos = df.loc[valores.isna(), coluna].head(5).tolist()
            raise ValueError(
                f"A coluna '{coluna}' possui valores não numéricos: {exemplos}"
            )

        possui_decimal = valores.mod(1).ne(0)

        if possui_decimal.any():
            exemplos = valores[possui_decimal].head(5).tolist()
            raise ValueError(
                f"A coluna '{coluna}' possui contagens decimais: {exemplos}"
            )

        if valores.lt(0).any():
            exemplos = valores[valores.lt(0)].head(5).tolist()
            raise ValueError(
                f"A coluna '{coluna}' possui valores negativos: {exemplos}"
            )

        df[coluna] = valores.astype("int64")

    return df

def criar_indicadores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Os indicadores sao calculados a partir das contagens numericas
    (mortos, feridos_graves, feridos_leves) em vez da coluna
    categorica classificacao_acidente. Motivo: a Etapa 1 encontrou o
    valor literal 'NA' nessa coluna categorica, ainda sem confirmacao
    do dicionario oficial da PRF sobre o que ele representa; as
    contagens numericas nao tem essa ambiguidade.
    """
    df["acidente_fatal"] = df["mortos"] > 0
    df["acidente_com_ferido_grave"] = df["feridos_graves"] > 0
    df["acidente_grave_ou_fatal"] = df["acidente_fatal"] | df["acidente_com_ferido_grave"]
    df["total_vitimas"] = df["mortos"] + df["feridos_graves"] + df["feridos_leves"]
    return df


# ============================================================
# PASSO 10 — VALIDACAO FINAL
# ============================================================

def validar_base_final(
    df: pd.DataFrame,
    pares_coordenadas_validos_antes: int,
) -> None:
    """
    Interrompe a execucao (levanta excecao) caso qualquer uma das
    condicoes abaixo seja verdadeira. Nao salva nada em disco antes
    de passar por todas elas.
    """
    titulo("VALIDACAO FINAL ANTES DE SALVAR", nivel=2)

    if len(df) != QUANTIDADE_ESPERADA:
        raise ValueError(
            f"Quantidade final de registros ({len(df)}) diferente do "
            f"esperado ({QUANTIDADE_ESPERADA})."
        )
    print(f"OK - quantidade de registros: {len(df):,}".replace(",", "."))

    duplicados = df["id"].duplicated().sum()
    if duplicados > 0:
        raise ValueError(f"Existem {duplicados} id(s) duplicado(s) apos a uniao das bases.")
    print("OK - nenhum id duplicado apos a uniao.")

    if df["data"].isna().any():
        raise ValueError("Existem datas invalidas (NaT) na coluna 'data'.")
    print("OK - todas as datas sao validas.")

    anos_encontrados = set(df["ano"].unique())

    if anos_encontrados != ANOS_VALIDOS:
        raise ValueError(
            f"Conjunto de anos incorreto. Esperado: {sorted(ANOS_VALIDOS)}. "
            f"Encontrado: {sorted(anos_encontrados)}."
        )
    print("OK - as bases de 2022, 2023 e 2024 estão presentes.")

    quantidades_encontradas = df.groupby("ano").size().to_dict()
    
    if quantidades_encontradas != QUANTIDADES_ESPERADAS_POR_ANO:
        raise ValueError(
            "Quantidade de registros por ano diferente da inspeção. "
            f"Esperado: {QUANTIDADES_ESPERADAS_POR_ANO}. "
            f"Encontrado: {quantidades_encontradas}."
        )
    print("OK - quantidade de registros por ano preservada.")

    ano_da_data_incorreto = df["data"].dt.year.ne(df["ano"])

    if ano_da_data_incorreto.any():
        exemplos = df.loc[
            ano_da_data_incorreto,
            ["id", "data", "ano"],
        ].head(5)

        raise ValueError(
            "Existem registros cujo ano da data difere do ano atribuido "
            f"pela base:\n{exemplos}"
        )
    print("OK - ano das datas corresponde ao ano de origem de cada base.")

    pares_validos_depois = int(
        (df["latitude"].notna() & df["longitude"].notna()).sum()
    )
    if pares_validos_depois != pares_coordenadas_validos_antes:
        raise ValueError(
            "A quantidade de pares de coordenadas válidos mudou "
            f"durante o tratamento: {pares_coordenadas_validos_antes} antes "
            f"e {pares_validos_depois} depois."
        )
    print(
        f"OK - pares de coordenadas válidos preservados: "
        f"{pares_validos_depois:,}".replace(",", ".")
    )

    latitude_fora = ~df["latitude"].between(-34.0, 6.0)
    longitude_fora = ~df["longitude"].between(-74.0, -28.0)
    if latitude_fora.any() or longitude_fora.any():
        raise ValueError(
            "Foram encontradas coordenadas fora da faixa aproximada do Brasil."
        )
    print("OK - coordenadas dentro da faixa aproximada do Brasil.")

    feridos_calculados = df["feridos_leves"] + df["feridos_graves"]
    divergencias_feridos = df["feridos"].ne(feridos_calculados)

    if divergencias_feridos.any():
        quantidade = int(divergencias_feridos.sum())
        print(
            f"AVISO - {quantidade} registro(s) possuem divergência entre "
            "'feridos' e a soma de feridos_leves + feridos_graves."
        )
    else:
        print(
            "OK - a coluna 'feridos' corresponde à soma de "
            "feridos_leves + feridos_graves."
        )

    colunas_faltantes = COLUNAS_ESSENCIAIS_FINAIS - set(df.columns)
    if colunas_faltantes:
        raise ValueError(f"Colunas essenciais ausentes no resultado final: {sorted(colunas_faltantes)}")
    print("OK - todas as colunas essenciais estao presentes.")

    colunas_saida_faltantes = set(COLUNAS_SAIDA) - set(df.columns)
    if colunas_saida_faltantes:
        raise ValueError(
            "Colunas necessárias para o CSV final estão ausentes: "
            f"{sorted(colunas_saida_faltantes)}"
        )
    print("OK - todas as colunas previstas para o CSV final estão presentes.")


# ============================================================
# EXECUCAO PRINCIPAL
# ============================================================

def main():
    titulo("PREPARACAO DA BASE TRATADA - RODOVIAVIS")
    print(f"Iniciado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")

    # ---------- Passos 1 e 2: carregar e marcar o ano ----------
    titulo("CARREGANDO AS TRES BASES", nivel=2)
    bases_do_ano = []
    pares_coordenadas_validos_antes = 0

    for ano, caminho in ARQUIVOS.items():
        df_ano = carregar_base(caminho)  # mesma leitura validada na Etapa 1
        df_ano["ano"] = ano

        latitude_convertida = converter_coordenada(df_ano["latitude"])
        longitude_convertida = converter_coordenada(df_ano["longitude"])
        pares_coordenadas_validos_antes += int(
            (latitude_convertida.notna() & longitude_convertida.notna()).sum()
        )

        print(f"  - {ano}: {len(df_ano):,} linhas carregadas".replace(",", "."))
        bases_do_ano.append(df_ano)

    df = pd.concat(bases_do_ano, ignore_index=True)
    print(f"Total apos concatenar os tres anos: {len(df):,}".replace(",", "."))

    # ---------- Passo 3: normalizar id ----------
    titulo("NORMALIZANDO ID, COORDENADAS E KM", nivel=2)
    df["id"] = normalizar_id(df["id"])
    print("OK - id convertido para texto, sem casas decimais.")

    # ---------- Passo 4: coordenadas e km ----------
    df["latitude"] = converter_coordenada(df["latitude"])
    df["longitude"] = converter_coordenada(df["longitude"])
    df["km"] = converter_coordenada(df["km"])
    df = normalizar_colunas_de_contagem(df)
    print("OK - variáveis de contagem convertidas para inteiros não negativos.")
    print("OK - latitude, longitude e km convertidos para numero (aceitando virgula e ponto).")

    # ---------- Passo 5: renomear coluna meteorologica ----------
    titulo("CORRIGINDO NOMES DE COLUNAS", nivel=2)
    df = df.rename(columns={"condicao_metereologica": "condicao_meteorologica"})
    print("OK - 'condicao_metereologica' renomeada para 'condicao_meteorologica'.")

    # ---------- Passo 6: causa original + padronizada ----------
    titulo("PADRONIZANDO CAUSA_ACIDENTE", nivel=2)
    df["causa_acidente_original"] = df["causa_acidente"]
    df["causa_acidente"] = df["causa_acidente"].replace(MAPA_CAUSAS_PADRONIZADAS)
    qtd_alterada = (df["causa_acidente"] != df["causa_acidente_original"]).sum()
    print(f"OK - causa_acidente_original preservada. {qtd_alterada} linha(s) padronizada(s).")

    # checagem de apoio (nao interrompe o script): alerta se sobrar
    # alguma variacao de grafia parecida que ainda nao foi mapeada.
    normalizados = {}
    for original in df["causa_acidente"].unique():
        chave = normalizar_texto(original)
        normalizados.setdefault(chave, set()).add(original)
    restantes = {c: v for c, v in normalizados.items() if len(v) > 1}
    if restantes:
        print("AVISO: ainda ha grafias parecidas nao unificadas (revisar antes do relatorio SBC):")
        for variantes in restantes.values():
            print(f"  - {sorted(variantes)}")

    # ---------- Passo 7: variaveis temporais ----------
    titulo("CRIANDO VARIAVEIS TEMPORAIS", nivel=2)
    df = criar_variaveis_temporais(df)
    print("OK - data, mes_numero, mes_nome, dia_mes, dia_semana_numero, fim_semana, hora e faixa_horario criados.")

    # ---------- Passo 8: indicadores ----------
    titulo("CRIANDO INDICADORES DE GRAVIDADE", nivel=2)
    df = criar_indicadores(df)
    print("OK - acidente_fatal, acidente_com_ferido_grave, acidente_grave_ou_fatal e total_vitimas criados.")

    # ---------- Passo 9: regiao ----------
    titulo("ADICIONANDO REGIAO", nivel=2)
    df["regiao"] = df["uf"].map(REGIOES_POR_UF)
    ufs_sem_regiao = df.loc[df["regiao"].isna(), "uf"].unique()
    if len(ufs_sem_regiao) > 0:
        raise ValueError(f"UF(s) sem regiao mapeada: {sorted(ufs_sem_regiao)}")
    print("OK - todas as 27 UFs mapeadas para uma regiao.")

    # ---------- Passo 10: validacao final ----------
    validar_base_final(df, pares_coordenadas_validos_antes)


    # ---------- Passo 11: salvar ----------
    titulo("SALVANDO ARQUIVO PROCESSADO", nivel=2)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    df_para_salvar = df[COLUNAS_SAIDA].copy()
    df_para_salvar["data"] = df_para_salvar["data"].dt.strftime("%Y-%m-%d")

    # Saida em UTF-8 com separador ',' (padrao esperado por d3.csv no
    # navegador), diferente do ';' dos arquivos brutos originais.
    df_para_salvar.to_csv(SAIDA_PATH, index=False, encoding="utf-8")

    print(f"Arquivo salvo em: {SAIDA_PATH.relative_to(BASE_DIR)}")
    print(f"Linhas: {len(df_para_salvar):,} | Colunas: {df_para_salvar.shape[1]}".replace(",", "."))

    titulo("CONCLUIDO COM SUCESSO")


if __name__ == "__main__":
    main()