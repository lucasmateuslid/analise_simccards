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
} from '../components/ui';
import { Icon } from '../components/Icon';
import type { Broker, MapeamentoColunas, StatusLinha, UnidadeConsumo } from '../types';

const CAMPOS_CANONICOS: { campo: string; rotulo: string; obrigatorio?: boolean }[] = [
  { campo: 'iccid', rotulo: 'ICCID', obrigatorio: true },
  { campo: 'msisdn', rotulo: 'MSISDN / Linha' },
  { campo: 'plano', rotulo: 'Plano' },
  { campo: 'consumo', rotulo: 'Consumo' },
  { campo: 'custo', rotulo: 'Custo' },
  { campo: 'status', rotulo: 'Status' },
  { campo: 'ultimaConexao', rotulo: 'Última conexão' },
  { campo: 'franquia', rotulo: 'Franquia' },
  { campo: 'operadora', rotulo: 'Operadora conectada' },
];

const UNIDADES: UnidadeConsumo[] = ['bytes', 'KB', 'MB', 'GB'];
const STATUS: StatusLinha[] = ['ativo', 'suspenso', 'cancelado', 'desconhecido'];

interface FormState {
  id: string | null;
  nome: string;
  unidade_consumo: UnidadeConsumo;
  plano_fixo: string;
  padrao: boolean;
  mapeamento: Record<string, string>;
  statusRows: { rotulo: string; status: StatusLinha }[];
}

function formVazio(): FormState {
  return { id: null, nome: '', unidade_consumo: 'MB', plano_fixo: '', padrao: false, mapeamento: {}, statusRows: [] };
}

function paraForm(m: MapeamentoColunas): FormState {
  return {
    id: m.id,
    nome: m.nome,
    unidade_consumo: m.unidade_consumo,
    plano_fixo: m.plano_fixo ?? '',
    padrao: m.padrao,
    mapeamento: { ...m.mapeamento },
    statusRows: Object.entries(m.status_map).map(([rotulo, status]) => ({ rotulo, status })),
  };
}

