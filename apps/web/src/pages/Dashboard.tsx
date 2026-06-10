import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import { Alerta, Card, KpiCard, Spinner, StatusBadge } from '../components/ui';
import { formatBRL, formatData, formatMb, formatNum, formatPct } from '../format';
import type { Broker, LinhaAnalytics, ResumoBroker, ResumoMes, StatusLinha } from '../types';

const STATUS: StatusLinha[] = ['ativo', 'suspenso', 'cancelado', 'desconhecido'];
const CORES = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const tooltipBRL = (v: unknown): string => formatBRL(Number(v));
const tooltipMb = (v: unknown): string => formatMb(Number(v));

export function Dashboard() {
  const [meses, setMeses] = useState<string[]>([]);
  const [mes, setMes] = useState('');
  const [resumo, setResumo] = useState<ResumoMes | null>(null);
  const [porBroker, setPorBroker] = useState<ResumoBroker[]>([]);
  const [linhas, setLinhas] = useState<LinhaAnalytics[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // filtros da tabela
  const [fBroker, setFBroker] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fAlto, setFAlto] = useState(false);

  useEffect(() => {
    Promise.all([api.meses(), api.listarBrokers()])
      .then(([ms, bs]) => {
        setMeses(ms);
        setBrokers(bs);
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

  useEffect(() => {
    if (mes === '') {
      return;
    }
    setCarregando(true);
    Promise.all([api.resumoMes(mes), api.resumoPorBroker(mes)])
      .then(([r, pb]) => {
        setResumo(r);
        setPorBroker(pb);
      })
      .catch((e: unknown) => setErro(String(e)))
      .finally(() => setCarregando(false));
  }, [mes]);

  useEffect(() => {
    if (mes === '') {
      return;
    }
    const filtros: Record<string, string> = {};
    if (fBroker !== '') {
      filtros['broker'] = fBroker;
    }
    if (fStatus !== '') {
      filtros['status'] = fStatus;
    }
    if (fAlto) {
      filtros['altoConsumo'] = 'true';
    }
    api.linhas(mes, filtros).then(setLinhas).catch((e: unknown) => setErro(String(e)));
  }, [mes, fBroker, fStatus, fAlto]);

  const dadosGrafico = useMemo(
    () => porBroker.map((b) => ({ broker: b.broker, custo: b.custo, consumo: b.consumoMb })),
    [porBroker],
  );

  if (meses.length === 0 && !carregando) {
    return (
      <Alerta tipo="info">
        Nenhum dado importado ainda. Vá em <strong>Importar planilha</strong> para carregar o primeiro
        snapshot mensal.
      </Alerta>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dashboard</h2>
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

      {erro !== null && <Alerta tipo="erro">{erro}</Alerta>}
      {carregando && <Spinner />}

      {resumo !== null && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              titulo="Custo total mensal"
              valor={formatBRL(resumo.custoTotal)}
              detalhe={`${resumo.qtdLinhas} linhas · vs. mês anterior ${formatPct(resumo.variacaoPct)}`}
              tom={resumo.variacaoPct !== null && resumo.variacaoPct > 0 ? 'alerta' : 'neutro'}
            />
            <KpiCard
              titulo="Consumo total"
              valor={formatMb(resumo.consumoTotalMb)}
            />
            <KpiCard
              titulo="Linhas com alto consumo"
              valor={formatNum(resumo.qtdAltoConsumo)}
              detalhe="overage ou acima do P90 do broker"
              tom={resumo.qtdAltoConsumo > 0 ? 'alerta' : 'neutro'}
            />
            <KpiCard
              titulo="Custo desperdiçado (prelim.)"
              valor={formatBRL(resumo.custoDesperdicadoPreliminar)}
              detalhe={`${resumo.qtdOciosasPreliminar} ociosas > ${resumo.limiteOciosidadeDias}d · refinado na Fase 3`}
              tom={resumo.custoDesperdicadoPreliminar > 0 ? 'alerta' : 'neutro'}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 font-medium">Custo por broker</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="broker" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={tooltipBRL} />
                  <Bar dataKey="custo" name="Custo (R$)" radius={[4, 4, 0, 0]}>
                    {dadosGrafico.map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-4">
              <h3 className="mb-3 font-medium">Consumo por broker</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="broker" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={tooltipMb} />
                  <Legend />
                  <Bar dataKey="consumo" name="Consumo (MB)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3 className="font-medium">Linhas</h3>
              <select
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                value={fBroker}
                onChange={(e) => setFBroker(e.target.value)}
              >
                <option value="">todos os brokers</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value)}
              >
                <option value="">todos os status</option>
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <input type="checkbox" checked={fAlto} onChange={(e) => setFAlto(e.target.checked)} />
                só alto consumo
              </label>
              <span className="ml-auto text-xs text-slate-400">{linhas.length} linha(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="px-2 py-1.5">ICCID</th>
                    <th className="px-2 py-1.5">Broker</th>
                    <th className="px-2 py-1.5">Plano</th>
                    <th className="px-2 py-1.5">Status</th>
                    <th className="px-2 py-1.5 text-right">Consumo</th>
                    <th className="px-2 py-1.5 text-right">Franquia</th>
                    <th className="px-2 py-1.5 text-right">Custo</th>
                    <th className="px-2 py-1.5">Última conexão</th>
                    <th className="px-2 py-1.5 text-right">Dias s/ conexão</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr
                      key={l.iccid}
                      className={`border-b border-slate-100 ${l.altoConsumo ? 'bg-rose-50' : ''}`}
                    >
                      <td className="px-2 py-1.5 font-mono text-xs">{l.iccid}</td>
                      <td className="px-2 py-1.5">{l.broker}</td>
                      <td className="px-2 py-1.5">{l.plano ?? '—'}</td>
                      <td className="px-2 py-1.5">
                        <StatusBadge status={l.status} />
                        {l.protegida && (
                          <span className="ml-1 rounded bg-indigo-100 px-1 text-xs text-indigo-700">
                            protegida
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatMb(l.consumoMb)}
                        {l.overageMb > 0 && (
                          <span className="ml-1 text-xs text-rose-600">
                            (+{formatMb(l.overageMb)})
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {l.franquiaMb === null ? '—' : formatMb(l.franquiaMb)}
                      </td>
                      <td className="px-2 py-1.5 text-right">{formatBRL(l.custo)}</td>
                      <td className="px-2 py-1.5">{formatData(l.ultimaConexao)}</td>
                      <td className="px-2 py-1.5 text-right">
                        {l.diasSemConexao === null ? '—' : l.diasSemConexao}
                      </td>
                    </tr>
                  ))}
                  {linhas.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-2 py-6 text-center text-slate-400">
                        Nenhuma linha para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
