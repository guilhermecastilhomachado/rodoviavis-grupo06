"""
RodoviaVis - Inspecao inicial das bases brutas da PRF (2022-2024)
====================================================================

Etapa 1 do pre-processamento.
Responsavel: Guilherme Castilho Machado (dados, arquitetura e integracao).

O QUE ESTE SCRIPT FAZ
----------------------
Le os tres arquivos originais em data/raw/ e produz um diagnostico
completo de cada base e das diferencas entre elas: quantidade de
linhas/colunas, periodo coberto, duplicidade de id, valores ausentes,
tipos de dados, categorias existentes e possiveis inconsistencias de
grafia entre os anos (ex.: causas de acidente escritas de forma
diferente em anos diferentes).

O QUE ESTE SCRIPT NAO FAZ
--------------------------
Nao corrige, renomeia ou sobrescreve nada em data/raw/. Essa etapa e
so leitura e diagnostico. O tratamento de fato acontece depois, em
preprocessing/preparar_dados.py, usando os pontos de atencao listados
no resumo executivo ao final deste relatorio.

SAIDA
-----
- Impressao de todo o diagnostico no terminal;
- Arquivo docs/relatorio-inspecao-dados.txt com o mesmo conteudo,
  para consulta durante a escrita do relatorio SBC e da avaliacao
  individual.
"""

import unicodedata
from datetime import datetime
from pathlib import Path

import pandas as pd

# ============================================================
# CONFIGURACAO
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
DOCS_DIR = BASE_DIR / "docs"
RELATORIO_PATH = DOCS_DIR / "relatorio-inspecao-dados.txt"

ARQUIVOS = {
    2022: RAW_DIR / "datatran2022.csv",
    2023: RAW_DIR / "datatran2023.csv",
    2024: RAW_DIR / "datatran2024.csv",
}

COLUNAS_OBRIGATORIAS = {
    "id",
    "data_inversa",
    "uf",
    "classificacao_acidente",
    "condicao_metereologica",
    "tipo_pista",
    "causa_acidente",
    "latitude",
    "longitude",
}

# Validando as colunas obrigatorias
def validar_colunas_obrigatorias(
    df: pd.DataFrame,
    caminho: Path,
) -> None:
    """Interrompe a inspeção caso alguma coluna necessária esteja ausente."""
    faltantes = sorted(COLUNAS_OBRIGATORIAS - set(df.columns))

    if faltantes:
        raise ValueError(
            f"O arquivo {caminho.name} não possui as colunas "
            f"obrigatórias: {faltantes}"
        )

SEPARADOR = ";"
ENCODING = "latin1"

# Faixa aproximada de coordenadas do territorio brasileiro.
# Usada so para sinalizar candidatos a valor invalido, nao para descartar nada aqui.
LAT_MIN, LAT_MAX = -34.0, 6.0
LON_MIN, LON_MAX = -74.0, -28.0


# ============================================================
# UTILITARIO DE SAIDA (imprime no terminal e guarda para o .txt)
# ============================================================

class RegistradorDeSaida:
    """
    Escreve cada linha simultaneamente no terminal e em uma lista
    interna, que no final vira o conteudo de
    docs/relatorio-inspecao-dados.txt. Evita ter que manter duas
    versoes (uma para print, outra para o arquivo) sincronizadas.
    """

    def __init__(self):
        self.linhas = []

    def escrever(self, texto=""):
        print(texto)
        self.linhas.append(texto)

    def titulo(self, texto, nivel=1):
        marcador = "=" if nivel == 1 else "-"
        largura = 72
        self.escrever("")
        self.escrever(marcador * largura)
        self.escrever(texto)
        self.escrever(marcador * largura)

    def conteudo_final(self):
        return "\n".join(self.linhas) + "\n"


# ============================================================
# CARREGAMENTO
# ============================================================

def carregar_base(caminho: Path) -> pd.DataFrame:
    """
    Carrega um CSV bruto da PRF respeitando o formato original.
    Nenhuma limpeza ou sobrescrita é realizada nesta etapa.
    """
    if not caminho.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {caminho}")
    
    df = pd.read_csv(
        caminho,
        sep=SEPARADOR,
        encoding=ENCODING,
        low_memory=False,
        keep_default_na=False,
        na_values=[""]
    )

    validar_colunas_obrigatorias(df, caminho)

    return df


