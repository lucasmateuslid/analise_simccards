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
import type { Broker, MapeamentoColunas, PreviewPlanilha, ResumoIngestao } from '../types';

function mesAtual(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function Upload() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [mapeamentos, setMapeamentos] = useState<MapeamentoColunas[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewPlanilha | null>(null);
  const [brokerId, setBrokerId] = useState('');
  const [mapeamentoId, setMapeamentoId] = useState('');
  const [referenciaMes, setReferenciaMes] = useState(mesAtual());
  const [resumo, setResumo] = useState<ResumoIngestao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

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
    if (f === null) {
      return;
    }
    setOcupado(true);
    try {
      const p = await api.previewPlanilha(f);
      setPreview(p);
      if (p.brokerDetectado) {
        setBrokerId(p.brokerDetectado.id);
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  }

  async function importar() {
    if (arquivo === null || brokerId === '' || mapeamentoId === '') {
      setErro('Selecione arquivo, fornecedor e mapeamento.');
      return;
    }
    setOcupado(true);
    setErro(null);
    setResumo(null);
    try {
      const r = await api.importarPlanilha({ arquivo, brokerId, referenciaMes, mapeamentoId });
      setResumo(r);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <PageHeader titulo="Importar planilha" subtitulo="Upload de XLSX/CSV → snapshot mensal" />
      {erro !== null && <Alert tipo="erro">{erro}</Alert>}

      <Card>
        <CardTitle>Arquivo e destino</CardTitle>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <Field label="Arquivo (XLSX ou CSV)">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
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
          <Field
            label="Template de mapeamento"
            dica={
              brokerSelecionado && mapeamentos.length === 0
                ? 'Cadastre um mapeamento para este fornecedor antes de importar.'
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
        <div className="border-t border-slate-100 px-4 py-3">
          <Button
            icone="upload"
            disabled={ocupado || arquivo === null || mapeamentoId === ''}
            onClick={() => void importar()}
          >
            {ocupado ? 'Processando…' : 'Importar'}
          </Button>
        </div>
      </Card>

      {ocupado && preview === null && <Spinner texto="Lendo arquivo…" />}

      {preview !== null && (
        <Card>
          <CardTitle
            acao={
              <span className="text-xs text-slate-400">
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
                <tr key={i} className="border-b border-slate-50">
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
                      <tr key={i} className="border-b border-slate-50">
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