export function Mapeamentos() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [brokerId, setBrokerId] = useState('');
  const [lista, setLista] = useState<MapeamentoColunas[]>([]);
  const [form, setForm] = useState<FormState>(formVazio());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    api
      .listarBrokers()
      .then((bs) => {
        setBrokers(bs);
        if (bs[0]) {
          setBrokerId(bs[0].id);
        }
      })
      .catch((e: unknown) => setErro(String(e)))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (brokerId === '') {
      return;
    }
    api.listarMapeamentos(brokerId).then(setLista).catch((e: unknown) => setErro(String(e)));
    setForm(formVazio());
  }, [brokerId]);

  function setMap(campo: string, valor: string) {
    setForm((f) => ({ ...f, mapeamento: { ...f.mapeamento, [campo]: valor } }));
  }

  async function salvar() {
    setErro(null);
    setOk(null);
    const status_map: Record<string, StatusLinha> = {};
    for (const r of form.statusRows) {
      if (r.rotulo.trim() !== '') {
        status_map[r.rotulo.trim()] = r.status;
      }
    }
    const mapeamento: Record<string, string> = {};
    for (const [k, v] of Object.entries(form.mapeamento)) {
      if (v.trim() !== '') {
        mapeamento[k] = v.trim();
      }
    }
    const corpo = {
      broker_id: brokerId,
      nome: form.nome,
      mapeamento,
      unidade_consumo: form.unidade_consumo,
      status_map,
      plano_fixo: form.plano_fixo.trim() === '' ? null : form.plano_fixo.trim(),
      padrao: form.padrao,
    };
    try {
      if (form.id === null) {
        await api.criarMapeamento(corpo);
      } else {
        await api.atualizarMapeamento(form.id, corpo);
      }
      setOk('Template salvo.');
      setForm(formVazio());
      setLista(await api.listarMapeamentos(brokerId));
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  async function remover(id: string) {
    try {
      await api.removerMapeamento(id);
      setLista(await api.listarMapeamentos(brokerId));
      if (form.id === id) {
        setForm(formVazio());
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  if (carregando) {
    return <Spinner />;
  }

  return (
    <>
      <PageHeader
        titulo="Mapeamentos de colunas"
        subtitulo="Template coluna do arquivo → campo canônico, por fornecedor"
        acoes={
          <Select value={brokerId} onChange={(e) => setBrokerId(e.target.value)} className="w-44">
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
              </option>
            ))}
          </Select>
        }
      />

      {erro !== null && <Alert tipo="erro">{erro}</Alert>}
      {ok !== null && <Alert tipo="sucesso">{ok}</Alert>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Templates salvos</CardTitle>
          {lista.length === 0 ? (
            <EmptyState icone="sliders" titulo="Nenhum template" descricao="Crie um ao lado." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lista.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-800">{m.nome}</span>
                    {m.padrao && <Pill tom="indigo">padrão</Pill>}
                    <Pill>{m.unidade_consumo}</Pill>
                  </span>
                  <span className="flex gap-1">
                    <Button variante="fantasma" className="px-2 py-1 text-xs" onClick={() => setForm(paraForm(m))}>
                      Editar
                    </Button>
                    <button
                      className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      onClick={() => void remover(m.id)}
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>{form.id === null ? 'Novo template' : 'Editar template'}</CardTitle>
          <div className="space-y-4 p-4">
            <Field label="Nome do template">
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Arqia — layout padrão" />
            </Field>

            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-600">Mapeamento de colunas</p>
              <div className="grid grid-cols-2 gap-2">
                {CAMPOS_CANONICOS.map((c) => (
                  <label key={c.campo} className="text-xs text-slate-500">
                    {c.rotulo}
                    {c.obrigatorio && <span className="text-rose-500"> *</span>}
                    <Input
                      className="mt-0.5 px-2 py-1.5 text-sm"
                      placeholder="coluna do arquivo"
                      value={form.mapeamento[c.campo] ?? ''}
                      onChange={(e) => setMap(c.campo, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Unidade de consumo">
                <Select
                  value={form.unidade_consumo}
                  onChange={(e) => setForm((f) => ({ ...f, unidade_consumo: e.target.value as UnidadeConsumo }))}
                >
                  {UNIDADES.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Plano fixo (se não houver coluna)">
                <Input value={form.plano_fixo} onChange={(e) => setForm((f) => ({ ...f, plano_fixo: e.target.value }))} />
              </Field>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-600">
                Tradução de status (rótulo do arquivo → canônico)
              </p>
              {form.statusRows.map((r, i) => (
                <div key={i} className="mb-1.5 flex gap-2">
                  <Input
                    className="flex-1 px-2 py-1.5 text-sm"
                    placeholder="ex.: ATIVADO"
                    value={r.rotulo}
                    onChange={(e) =>
                      setForm((f) => {
                        const rows = [...f.statusRows];
                        rows[i] = { ...rows[i]!, rotulo: e.target.value };
                        return { ...f, statusRows: rows };
                      })
                    }
                  />
                  <Select
                    className="w-36 px-2 py-1.5 text-sm"
                    value={r.status}
                    onChange={(e) =>
                      setForm((f) => {
                        const rows = [...f.statusRows];
                        rows[i] = { ...rows[i]!, status: e.target.value as StatusLinha };
                        return { ...f, statusRows: rows };
                      })
                    }
                  >
                    {STATUS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                  <button
                    className="rounded-md px-2 text-rose-500 hover:bg-rose-50"
                    onClick={() => setForm((f) => ({ ...f, statusRows: f.statusRows.filter((_, j) => j !== i) }))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="text-xs font-medium text-indigo-600 hover:underline"
                onClick={() => setForm((f) => ({ ...f, statusRows: [...f.statusRows, { rotulo: '', status: 'ativo' }] }))}
              >
                + adicionar tradução
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.padrao}
                onChange={(e) => setForm((f) => ({ ...f, padrao: e.target.checked }))}
              />
              Template padrão deste fornecedor
            </label>

            <div className="flex gap-2 pt-1">
              <Button onClick={() => void salvar()}>Salvar</Button>
              {form.id !== null && (
                <Button variante="secundario" onClick={() => setForm(formVazio())}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
