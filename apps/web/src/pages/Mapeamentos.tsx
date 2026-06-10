import { useEffect, useState } from 'react';
import { api } from '../api';
import { Alerta, Card, Spinner } from '../components/ui';
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
  return {
    id: null,
    nome: '',
    unidade_consumo: 'MB',
    plano_fixo: '',
    padrao: false,
    mapeamento: {},
    statusRows: [],
  };
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
    api
      .listarMapeamentos(brokerId)
      .then(setLista)
      .catch((e: unknown) => setErro(String(e)));
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Mapeamentos de colunas</h2>
        <select
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          value={brokerId}
          onChange={(e) => setBrokerId(e.target.value)}
        >
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
      </div>

      {erro !== null && <Alerta tipo="erro">{erro}</Alerta>}
      {ok !== null && <Alerta tipo="sucesso">{ok}</Alerta>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Templates salvos</h3>
          {lista.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum template para este broker.</p>
          ) : (
            <ul className="space-y-2">
              {lista.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded border border-slate-200 px-3 py-2"
                >
                  <span className="text-sm">
                    {m.nome}{' '}
                    {m.padrao && (
                      <span className="ml-1 rounded bg-sky-100 px-1.5 text-xs text-sky-700">
                        padrão
                      </span>
                    )}
                    <span className="ml-2 text-xs text-slate-400">{m.unidade_consumo}</span>
                  </span>
                  <span className="flex gap-2">
                    <button
                      className="text-xs text-sky-600 hover:underline"
                      onClick={() => setForm(paraForm(m))}
                    >
                      editar
                    </button>
                    <button
                      className="text-xs text-rose-600 hover:underline"
                      onClick={() => void remover(m.id)}
                    >
                      excluir
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 font-medium">{form.id === null ? 'Novo template' : 'Editar template'}</h3>
          <div className="space-y-3">
            <input
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
              placeholder="Nome do template"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-2">
              {CAMPOS_CANONICOS.map((c) => (
                <label key={c.campo} className="text-xs text-slate-600">
                  {c.rotulo}
                  {c.obrigatorio && <span className="text-rose-500"> *</span>}
                  <input
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    placeholder="coluna do arquivo"
                    value={form.mapeamento[c.campo] ?? ''}
                    onChange={(e) => setMap(c.campo, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-600">
                Unidade de consumo
                <select
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  value={form.unidade_consumo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unidade_consumo: e.target.value as UnidadeConsumo }))
                  }
                >
                  {UNIDADES.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Plano fixo (se não houver coluna)
                <input
                  className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  value={form.plano_fixo}
                  onChange={(e) => setForm((f) => ({ ...f, plano_fixo: e.target.value }))}
                />
              </label>
            </div>

            <div>
              <p className="mb-1 text-xs text-slate-600">
                Tradução de status (rótulo do arquivo → status canônico)
              </p>
              {form.statusRows.map((r, i) => (
                <div key={i} className="mb-1 flex gap-2">
                  <input
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                    placeholder="rótulo no arquivo (ex.: ATIVADO)"
                    value={r.rotulo}
                    onChange={(e) =>
                      setForm((f) => {
                        const rows = [...f.statusRows];
                        rows[i] = { ...rows[i]!, rotulo: e.target.value };
                        return { ...f, statusRows: rows };
                      })
                    }
                  />
                  <select
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
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
                  </select>
                  <button
                    className="px-2 text-rose-600"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        statusRows: f.statusRows.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="text-xs text-sky-600 hover:underline"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    statusRows: [...f.statusRows, { rotulo: '', status: 'ativo' }],
                  }))
                }
              >
                + adicionar tradução
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.padrao}
                onChange={(e) => setForm((f) => ({ ...f, padrao: e.target.checked }))}
              />
              Template padrão deste broker
            </label>

            <div className="flex gap-2">
              <button
                className="rounded bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                onClick={() => void salvar()}
              >
                Salvar
              </button>
              {form.id !== null && (
                <button
                  className="rounded border border-slate-300 px-4 py-1.5 text-sm"
                  onClick={() => setForm(formVazio())}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
