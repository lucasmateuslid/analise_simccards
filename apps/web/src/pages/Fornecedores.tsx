import { useEffect, useState } from 'react';
import { api } from '../api';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  EmptyState,
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
import { Icon } from '../components/Icon';
import { formatBRL } from '../format';
import type { Broker } from '../types';

const TIPOS = ['planilha', 'scraping', 'api'] as const;

export function Fornecedores() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>('planilha');
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function recarregar() {
    try {
      setBrokers(await api.listarBrokers());
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
  }, []);

  async function adicionar() {
    setErro(null);
    setOk(null);
    if (nome.trim() === '') {
      setErro('Informe o nome do fornecedor.');
      return;
    }
    try {
      await api.criarBroker(nome.trim(), tipo);
      setOk(`Fornecedor "${nome.trim()}" adicionado.`);
      setNome('');
      await recarregar();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  async function remover(b: Broker) {
    setErro(null);
    setOk(null);
    if (!confirm(`Remover o fornecedor "${b.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await api.removerBroker(b.id);
      setOk(`Fornecedor "${b.nome}" removido.`);
      await recarregar();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <PageHeader titulo="Fornecedores" subtitulo="Brokers/operadoras de quem os chips são contratados" />

      {erro !== null && <Alert tipo="erro">{erro}</Alert>}
      {ok !== null && <Alert tipo="sucesso">{ok}</Alert>}

      <Card>
        <CardTitle>Adicionar fornecedor</CardTitle>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <Field label="Nome">
              <Input
                placeholder="Ex.: Arqia, Transmobi, Veye…"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void adicionar()}
              />
            </Field>
          </div>
          <div className="w-44">
            <Field label="Tipo de ingestão">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as (typeof TIPOS)[number])}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button icone="plus" onClick={() => void adicionar()}>
            Adicionar
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Fornecedores cadastrados</CardTitle>
        {carregando ? (
          <Spinner />
        ) : brokers.length === 0 ? (
          <EmptyState icone="store" titulo="Nenhum fornecedor" descricao="Adicione o primeiro acima." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Fornecedor</Th>
                <Th>Tipo</Th>
                <Th right>Linhas</Th>
                <Th>Planos</Th>
                <Th right>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {brokers.map((b) => (
                <tr key={b.id} className="border-b border-border hover:bg-surface-2">
                  <Td className="font-medium text-fg">{b.nome}</Td>
                  <Td>
                    <Pill>{b.tipo_ingestao}</Pill>
                  </Td>
                  <Td right>{b.qtdLinhas ?? 0}</Td>
                  <Td>
                    {b.planos.length === 0 ? (
                      <span className="text-fg-subtle">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {b.planos.map((p) => (
                          <Pill key={p.id} tom="slate">
                            {p.nome} · {formatBRL(p.custo_mensal)}
                          </Pill>
                        ))}
                      </span>
                    )}
                  </Td>
                  <Td right>
                    <button
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:text-fg-subtle disabled:hover:bg-transparent"
                      onClick={() => void remover(b)}
                      disabled={(b.qtdLinhas ?? 0) > 0}
                      title={(b.qtdLinhas ?? 0) > 0 ? 'Remova as linhas antes de excluir' : 'Remover'}
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      Remover
                    </button>
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
