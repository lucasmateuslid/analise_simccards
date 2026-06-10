import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  EmptyState,
  KpiCard,
  PageHeader,
  Pill,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from '../components/ui';
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
    return (
      <>
        <PageHeader titulo="Candidatas a cancelamento" />
        <EmptyState icone="scissors" titulo="Sem dados ainda" descricao="Importe um snapshot mensal primeiro." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Candidatas a cancelamento"
        subtitulo="Fila de revisão — nada é cancelado automaticamente"
        acoes={
          <>
            <Button variante="secundario" icone="refresh" onClick={() => void sincronizar()} disabled={ocupado}>
              {ocupado ? 'Sincronizando…' : 'Sincronizar veículos'}
            </Button>
            <Select value={mes} onChange={(e) => setMes(e.target.value)} className="w-36">
              {meses.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {erro !== null && <Alert tipo="erro">{erro}</Alert>}
      {aviso !== null && <Alert tipo="sucesso">{aviso}</Alert>}

      {resumo !== null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            titulo="Candidatas a cancelar"
            valor={String(resumo.qtdCandidatas)}
            icone="scissors"
            tom={resumo.qtdCandidatas > 0 ? 'alerta' : 'positivo'}
            detalhe={`ociosas > ${resumo.limiteOciosidadeDias} dias, sem veículo ativo`}
          />
          <KpiCard
            titulo="Economia mensal potencial"
            valor={formatBRL(resumo.economiaMensalPotencial)}
            icone="money"
            tom="positivo"
          />
          <KpiCard
            titulo="Economia anual potencial"
            valor={formatBRL(resumo.economiaAnualPotencial)}
            icone="trendingUp"
            tom="positivo"
            detalhe={`${resumo.qtdProtegidas} linha(s) protegida(s)`}
          />
        </div>
      )}

      <Alert tipo="info">
        "Aprovar" marca a linha como <strong>cancelada</strong>; "Proteger" a remove da fila com um
        motivo registrado.
      </Alert>

      {carregando ? (
        <Spinner />
      ) : (
        <Card>
          <CardTitle>Fila de revisão ({candidatas.length})</CardTitle>
          {candidatas.length === 0 ? (
            <EmptyState icone="check" titulo="Nenhuma candidata neste mês" descricao="Tudo certo por aqui. 🎉" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>ICCID</Th>
                  <Th>Fornecedor</Th>
                  <Th>Plano</Th>
                  <Th>Última conexão</Th>
                  <Th right>Dias ociosa</Th>
                  <Th right>Custo/mês</Th>
                  <Th right>Economia/ano</Th>
                  <Th right>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {candidatas.map((l) => (
                  <tr key={l.iccid} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <Td className="font-mono text-xs text-slate-600">{l.iccid}</Td>
                    <Td className="font-medium text-slate-800">{l.broker}</Td>
                    <Td>{l.plano ?? '—'}</Td>
                    <Td>{formatData(l.ultimaConexao)}</Td>
                    <Td right>
                      <span className="font-semibold text-rose-600">{l.diasSemConexao ?? '—'}</span>
                    </Td>
                    <Td right>{formatBRL(l.custoMensal)}</Td>
                    <Td right>
                      <span className="font-semibold text-emerald-600">{formatBRL(l.economiaAnual)}</span>
                    </Td>
                    <Td right>
                      <div className="flex justify-end gap-1.5">
                        <Button variante="perigo" className="px-2 py-1 text-xs" onClick={() => void aprovar(l.iccid)}>
                          Aprovar
                        </Button>
                        <Button variante="secundario" className="px-2 py-1 text-xs" onClick={() => void proteger(l.iccid)}>
                          Proteger
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {!carregando && protegidas.length > 0 && (
        <Card>
          <CardTitle>Protegidas — não canceláveis ({protegidas.length})</CardTitle>
          <Table>
            <thead>
              <tr>
                <Th>ICCID</Th>
                <Th>Fornecedor</Th>
                <Th right>Dias ociosa</Th>
                <Th>Motivo da proteção</Th>
              </tr>
            </thead>
            <tbody>
              {protegidas.map((l) => (
                <tr key={l.iccid} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <Td className="font-mono text-xs text-slate-600">{l.iccid}</Td>
                  <Td>{l.broker}</Td>
                  <Td right>{l.diasSemConexao ?? '—'}</Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      {l.motivosProtecao.map((m) => (
                        <Pill key={m} tom="indigo">
                          {m}
                        </Pill>
                      ))}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