# ============================================================
# FUNCOES DE ANALISE POR BASE
# ============================================================

def normalizar_texto(valor) -> str:
    """
    Normaliza um texto para comparacao entre categorias: remove
    acentos, colapsa espacos duplicados e converte para maiusculo.
    Usada para detectar valores que provavelmente representam a
    mesma categoria mas foram escritos de forma diferente.
    """
    if pd.isna(valor):
        return ""
    texto = str(valor).strip().upper()
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return " ".join(texto.split())


def analisar_periodo(df: pd.DataFrame) -> tuple:
    """Retorna a menor data, a maior data e a quantidade de datas invalidas."""
    datas = pd.to_datetime(
    df["data_inversa"],
    format="%Y-%m-%d",
    errors="coerce",
)
    return datas.min(), datas.max(), int(datas.isna().sum())


def analisar_ids(df: pd.DataFrame) -> dict:
    duplicados_mask = df["id"].duplicated(keep=False)
    return {
        "total": len(df),
        "unicos": int(df["id"].nunique()),
        "linhas_com_id_duplicado": int(duplicados_mask.sum()),
        "ids_duplicados_distintos": int(df["id"][duplicados_mask].nunique()),
    }


def analisar_valores_ausentes(df: pd.DataFrame) -> pd.Series:
    """
    Conta os campos realmente vazios por coluna. O texto literal 'NA'
    é preservado durante a leitura para não assumir, sem confirmação
    do dicionário da PRF, que ele representa um valor ausente.
    """
    ausentes = df.isna().sum()
    return ausentes[ausentes > 0].sort_values(ascending=False)


def converter_coordenada(serie: pd.Series) -> pd.Series:
    """
    Converte latitude/longitude para numero, aceitando tanto o
    formato com virgula decimal (usado em 2022/2023) quanto o
    formato com ponto decimal (usado em 2024).
    """
    texto = serie.astype(str).str.strip()
    texto = texto.str.replace(",", ".", regex=False)
    return pd.to_numeric(texto, errors="coerce")


def analisar_coordenadas(df: pd.DataFrame) -> dict:
    lat = converter_coordenada(df["latitude"])
    lon = converter_coordenada(df["longitude"])

    return {
        "usa_virgula_decimal": bool(df["latitude"].astype(str).str.contains(",").any()),
        "lat_nao_numerica": int(lat.isna().sum()),
        "lon_nao_numerica": int(lon.isna().sum()),
        "lat_fora_da_faixa_br": int(((lat < LAT_MIN) | (lat > LAT_MAX)).sum()),
        "lon_fora_da_faixa_br": int(((lon < LON_MIN) | (lon > LON_MAX)).sum()),
        "coordenadas_zero_zero": int(((lat == 0) & (lon == 0)).sum()),
    }


def detectar_variacoes_de_grafia(valores_unicos) -> dict:
    """
    Agrupa valores pela versao normalizada e devolve apenas os grupos
    em que mais de uma grafia original cai na mesma chave normalizada
    -- candidatos a inconsistencia de digitacao/cadastro.
    """
    grupos = {}
    for original in valores_unicos:
        chave = normalizar_texto(original)
        grupos.setdefault(chave, set()).add(str(original))
    return {chave: variantes for chave, variantes in grupos.items() if len(variantes) > 1}


