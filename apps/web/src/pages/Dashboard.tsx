import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import { Card, CardTitle, EmptyState, KpiCard, PageHeader, Select, Spinner, Table, Td, Th } from '../components/ui';
import { Alert } from '../components/ui';
import { formatBRL, formatMb, formatNum, formatPct } from '../format';
import { useTheme } from '../theme';
import type { PontoTendencia, ResumoBroker, ResumoCancelamento, ResumoMes } from '../types';

const CORES = ['#84cc16', '#22d3ee', '#10b981', '#f59e0b', '#fb7185', '#a78bfa'];

export function Dashboard() {
  const { tema } = useTheme();
  const escuro = tema === 'dark';
  const grid = escuro ? '#232c38' : '#e2e8f0';
  const eixo = escuro ? '#6b7785' : '#94a3b8';
  const ttStyle: React.CSSProperties = {
    borderRadius: 8,
    border: `1px solid ${grid}`,
    fontSize: 12,
    background: escuro ? '#11161c' : '#fff',
    color: escuro ? '#e6edf3' : '#0f172a',
  };

  const [meses, setMeses] = useState<string[]>([]);
  const [mes, setMes] = useState('');
  const [resumo, setResumo] = useState<ResumoMes | null>(null);
  const [cancel, setCancel] = useState<ResumoCancelamento | null>(null);
  const [porBroker, setPorBroker] = useState<ResumoBroker[]>([]);
  const [tendencias, setTendencias] = useState<PontoTendencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.meses(), api.tendencias()])
      .then(([ms, td]) => {
        setMeses(ms);
        setTendencias(td);
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
    Promise.all([api.resumoMes(mes), api.resumoPorBroker(mes), api.resumoCancelamento(mes)])
      .then(([r, pb, rc]) => {
        setResumo(r);
        setPorBroker(pb);
        setCancel(rc);
      })
      .catch((e: unknown) => setErro(String(e)))
      .finally(() => setCarregando(false));
  }, [mes]);

  const picoConsumo = useMemo(
    () => tendencias.reduce((max, p) => Math.max(max, p.consumoMaxMb), 0),
    [tendencias],
  );
  const dadosBroker = useMemo(
    () => porBroker.map((b) => ({ broker: b.broker, custo: b.custo, consumo: b.consumoMb })),
    [porBroker],
  );

  if (meses.length === 0 && !carregando) {
    return (
      <>
        <PageHeader titulo="Dashboard" subtitulo="Visão consolidada do consumo de chips M2M" />
        <EmptyState
          icone="upload"
          titulo="Nenhum dado importado ainda"
          descricao="Importe um snapshot mensal em 'Importar planilha' para ver custos, consumo e tendências."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        subtitulo="Visão consolidada e evolução mensal"
        acoes={
          meses.length > 0 && (
            <Select value={mes} onChange={(e) => setMes(e.target.value)} className="w-36">
              {meses.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          )
        }
      />

      {erro !== null && <Alert tipo="erro">{erro}</Alert>}
      {carregando && <Spinner />}

      {resumo !== null && !carregando && (
        <>
          {/* KPIs atuais */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              titulo="Chips no mês"
              valor={formatNum(resumo.qtdLinhas)}
              icone="chip"
              tom="destaque"
              detalhe={cancel === null ? undefined : `${cancel.qtdProtegidas} protegidas`}
              progresso={
                cancel === null ? undefined : { atual: cancel.qtdProtegidas, total: resumo.qtdLinhas }
              }
            />
            <KpiCard
              titulo="Custo total"
              valor={formatBRL(resumo.custoTotal)}
              icone="money"
              tom={resumo.variacaoPct !== null && resumo.variacaoPct > 0 ? 'alerta' : 'positivo'}
              tendencia={
                resumo.variacaoPct === null
                  ? undefined
                  : {
                      valor: formatPct(resumo.variacaoPct),
                      subindo: resumo.variacaoPct > 0,
                      bom: resumo.variacaoPct <= 0,
                    }
              }
              detalhe="vs. mês anterior"
            />
            <KpiCard titulo="Consumo total" valor={formatMb(resumo.consumoTotalMb)} icone="signal" />
            <KpiCard
              titulo="Economia anual potencial"
              valor={cancel === null ? '—' : formatBRL(cancel.economiaAnualPotencial)}
              icone="scissors"
              tom={cancel !== null && cancel.qtdCandidatas > 0 ? 'alerta' : 'positivo'}
              detalhe={cancel === null ? undefined : `${cancel.qtdCandidatas} candidatas a cancelar`}
              progresso={
                cancel === null ? undefined : { atual: cancel.qtdCandidatas, total: resumo.qtdLinhas }
              }
            />
          </div>

          {/* Evolução mensal */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>Evolução de custo e chips</CardTitle>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={tendencias}>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                    <XAxis dataKey="referenciaMes" fontSize={12} stroke={eixo} />
                    <YAxis yAxisId="l" fontSize={12} stroke={eixo} />
                    <YAxis yAxisId="r" orientation="right" fontSize={12} stroke={eixo} allowDecimals={false} />
                    <Tooltip contentStyle={ttStyle} />
                    <Bar yAxisId="l" dataKey="custoTotal" name="Custo (R$)" fill="#84cc16" radius={[4, 4, 0, 0]} barSize={28} />
                    <Line yAxisId="r" type="monotone" dataKey="qtdChips" name="Chips" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardTitle acao={<span className="text-xs text-fg-subtle">pico histórico {formatMb(picoConsumo)}</span>}>
                Evolução de consumo
              </CardTitle>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={tendencias}>
                    <defs>
                      <linearGradient id="gConsumo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                    <XAxis dataKey="referenciaMes" fontSize={12} stroke={eixo} />
                    <YAxis fontSize={12} stroke={eixo} />
                    <Tooltip contentStyle={ttStyle} formatter={(v: unknown) => formatMb(Number(v))} />
                    <Area type="monotone" dataKey="consumoTotalMb" name="Consumo total" stroke="#22d3ee" strokeWidth={2.5} fill="url(#gConsumo)" />
                    <Line type="monotone" dataKey="consumoMaxMb" name="Máx. por linha" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Por broker */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle>Custo por fornecedor</CardTitle>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dadosBroker} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                    <XAxis type="number" fontSize={12} stroke={eixo} />
                    <YAxis type="category" dataKey="broker" fontSize={12} stroke={eixo} width={80} />
                    <Tooltip contentStyle={ttStyle} formatter={(v: unknown) => formatBRL(Number(v))} />
                    <Bar dataKey="custo" name="Custo" radius={[0, 4, 4, 0]} barSize={22}>
                      {dadosBroker.map((_, i) => (
                        <Cell key={i} fill={CORES[i % CORES.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardTitle>Consumo por fornecedor</CardTitle>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dadosBroker} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                    <XAxis type="number" fontSize={12} stroke={eixo} />
                    <YAxis type="category" dataKey="broker" fontSize={12} stroke={eixo} width={80} />
                    <Tooltip contentStyle={ttStyle} formatter={(v: unknown) => formatMb(Number(v))} />
                    <Bar dataKey="consumo" name="Consumo" fill="#22d3ee" radius={[0, 4, 4, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <CardTitle acao={<span className="text-xs text-fg-subtle">{resumo.qtdAltoConsumo} com alto consumo</span>}>
              Resumo por fornecedor — {mes}
            </CardTitle>
            <Table>
              <thead>
                <tr>
                  <Th>Fornecedor</Th>
                  <Th right>Chips</Th>
                  <Th right>Consumo</Th>
                  <Th right>Custo</Th>
                  <Th right>Alto consumo</Th>
                </tr>
              </thead>
              <tbody>
                {porBroker.map((b) => (
                  <tr key={b.brokerId} className="border-b border-border hover:bg-surface-2">
                    <Td className="font-medium text-fg">{b.broker}</Td>
                    <Td right>{formatNum(b.qtdLinhas)}</Td>
                    <Td right>{formatMb(b.consumoMb)}</Td>
                    <Td right>{formatBRL(b.custo)}</Td>
                    <Td right>
                      {b.qtdAltoConsumo > 0 ? (
                        <span className="font-medium text-rose-400">{b.qtdAltoConsumo}</span>
                      ) : (
                        '—'
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
