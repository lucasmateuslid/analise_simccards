import { describe, expect, it } from 'vitest';
import { PlanilhaAdapter, type ConfigPlanilhaAdapter, type LinhaBruta } from './planilha.js';

const configBase: ConfigPlanilhaAdapter = {
  broker: 'Arqia',
  unidadeConsumo: 'KB',
  mapeamento: {
    iccid: 'ICCID',
    msisdn: 'Linha',
    plano: 'Plano',
    consumo: 'Consumo (KB)',
    custo: 'Valor',
    status: 'Situacao',
    ultimaConexao: 'Ultima Conexao',
  },
  statusMap: { ATIVADO: 'ativo', SUSPENSO: 'suspenso', CANCELADO: 'cancelado' },
};

function adapter(config: ConfigPlanilhaAdapter = configBase): PlanilhaAdapter {
  return new PlanilhaAdapter(config);
}

describe('PlanilhaAdapter', () => {
  it('converte linha válida para canônico, normalizando KB→MB e data BR→ISO', async () => {
    const rows: LinhaBruta[] = [
      {
        ICCID: '8955170110001000001',
        Linha: '5511990000001',
        Plano: 'M2M 10MB',
        'Consumo (KB)': 2048,
        Valor: '4,90',
        Situacao: 'ATIVADO',
        'Ultima Conexao': '30/05/2026',
      },
    ];

    const { linhas, erros } = await adapter().parse(rows, '2026-05');

    expect(erros).toHaveLength(0);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toEqual({
      iccid: '8955170110001000001',
      msisdn: '5511990000001',
      broker: 'Arqia',
      plano: 'M2M 10MB',
      franquiaMb: null,
      consumoMb: 2, // 2048 KB
      custoMensal: 4.9,
      operadora: null,
      status: 'ativo',
      ultimaConexao: '2026-05-30T00:00:00.000Z',
      referenciaMes: '2026-05',
      fonte: 'planilha',
    });
  });

  it('trata consumo/custo vazios como zero', async () => {
    const rows: LinhaBruta[] = [
      { ICCID: 'X', 'Consumo (KB)': '', Valor: '', Situacao: 'ATIVADO' },
    ];
    const { linhas, erros } = await adapter().parse(rows, '2026-05');
    expect(erros).toHaveLength(0);
    expect(linhas[0]?.consumoMb).toBe(0);
    expect(linhas[0]?.custoMensal).toBe(0);
  });

  it('registra erro e descarta linha sem ICCID', async () => {
    const rows: LinhaBruta[] = [{ ICCID: '  ', 'Consumo (KB)': '10' }];
    const { linhas, erros } = await adapter().parse(rows, '2026-05');
    expect(linhas).toHaveLength(0);
    expect(erros[0]).toMatchObject({ registro: 2, campo: 'iccid' });
  });

  it('registra erro de consumo não numérico apontando o registro', async () => {
    const rows: LinhaBruta[] = [
      { ICCID: 'A', 'Consumo (KB)': '100' },
      { ICCID: 'B', 'Consumo (KB)': 'lixo' },
    ];
    const { linhas, erros } = await adapter().parse(rows, '2026-05');
    expect(linhas).toHaveLength(1);
    expect(erros[0]).toMatchObject({ registro: 3, campo: 'consumo' });
  });

  it('mapeia status desconhecido para "desconhecido"', async () => {
    const rows: LinhaBruta[] = [{ ICCID: 'A', Situacao: 'BLOQUEADO PARCIAL' }];
    const { linhas } = await adapter().parse(rows, '2026-05');
    expect(linhas[0]?.status).toBe('desconhecido');
  });

  it('aceita status canônico direto sem statusMap', async () => {
    const cfg: ConfigPlanilhaAdapter = {
      broker: 'X',
      unidadeConsumo: 'MB',
      mapeamento: { iccid: 'ICCID', status: 'st' },
    };
    const { linhas } = await adapter(cfg).parse([{ ICCID: 'A', st: 'Suspenso' }], '2026-05');
    expect(linhas[0]?.status).toBe('suspenso');
  });

  it('usa planoFixo quando o arquivo não traz coluna de plano', async () => {
    const cfg: ConfigPlanilhaAdapter = {
      broker: 'X',
      unidadeConsumo: 'MB',
      mapeamento: { iccid: 'ICCID' },
      planoFixo: 'Plano Único',
    };
    const { linhas } = await adapter(cfg).parse([{ ICCID: 'A' }], '2026-05');
    expect(linhas[0]?.plano).toBe('Plano Único');
  });

  it('lê a operadora conectada quando mapeada', async () => {
    const cfg: ConfigPlanilhaAdapter = {
      broker: 'X',
      unidadeConsumo: 'MB',
      mapeamento: { iccid: 'ICCID', operadora: 'Rede' },
    };
    const { linhas } = await adapter(cfg).parse([{ ICCID: 'A', Rede: 'Vivo' }], '2026-05');
    expect(linhas[0]?.operadora).toBe('Vivo');
  });

  it('normaliza franquia usando a unidade de consumo', async () => {
    const cfg: ConfigPlanilhaAdapter = {
      broker: 'X',
      unidadeConsumo: 'KB',
      mapeamento: { iccid: 'ICCID', franquia: 'Franquia' },
    };
    const { linhas } = await adapter(cfg).parse([{ ICCID: 'A', Franquia: '10240' }], '2026-05');
    expect(linhas[0]?.franquiaMb).toBe(10);
  });

  it('rejeita referência de mês inválida sem processar linhas', async () => {
    const { linhas, erros } = await adapter().parse([{ ICCID: 'A' }], '2026-13');
    expect(linhas).toHaveLength(0);
    expect(erros[0]).toMatchObject({ campo: 'referenciaMes' });
  });

  it('rejeita conteúdo que não é lista', async () => {
    const { erros } = await adapter().parse({ naoEhLista: true }, '2026-05');
    expect(erros).toHaveLength(1);
  });
});