def montar_estatisticas_do_ano(ano: int, caminho: Path, df: pd.DataFrame, saida: RegistradorDeSaida) -> dict:
    saida.titulo(f"BASE {ano} - {caminho.name}")

    saida.escrever(f"Linhas: {len(df):,}".replace(",", "."))
    saida.escrever(f"Colunas: {df.shape[1]}")
    saida.escrever(f"Nomes das colunas: {list(df.columns)}")

    data_min, data_max, datas_invalidas = analisar_periodo(df)
    saida.escrever(
        f"Periodo: {data_min.date()} a {data_max.date()} (datas invalidas: {datas_invalidas})"
    )

    ids_info = analisar_ids(df)
    saida.escrever(
        f"IDs unicos: {ids_info['unicos']:,} de {ids_info['total']:,} registros".replace(",", ".")
    )
    if ids_info["ids_duplicados_distintos"] > 0:
        saida.escrever(
            f"ATENCAO: {ids_info['ids_duplicados_distintos']} id(s) duplicado(s) "
            f"em {ids_info['linhas_com_id_duplicado']} linha(s)."
        )
    else:
        saida.escrever("Nenhum id duplicado encontrado dentro desta base.")

    saida.escrever("")
    saida.escrever("Tipos de dados identificados pelo pandas:")
    tipos = {}
    for coluna, tipo in df.dtypes.items():
        tipos[coluna] = str(tipo)
        saida.escrever(f"  - {coluna}: {tipo}")

    saida.escrever("")
    ausentes = analisar_valores_ausentes(df)
    if ausentes.empty:
        saida.escrever("Nenhum valor ausente identificado em nenhuma coluna.")
    else:
        saida.escrever("Valores ausentes por coluna (somente colunas com ausencia > 0):")
        for coluna, qtd in ausentes.items():
            pct = 100 * qtd / len(df)
            saida.escrever(f"  - {coluna}: {qtd:,} ({pct:.2f}%)".replace(",", "."))

    ufs = sorted(df["uf"].dropna().unique().tolist())
    saida.escrever("")
    saida.escrever(f"UFs presentes ({len(ufs)}): {ufs}")

    classificacao = sorted(df["classificacao_acidente"].dropna().unique().tolist())
    condicao = sorted(df["condicao_metereologica"].dropna().unique().tolist())
    pista = sorted(df["tipo_pista"].dropna().unique().tolist())
    causas = df["causa_acidente"].dropna().unique().tolist()

    saida.escrever("")
    saida.escrever(f"Categorias de classificacao_acidente ({len(classificacao)}): {classificacao}")
    saida.escrever(f"Categorias de condicao_metereologica ({len(condicao)}): {condicao}")
    saida.escrever(f"Categorias de tipo_pista ({len(pista)}): {pista}")
    saida.escrever(f"Categorias de causa_acidente: {len(causas)} valores distintos.")

    saida.escrever("")
    coord = analisar_coordenadas(df)
    saida.escrever("Latitude / Longitude:")
    saida.escrever(f"  - Formato original usa virgula decimal: {'sim' if coord['usa_virgula_decimal'] else 'nao'}")
    saida.escrever(f"  - Latitudes ausentes ou nao numericas apos conversao: {coord['lat_nao_numerica']}")
    saida.escrever(f"  - Longitudes ausentes ounao numericas apos conversao: {coord['lon_nao_numerica']}")
    saida.escrever(f"  - Latitudes fora da faixa aproximada do Brasil: {coord['lat_fora_da_faixa_br']}")
    saida.escrever(f"  - Longitudes fora da faixa aproximada do Brasil: {coord['lon_fora_da_faixa_br']}")
    saida.escrever(f"  - Coordenadas exatamente (0, 0): {coord['coordenadas_zero_zero']}")

    saida.escrever("")
    variacoes_no_ano = detectar_variacoes_de_grafia(causas)
    if variacoes_no_ano:
        saida.escrever(
            f"Possiveis variacoes de grafia em causa_acidente dentro do proprio "
            f"ano de {ano} ({len(variacoes_no_ano)}):"
        )
        for variantes in variacoes_no_ano.values():
            saida.escrever(f"  - {sorted(variantes)}")
    else:
        saida.escrever(f"Nenhuma variacao de grafia encontrada dentro do proprio ano de {ano} para causa_acidente.")

    return {
        "ano": ano,
        "arquivo": caminho.name,
        "linhas": len(df),
        "colunas": list(df.columns),
        "tipos": tipos,
        "ids": ids_info,
        "ufs": set(ufs),
        "classificacao_acidente": set(classificacao),
        "condicao_metereologica": set(condicao),
        "tipo_pista": set(pista),
        "causa_acidente": set(causas),
    }


# ============================================================
# COMPARACOES ENTRE OS TRES ANOS
# ============================================================

def comparar_cabecalhos(resumos: list, saida: RegistradorDeSaida):
    saida.titulo("COMPARACAO ENTRE OS ANOS - CABECALHOS")
    base = resumos[0]["colunas"]
    if all(r["colunas"] == base for r in resumos):
        saida.escrever("Os tres arquivos possuem exatamente as mesmas colunas, na mesma ordem.")
        saida.escrever(f"Total de colunas: {len(base)}")
    else:
        saida.escrever("ATENCAO: os arquivos NAO possuem os mesmos cabecalhos.")
        for r in resumos:
            saida.escrever(f"  - {r['ano']}: {r['colunas']}")


