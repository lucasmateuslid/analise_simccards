import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Alerta, Card, KpiCard, Spinner } from '../components/ui';
import { formatBRL, formatData } from '../format';
import type { LinhaAvaliada, ResumoCancelamento } from '../types';

export function Candidatas() {
  const [meses, setMeses] = useState<string[]>([]);
  const [mes, setMes] = useState('');
  const [candidatas, setCandidatas] = useState<LinhaAvaliada[]>([]);
  const [protegidas, setProtegidas] = useState<LinhaAvaliada[]>([]);
  const [resumo, setResumo] = useState<ResumoCancelamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    api
      .meses()
      .then((ms) => {
        setMeses(ms);
        if (ms[0]) {
          setMes(ms[0]);
        } else {
          setCarregando(false);
        }
      })
      .catch((e: unknown) => {
        setErro(String(e));
        setCarregando(false);
      });
  }, []);

  const recarregar = useCallback(async (m: string) => {
    if (m === '') {
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [c, p, r] = await Promise.all([
        api.candidatas(m),
        api.protegidas(m),
        api.resumoCancelamento(m),
      ]);
      setCandidatas(c);
      setProtegidas(p);
      setResumo(r);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar(mes);
  }, [mes, recarregar]);

  async function sincronizar() {
    setOcupado(true);
    setAviso(null);
    setErro(null);
    try {
      const r = await api.sincronizarVeiculos();
      setAviso(
        `Veículos sincronizados (${r.fonte}): ${r.sincronizados} vínculo(s)` +
          (r.ignoradosSemLinha > 0 ? `, ${r.ignoradosSemLinha} ignorado(s) sem linha.` : '.'),
      );
      await recarregar(mes);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  }

  async function aprovar(iccid: string) {
    if (!confirm(`Confirmar cancelamento da linha ${iccid}? A linha será marcada como cancelada.`)) {
      return;
    }
    try {
      await api.aprovarCancelamento(iccid);
      setAviso(`Linha ${iccid} marcada como cancelada.`);
      await recarregar(mes);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  async function proteger(iccid: string) {
    const motivo = prompt('Motivo da proteção (ex.: "manter por contrato", "chip reserva"):');
    if (motivo === null || motivo.trim() === '') {
      return;
    }
    try {
      await api.proteger(iccid, motivo.trim());
      setAviso(`Linha ${iccid} protegida.`);
      await recarregar(mes);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  if (meses.length === 0 && !carregando) {
    return <Alerta tipo="info">Sem dados ainda — importe um snapshot mensal primeiro.</Alerta>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Candidatas a cancelamento</h2>
        <div className="flex items-center gap-2">
          <button
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            disabled={ocupado}
            onClick={() => void sincronizar()}
          >
            {ocupado ? 'Sincronizando…' : 'Sincronizar veículos'}
          </button>
          <select
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro !== null && <Alerta tipo="erro">{erro}</Alerta>}
      {aviso !== null && <Alerta tipo="sucesso">{aviso}</Alerta>}

      <Alerta tipo="info">
        Esta é uma <strong>fila de revisão</strong> — nada é cancelado automaticamente. "Aprovar"
        marca a linha como cancelada; "Proteger" a remove da fila com um motivo.
      </Alerta>

      {resumo !== null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            titulo="Candidatas a cancelar"
            valor={String(resumo.qtdCandidatas)}
            detalhe={`ociosas > ${resumo.limiteOciosidadeDias} dias, sem veículo ativo`}
            tom={resumo.qtdCandidatas > 0 ? 'alerta' : 'neutro'}
          />
          <KpiCard
            titulo="Economia mensal potencial"
            valor={formatBRL(resumo.economiaMensalPotencial)}
            tom="positivo"
          />
          <KpiCard
            titulo="Economia anual potencial"
            valor={formatBRL(resumo.economiaAnualPotencial)}
            detalhe={`${resumo.qtdProtegidas} linha(s) protegida(s)`}
            tom="positivo"
          />
        </div>
      )}

      {carregando && <Spinner />}

      {!carregando && (
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Fila de revisão ({candidatas.length})</h3>
          {candidatas.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma candidata neste mês. 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="px-2 py-1.5">ICCID</th>
                    <th className="px-2 py-1.5">Broker</th>
                    <th className="px-2 py-1.5">Plano</th>
                    <th className="px-2 py-1.5">Última conexão</th>
                    <th className="px-2 py-1.5 text-right">Dias ociosa</th>
                    <th className="px-2 py-1.5 text-right">Custo/mês</th>
                    <th className="px-2 py-1.5 text-right">Economia/ano</th>
                    <th className="px-2 py-1.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatas.map((l) => (
                    <tr key={l.iccid} className="border-b border-slate-100">
                      <td className="px-2 py-1.5 font-mono text-xs">{l.iccid}</td>
                      <td className="px-2 py-1.5">{l.broker}</td>
                      <td className="px-2 py-1.5">{l.plano ?? '—'}</td>
                      <td className="px-2 py-1.5">{formatData(l.ultimaConexao)}</td>
                      <td className="px-2 py-1.5 text-right font-medium text-rose-600">
                        {l.diasSemConexao ?? '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right">{formatBRL(l.custoMensal)}</td>
                      <td className="px-2 py-1.5 text-right font-medium text-emerald-600">
                        {formatBRL(l.economiaAnual)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          className="mr-2 rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700"
                          onClick={() => void aprovar(l.iccid)}
                        >
                          Aprovar cancel.
                        </button>
                        <button
                          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                          onClick={() => void proteger(l.iccid)}
                        >
                          Proteger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {!carregando && protegidas.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-medium">
            Protegidas — não canceláveis ({protegidas.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-2 py-1.5">ICCID</th>
                  <th className="px-2 py-1.5">Broker</th>
                  <th className="px-2 py-1.5 text-right">Dias ociosa</th>
                  <th className="px-2 py-1.5">Motivo da proteção</th>
                </tr>
              </thead>
              <tbody>
                {protegidas.map((l) => (
                  <tr key={l.iccid} className="border-b border-slate-100">
                    <td className="px-2 py-1.5 font-mono text-xs">{l.iccid}</td>
                    <td className="px-2 py-1.5">{l.broker}</td>
                    <td className="px-2 py-1.5 text-right">{l.diasSemConexao ?? '—'}</td>
                    <td className="px-2 py-1.5">
                      {l.motivosProtecao.map((m) => (
                        <span
                          key={m}
                          className="mr-1 inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700"
                        >
                          {m}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
