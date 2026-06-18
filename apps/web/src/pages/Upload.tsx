import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Pill,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from '../components/ui';
import { CAMPOS_CANONICOS, sugerirMapeamento } from '../mapeamento-auto';
import type { Broker, MapeamentoColunas, PreviewPlanilha, ResumoIngestao, UnidadeConsumo } from '../types';

function mesAtual(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const UNIDADES: UnidadeConsumo[] = ['bytes', 'KB', 'MB', 'GB'];

export function Upload() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [mapeamentos, setMapeamentos] = useState<MapeamentoColunas[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewPlanilha | null>(null);
  const [brokerId, setBrokerId] = useState('');
  const [referenciaMes, setReferenciaMes] = useState(mesAtual());
  const [resumo, setResumo] = useState<ResumoIngestao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Mapeamento: 'auto' = dropdowns dos cabeçalhos do arquivo; 'template' = template salvo.
  const [modo, setModo] = useState<'auto' | 'template'>('auto');
  const [mapeamentoId, setMapeamentoId] = useState('');
  const [mapaColunas, setMapaColunas] = useState<Record<string, string>>({});
  const [unidade, setUnidade] = useState<UnidadeConsumo>('MB');
  const [planoFixo, setPlanoFixo] = useState('');
  const [nomeTemplate, setNomeTemplate] = useState('');

  useEffect(() => {
    api.listarBrokers().then(setBrokers).catch((e: unknown) => setErro(String(e)));
  }, []);

  useEffect(() => {
    if (brokerId === '') {
      setMapeamentos([]);
      return;
    }
    api.listarMapeamentos(brokerId).then((ms) => {
      setMapeamentos(ms);
      const padrao = ms.find((m) => m.padrao) ?? ms[0];
      setMapeamentoId(padrao?.id ?? '');
    });
  }, [brokerId]);

  const brokerSelecionado = useMemo(() => brokers.find((b) => b.id === brokerId), [brokers, brokerId]);

  async function aoSelecionarArquivo(f: File | null) {
    setArquivo(f);
    setPreview(null);
    setResumo(null);
    setErro(null);
    setOk(null);
    if (f === null) {
      return;
    }
    setOcupado(true);
    try {
      const p = await api.previewPlanilha(f);
      setPreview(p);
      setMapaColunas(sugerirMapeamento(p.headers)); // pré-preenche por auto-match
      if (p.brokerDetectado) {
        setBrokerId(p.brokerDetectado.id);
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  }

  const qtdAutoMapeadas = useMemo(
    () => CAMPOS_CANONICOS.filter((c) => (mapaColunas[c.campo] ?? '') !== '').length,
    [mapaColunas],
  );
  const iccidMapeado = (mapaColunas['iccid'] ?? '') !== '';

  function setColuna(campo: string, valor: string) {
    setMapaColunas((m) => ({ ...m, [campo]: valor }));
  }

  async function importar() {
    if (arquivo === null || brokerId === '') {
      setErro('Selecione arquivo e fornecedor.');
      return;
    }
    if (modo === 'template' && mapeamentoId === '') {
      setErro('Selecione um template de mapeamento.');
      return;
    }
    if (modo === 'auto' && !iccidMapeado) {
      setErro('Mapeie ao menos a coluna do ICCID.');
      return;
    }
    setOcupado(true);
    setErro(null);
    setOk(null);
    setResumo(null);
    try {
      const colunas: Record<string, string> = {};
      for (const [k, v] of Object.entries(mapaColunas)) {
        if (v.trim() !== '') {
          colunas[k] = v.trim();
        }
      }
      const r = await api.importarPlanilha({
        arquivo,
        brokerId,
        referenciaMes,
        ...(modo === 'template'
          ? { mapeamentoId }
          : {
              mapeamentoInline: {
                mapeamento: colunas,
                unidade_consumo: unidade,
                status_map: {},
                plano_fixo: planoFixo.trim() === '' ? null : planoFixo.trim(),
              },
            }),
      });
      setResumo(r);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  }

  async function salvarComoTemplate() {
    if (brokerId === '' || nomeTemplate.trim() === '' || !iccidMapeado) {
      setErro('Informe o fornecedor, um nome de template e a coluna do ICCID.');
      return;
    }
    const colunas: Record<string, string> = {};
    for (const [k, v] of Object.entries(mapaColunas)) {
      if (v.trim() !== '') {
        colunas[k] = v.trim();
      }
    }
    try {
      await api.criarMapeamento({
        broker_id: brokerId,
        nome: nomeTemplate.trim(),
        mapeamento: colunas,
        unidade_consumo: unidade,
        status_map: {},
        plano_fixo: planoFixo.trim() === '' ? null : planoFixo.trim(),
        padrao: false,
      });
      setOk(`Template "${nomeTemplate.trim()}" salvo.`);
      setNomeTemplate('');
      setMapeamentos(await api.listarMapeamentos(brokerId));
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <PageHeader titulo="Importar planilha" subtitulo="Upload de XLSX/CSV → snapshot mensal" />
      {erro !== null && <Alert tipo="erro">{erro}</Alert>}
      {ok !== null && <Alert tipo="sucesso">{ok}</Alert>}

      <Card>
        <CardTitle>Arquivo e destino</CardTitle>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <Field label="Arquivo (XLSX ou CSV)">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent hover:file:bg-accent/25"
              onChange={(e) => void aoSelecionarArquivo(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="Mês de referência">
            <Input type="month" value={referenciaMes} onChange={(e) => setReferenciaMes(e.target.value)} />
          </Field>
          <Field
            label="Fornecedor"
            dica={preview?.brokerDetectado ? `Detectado pelo arquivo: ${preview.brokerDetectado.nome}` : undefined}
          >
            <Select value={brokerId} onChange={(e) => setBrokerId(e.target.value)}>
              <option value="">— selecione —</option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Como mapear as colunas">
            <Select value={modo} onChange={(e) => setModo(e.target.value as 'auto' | 'template')}>
              <option value="auto">Mapear agora (auto pelo arquivo)</option>
              <option value="template" disabled={mapeamentos.length === 0}>
                Usar template salvo{mapeamentos.length === 0 ? ' (nenhum)' : ''}
              </option>
            </Select>
          </Field>
        </div>
        <div className="border-t border-border px-4 py-3">
          <Button
            icone="upload"
            disabled={ocupado || arquivo === null || brokerId === ''}
            onClick={() => void importar()}
          >
            {ocupado ? 'Processando…' : 'Importar'}
          </Button>
        </div>
      </Card>

      {ocupado && preview === null && <Spinner texto="Lendo arquivo…" />}

      {/* Mapeamento inline: dropdowns dos cabeçalhos reais, já auto-preenchidos. */}
      {preview !== null && modo === 'auto' && (
        <Card>
          <CardTitle
            acao={
              <span className="text-xs text-fg-subtle">
                {qtdAutoMapeadas}/{CAMPOS_CANONICOS.length} campos preenchidos automaticamente
              </span>
            }
          >
            Mapeamento de colunas
          </CardTitle>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS_CANONICOS.map((c) => {
                const valor = mapaColunas[c.campo] ?? '';
                const auto = valor !== '';
                return (
                  <label key={c.campo} className="text-xs text-fg-muted">
                    <span className="mb-0.5 flex items-center gap-1">
                      {c.rotulo}
                      {c.obrigatorio && <span className="text-rose-500">*</span>}
                      {auto && <Pill tom="emerald">auto</Pill>}
                    </span>
                    <Select
                      className="px-2 py-1.5 text-sm"
                      value={valor}
                      onChange={(e) => setColuna(c.campo, e.target.value)}
                    >
                      <option value="">— não mapear —</option>
                      {preview.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </Select>
                  </label>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Unidade do consumo">
                <Select value={unidade} onChange={(e) => setUnidade(e.target.value as UnidadeConsumo)}>
                  {UNIDADES.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Plano fixo (se não houver coluna de plano)">
                <Input value={planoFixo} onChange={(e) => setPlanoFixo(e.target.value)} placeholder="opcional" />
              </Field>
            </div>

            {!iccidMapeado && (
              <Alert tipo="info">Selecione a coluna do ICCID para poder importar.</Alert>
            )}

            <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
              <Field label="Salvar este mapeamento como template (opcional)">
                <Input
                  value={nomeTemplate}
                  onChange={(e) => setNomeTemplate(e.target.value)}
                  placeholder="Ex.: Arqia — layout 2026"
                />
              </Field>
              <Button
                variante="secundario"
                disabled={nomeTemplate.trim() === '' || !iccidMapeado}
                onClick={() => void salvarComoTemplate()}
              >
                Salvar template
              </Button>
            </div>
          </div>
        </Card>
      )}

      {preview !== null && modo === 'template' && (
        <Card>
          <CardTitle>Template de mapeamento</CardTitle>
          <div className="p-4">
            <Field
              label="Template"
              dica={
                brokerSelecionado && mapeamentos.length === 0
                  ? 'Nenhum template para este fornecedor. Use o modo "Mapear agora".'
                  : undefined
              }
            >
              <Select
                value={mapeamentoId}
                onChange={(e) => setMapeamentoId(e.target.value)}
                disabled={mapeamentos.length === 0}
              >
                {mapeamentos.length === 0 && <option value="">nenhum template</option>}
                {mapeamentos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                    {m.padrao ? ' (padrão)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
      )}

      {preview !== null && (
        <Card>
          <CardTitle
            acao={
              <span className="text-xs text-fg-subtle">
                {preview.totalLinhas} linha(s) · {preview.headers.length} coluna(s)
              </span>
            }
          >
            Prévia do arquivo
          </CardTitle>
          <Table>
            <thead>
              <tr>
                {preview.headers.map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.amostra.map((linha, i) => (
                <tr key={i} className="border-b border-border">
                  {preview.headers.map((h) => (
                    <Td key={h}>{linha[h] === null || linha[h] === undefined ? '' : String(linha[h])}</Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {resumo !== null && (
        <Card>
          <CardTitle
            acao={
              <Pill tom={resumo.status === 'erro' ? 'rose' : resumo.status === 'parcial' ? 'slate' : 'emerald'}>
                {resumo.status}
              </Pill>
            }
          >
            Resultado da ingestão
          </CardTitle>
          <div className="p-4">
            <Alert tipo={resumo.status === 'erro' ? 'erro' : resumo.status === 'parcial' ? 'info' : 'sucesso'}>
              {resumo.qtdLinhas} linha(s) gravada(s)
              {resumo.qtdErros > 0 ? `, ${resumo.qtdErros} erro(s)` : ''}.
            </Alert>
            {resumo.erros.length > 0 && (
              <div className="mt-3 max-h-60 overflow-y-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Linha</Th>
                      <Th>Campo</Th>
                      <Th>Mensagem</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.erros.map((e, i) => (
                      <tr key={i} className="border-b border-border">
                        <Td>{e.registro ?? '—'}</Td>
                        <Td>{e.campo ?? '—'}</Td>
                        <Td className="text-rose-600">{e.mensagem}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