def comparar_tipos_de_dados(resumos: list, saida: RegistradorDeSaida):
    saida.titulo("COMPARACAO ENTRE OS ANOS - TIPOS DE DADOS POR COLUNA", nivel=2)
    todas_colunas = resumos[0]["colunas"]
    divergencias = []

    for coluna in todas_colunas:
        tipos_por_ano = {r["ano"]: r["tipos"].get(coluna, "ausente") for r in resumos}
        if len(set(tipos_por_ano.values())) > 1:
            divergencias.append((coluna, tipos_por_ano))

    if not divergencias:
        saida.escrever("Todas as colunas mantiveram o mesmo tipo de dado nos tres anos.")
    else:
        saida.escrever(
            f"{len(divergencias)} coluna(s) tiveram tipo de dado identificado de forma "
            f"diferente entre os anos (isso costuma acontecer quando o formato do "
            f"texto muda, ex.: virgula x ponto decimal, ou presenca/ausencia de "
            f"valor nulo mudando int para float):"
        )
        for coluna, tipos_por_ano in divergencias:
            saida.escrever(f"  - {coluna}: {tipos_por_ano}")


def comparar_categorias(resumos: list, campo: str, rotulo: str, saida: RegistradorDeSaida):
    saida.titulo(f"COMPARACAO ENTRE OS ANOS - {rotulo}", nivel=2)
    todos = set()
    for r in resumos:
        todos |= r[campo]

    saida.escrever(f"Total de categorias distintas somando os tres anos: {len(todos)}")
    houve_diferenca = False
    for r in resumos:
        faltantes = todos - r[campo]
        if faltantes:
            houve_diferenca = True
            saida.escrever(f"  - Categorias que NAO aparecem em {r['ano']}: {sorted(faltantes)}")

    if not houve_diferenca:
        saida.escrever("Os tres anos compartilham exatamente o mesmo conjunto de categorias.")


def comparar_grafia_causas_entre_anos(resumos: list, saida: RegistradorDeSaida):
    saida.titulo("COMPARACAO ENTRE OS ANOS - POSSIVEIS DIFERENCAS DE GRAFIA EM CAUSA_ACIDENTE", nivel=2)

    mapa_normalizado = {}
    for r in resumos:
        for original in r["causa_acidente"]:
            chave = normalizar_texto(original)
            mapa_normalizado.setdefault(chave, set()).add(original)

    inconsistentes = {c: v for c, v in mapa_normalizado.items() if len(v) > 1}

    if inconsistentes:
        saida.escrever(
            f"{len(inconsistentes)} grupo(s) de causas que provavelmente representam o "
            f"mesmo motivo, mas aparecem escritas de forma diferente entre os anos:"
        )
        for variantes in inconsistentes.values():
            saida.escrever(f"  - {sorted(variantes)}")
    else:
        saida.escrever("Nenhuma variacao de grafia detectada entre os anos para causa_acidente.")

    saida.escrever("")
    saida.escrever("Quantidade de causas distintas por ano (grafia original, sem normalizar):")
    for r in resumos:
        saida.escrever(f"  - {r['ano']}: {len(r['causa_acidente'])} causas distintas")


def comparar_ids_entre_anos(resumos: list, saida: RegistradorDeSaida):
    saida.titulo("COMPARACAO ENTRE OS ANOS - SOBREPOSICAO DE IDS", nivel=2)
    ids_por_ano = {r["ano"]: r.get("_ids_set", None) for r in resumos}
    # ids_set e preenchido em main() para nao carregar o dataframe duas vezes.
    anos = list(ids_por_ano.keys())
    encontrou_sobreposicao = False
    for i in range(len(anos)):
        for j in range(i + 1, len(anos)):
            a, b = anos[i], anos[j]
            if ids_por_ano[a] is None or ids_por_ano[b] is None:
                continue
            intersecao = ids_por_ano[a] & ids_por_ano[b]
            if intersecao:
                encontrou_sobreposicao = True
                saida.escrever(f"ATENCAO: {len(intersecao)} id(s) aparecem tanto em {a} quanto em {b}.")
    if not encontrou_sobreposicao:
        saida.escrever("Nenhum id se repete entre os tres anos: seguro concatenar as bases mantendo o id original.")


