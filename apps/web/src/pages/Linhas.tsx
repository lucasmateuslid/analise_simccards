import { useEffect, useState } from 'react';
import { api } from '../api';
import {
  Alert,
  Card,
  EmptyState,
  PageHeader,
  Pill,
  SearchInput,
  Select,
  Spinner,
  StatusBadge,
  Table,
  Td,
  Th,
} from '../components/ui';
import { formatBRL, formatData, formatMb } from '../format';
import type { Broker, LinhaListada, StatusLinha } from '../types';

const STATUS: StatusLinha[] = ['ativo', 'suspenso', 'cancelado', 'desconhecido'];

export function Linhas() {
  const [linhas, setLinhas] = useState<LinhaListada[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [busca, setBusca] = useState('');
  const [broker, setBroker] = useState('');
  const [status, setStatus] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.listarBrokers().then(setBrokers).catch((e: unknown) => setErro(String(e)));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setCarregando(true);
      const filtros: Record<string, string> = {};
      if (busca.trim() !== '') {
        filtros['busca'] = busca.trim();
      }
      if (broker !== '') {
        filtros['broker'] = broker;
      }
      if (status !== '') {
        filtros['status'] = status;
      }
      api
        .todasLinhas(filtros)
        .then(setLinhas)
        .catch((e: unknown) => setErro(e instanceof Error ? e.message : String(e)))
        .finally(() => setCarregando(false));
    }, 250);
    return () => clearTimeout(t);
  }, [busca, broker, status]);

  return (
    <>
      <PageHeader
        titulo="Linhas"
        subtitulo="Todas as linhas com o último snapshot conhecido"
        acoes={<span className="text-sm text-fg-subtle">{linhas.length} linha(s)</span>}
      />

      {erro !== null && <Alert tipo="erro">{erro}</Alert>}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <SearchInput
              placeholder="Buscar por ICCID ou MSISDN…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={broker} onChange={(e) => setBroker(e.target.value)} className="w-auto">
            <option value="">Todos os fornecedores</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
            <option value="">Todos os status</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {carregando ? (
          <Spinner />
        ) : linhas.length === 0 ? (
          <EmptyState titulo="Nenhuma linha encontrada" descricao="Ajuste os filtros ou importe um snapshot." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>ICCID</Th>
                <Th>MSISDN</Th>
                <Th>Última con.</Th>
                <Th right>Consumo</Th>
                <Th>Operadora conectada</Th>
                <Th>Data de ativação</Th>
                <Th right>Mensalidade</Th>
                <Th>Plano</Th>
                <Th>Fornecedor</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.iccid} className="border-b border-border hover:bg-surface-2">
                  <Td className="font-mono text-xs text-fg-muted">{l.iccid}</Td>
                  <Td>{l.msisdn ?? '—'}</Td>
                  <Td>{formatData(l.ultimaConexao)}</Td>
                  <Td right>{l.consumoMb === null ? '—' : formatMb(l.consumoMb)}</Td>
                  <Td>{l.operadora === null ? '—' : <Pill tom="indigo">{l.operadora}</Pill>}</Td>
                  <Td>{formatData(l.dataAtivacao)}</Td>
                  <Td right>{l.mensalidade === null ? '—' : formatBRL(l.mensalidade)}</Td>
                  <Td>{l.plano ?? '—'}</Td>
                  <Td className="font-medium text-fg">{l.fornecedor}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1">
                      <StatusBadge status={l.status} />
                      {l.protegida && <Pill tom="indigo">protegida</Pill>}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
