import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Alerta, Card, Spinner } from '../components/ui';
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

  const brokerSelecionado = useMemo(
    () => brokers.find((b) => b.id === brokerId),
    [brokers, brokerId],
  );

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
      setErro('Selecione arquivo, broker e mapeamento.');
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
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Importar planilha</h2>
      {erro !== null && <Alerta tipo="erro">{erro}</Alerta>}

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-600">
            Arquivo (XLSX ou CSV)
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="mt-1 block w-full text-sm"
              onChange={(e) => void aoSelecionarArquivo(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="text-sm text-slate-600">
            Mês de referência
            <input
              type="month"
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
              value={referenciaMes}
              onChange={(e) => setReferenciaMes(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-600">
            Broker
            <select
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
              value={brokerId}
              onChange={(e) => setBrokerId(e.target.value)}
            >
              <option value="">— selecione —</option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
            {preview?.brokerDetectado && (
              <span className="mt-1 block text-xs text-emerald-600">
                Detectado pelo nome do arquivo: {preview.brokerDetectado.nome}
              </span>
            )}
          </label>
          <label className="text-sm text-slate-600">
            Template de mapeamento
            <select
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
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
            </select>
            {brokerSelecionado && mapeamentos.length === 0 && (
              <span className="mt-1 block text-xs text-amber-600">
                Cadastre um mapeamento para este broker antes de importar.
              </span>
            )}
          </label>
        </div>

        <button
          className="mt-4 rounded bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          disabled={ocupado || arquivo === null || mapeamentoId === ''}
          onClick={() => void importar()}
        >
          {ocupado ? 'Processando…' : 'Importar'}
        </button>
      </Card>

      {ocupado && preview === null && <Spinner texto="Lendo arquivo…" />}

      {preview !== null && (
        <Card className="p-4">
          <h3 className="mb-2 font-medium">
            Prévia — {preview.totalLinhas} linha(s), {preview.headers.length} coluna(s)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  {preview.headers.map((h) => (
                    <th key={h} className="px-2 py-1 font-medium text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.amostra.map((linha, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {preview.headers.map((h) => (
                      <td key={h} className="px-2 py-1 text-slate-700">
                        {linha[h] === null || linha[h] === undefined ? '' : String(linha[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {resumo !== null && (
        <Card className="p-4">
          <Alerta tipo={resumo.status === 'erro' ? 'erro' : resumo.status === 'parcial' ? 'info' : 'sucesso'}>
            Ingestão {resumo.status}: {resumo.qtdLinhas} linha(s) gravada(s)
            {resumo.qtdErros > 0 ? `, ${resumo.qtdErros} erro(s)` : ''}.
          </Alerta>
          {resumo.erros.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-2 py-1">Linha</th>
                    <th className="px-2 py-1">Campo</th>
                    <th className="px-2 py-1">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.erros.map((e, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1">{e.registro ?? '—'}</td>
                      <td className="px-2 py-1">{e.campo ?? '—'}</td>
                      <td className="px-2 py-1 text-rose-600">{e.mensagem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