# ============================================================
# RESUMO EXECUTIVO
# ============================================================

def gerar_resumo_executivo(resumos: list, saida: RegistradorDeSaida):
    saida.titulo("RESUMO EXECUTIVO E PONTOS DE ATENCAO PARA preparar_dados.py")

    total_linhas = sum(r["linhas"] for r in resumos)
    saida.escrever(f"Total de registros somando as tres bases: {total_linhas:,}".replace(",", "."))

    saida.escrever("")
    saida.escrever("Pontos que preparar_dados.py precisa tratar, com base nesta inspecao:")
    saida.escrever("  1. Renomear a coluna 'condicao_metereologica' para 'condicao_meteorologica'.")
    saida.escrever("  2. Unificar o formato de latitude/longitude (virgula em 2022/2023, ponto em")
    saida.escrever("     2024) antes de converter para numerico, usando a mesma logica de")
    saida.escrever("     converter_coordenada() usada aqui.")
    saida.escrever("  3. Tratar os valores ausentes listados acima por coluna, especialmente em")
    saida.escrever("     classificacao_acidente (fica vazio quando nao ha vitimas registradas).")
    saida.escrever("  4. Revisar as variacoes de grafia de causa_acidente listadas nas secoes")
    saida.escrever("     anteriores antes de gerar o agregado_causa_horario.csv, decidindo se")
    saida.escrever("     serao unificadas.")
    saida.escrever("  5. Criar a coluna 'ano' de forma explicita (nao depender do nome do arquivo)")
    saida.escrever("     e as colunas derivadas de tempo: mes_numero, mes_nome, dia_semana_numero,")
    saida.escrever("     fim_semana, hora e faixa_horario.")
    saida.escrever("  6. Ficar atento a divergencia de tipos de dados entre anos listada acima")
    saida.escrever("     (ex.: coluna id ou coordenadas lidas com tipos diferentes) e forcar um")
    saida.escrever("     tipo unico e explicito para cada coluna ao unificar as bases.")
    saida.escrever("  7. Nao ha sobreposicao de id entre anos (ver secao acima), entao o id")
    saida.escrever("     original pode ser preservado apos a uniao das tres bases.")


# ============================================================
# EXECUCAO PRINCIPAL
# ============================================================

def main():
    saida = RegistradorDeSaida()

    saida.titulo("RELATORIO DE INSPECAO DAS BASES BRUTAS - RODOVIAVIS")
    saida.escrever(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    saida.escrever("Script: preprocessing/inspecionar_bases.py")
    saida.escrever("Este relatorio e somente leitura: nenhum arquivo em data/raw/ foi alterado.")

    resumos = []
    for ano, caminho in ARQUIVOS.items():
        try:
            df = carregar_base(caminho)
        except (FileNotFoundError, ValueError, pd.errors.ParserError) as erro:
            saida.escrever("")
            saida.escrever(f"ERRO ao carregar {ano}: {erro}")
            continue

        resumo = montar_estatisticas_do_ano(ano, caminho, df, saida)
        resumo["_ids_set"] = set(df["id"].dropna().tolist())
        resumos.append(resumo)

    if len(resumos) < len(ARQUIVOS):
        saida.escrever("")
        saida.escrever(
            "ATENCAO: nem todas as bases foram carregadas com sucesso. "
            "Corrija os erros acima antes de seguir para preparar_dados.py."
        )

    if len(resumos) >= 2:
        comparar_cabecalhos(resumos, saida)
        comparar_tipos_de_dados(resumos, saida)
        comparar_categorias(resumos, "classificacao_acidente", "CLASSIFICACAO_ACIDENTE", saida)
        comparar_categorias(resumos, "condicao_metereologica", "CONDICAO_METEREOLOGICA", saida)
        comparar_categorias(resumos, "tipo_pista", "TIPO_PISTA", saida)
        comparar_grafia_causas_entre_anos(resumos, saida)
        comparar_ids_entre_anos(resumos, saida)

    if resumos:
        gerar_resumo_executivo(resumos, saida)

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    RELATORIO_PATH.write_text(saida.conteudo_final(), encoding="utf-8")

    saida.escrever("")
    saida.escrever(f"Relatorio salvo em: {RELATORIO_PATH.relative_to(BASE_DIR)}")


if __name__ == "__main__":
    main()