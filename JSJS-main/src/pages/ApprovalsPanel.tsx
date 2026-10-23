import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/cutoff';
import { AREAS, PRIORITIES, STATUSES, REASON_TYPES } from '@/types';
import type { PaymentRequest, Profile, Priority, RequestStatus } from '@/types';
import { Search, Filter, Eye, CheckCircle2, XCircle, DollarSign, X, Download, FileText } from 'lucide-react';

const STATUS_COLORS: Record<RequestStatus, string> = {
  Borrador: 'bg-neutral-700/50 text-neutral-300 border-neutral-600',
  Enviada: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  Aprobada: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Rechazada: 'bg-red-500/15 text-red-400 border-red-500/30',
  Pagada: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  Urgente: 'bg-red-500/15 text-red-400',
  Alta: 'bg-orange-500/15 text-orange-400',
  Media: 'bg-amber-500/15 text-amber-400',
  Baja: 'bg-emerald-500/15 text-emerald-400',
};

export default function ApprovalsPanel() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PaymentRequest | null>(null);
  const [approverObs, setApproverObs] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [fStatus, setFStatus] = useState<string>('');
  const [fArea, setFArea] = useState<string>('');
  const [fPriority, setFPriority] = useState<string>('');
  const [fReason, setFReason] = useState<string>('');
  const [fInvoice, setFInvoice] = useState<string>('');
  const [fMonth, setFMonth] = useState<string>('');
  const [fSearch, setFSearch] = useState('');

  useEffect(() => { fetchRequests(); }, [profile]);

  async function fetchRequests() {
    setLoading(true);
    const { data, error } = await supabase.from('payment_requests').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setRequests(data as PaymentRequest[]);
      const userIds = [...new Set(data.map((r) => r.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
        if (profiles) {
          const map: Record<string, Profile> = {};
          (profiles as Profile[]).forEach((p) => { map[p.id] = p; });
          setProfilesMap(map);
        }
      }
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (fStatus && r.status !== fStatus) return false;
      if (fArea && r.area !== fArea) return false;
      if (fPriority && r.priority !== fPriority) return false;
      if (fReason && r.reason_type !== fReason) return false;
      if (fInvoice === 'con' && !r.file_path) return false;
      if (fInvoice === 'sin' && r.file_path) return false;
      if (fMonth) {
        const reqMonth = new Date(r.request_date).toISOString().slice(0, 7);
        if (reqMonth !== fMonth) return false;
      }
      if (fSearch) {
        const q = fSearch.toLowerCase();
        const matches = r.folio.toLowerCase().includes(q) || r.requirement_name.toLowerCase().includes(q) || r.payment_concept.toLowerCase().includes(q) || (r.project?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      return true;
    });
  }, [requests, fStatus, fArea, fPriority, fReason, fInvoice, fMonth, fSearch]);

  const canApprove = (req: PaymentRequest) => {
    if (!profile) return false;
    if (profile.role === 'administrador') return true;
    if (profile.role === 'aprobador' && profile.area === req.area) return true;
    return false;
  };

  async function handleAction(req: PaymentRequest, action: 'approve' | 'reject' | 'pay') {
    setActionLoading(true);
    const newStatus: RequestStatus = action === 'approve' ? 'Aprobada' : action === 'reject' ? 'Rechazada' : 'Pagada';
    const { error } = await supabase.from('payment_requests').update({ status: newStatus, approver_id: profile?.id, approver_observations: approverObs || null, approved_at: new Date().toISOString() }).eq('id', req.id);
    if (!error) {
      await supabase.from('notifications').insert({ user_id: req.user_id, request_id: req.id, message: `Solicitud ${req.folio} ha sido ${newStatus.toUpperCase()}`, type: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'paid', read: false });
      fetchRequests();
      setSelected(null);
      setApproverObs('');
    }
    setActionLoading(false);
  }

  async function getFileUrl(req: PaymentRequest) {
    if (!req.file_path) return null;
    const { data } = supabase.storage.from('payment-files').getPublicUrl(req.file_path);
    return data.publicUrl;
  }

  const months = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => set.add(new Date(r.request_date).toISOString().slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [requests]);

  return (
    <div>
      {/* Filters */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-300">Filtros</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-3 lg:col-span-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input type="text" value={fSearch} onChange={(e) => setFSearch(e.target.value)} placeholder="Buscar por folio, requerimiento, concepto o proyecto..." className="w-full bg-neutral-950/60 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-pink-500 transition-colors" />
            </div>
          </div>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="bg-neutral-950/60 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-pink-500">
            <option value="">Estado: Todos</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fArea} onChange={(e) => setFArea(e.target.value)} className="bg-neutral-950/60 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-pink-500">
            <option value="">Área: Todas</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className="bg-neutral-950/60 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-pink-500">
            <option value="">Prioridad: Todas</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={fReason} onChange={(e) => setFReason(e.target.value)} className="bg-neutral-950/60 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-pink-500">
            <option value="">Razón: Todas</option>
            {REASON_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={fInvoice} onChange={(e) => setFInvoice(e.target.value)} className="bg-neutral-950/60 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-pink-500">
            <option value="">Factura: Todas</option>
            <option value="con">Con factura</option>
            <option value="sin">Sin factura</option>
          </select>
          <select value={fMonth} onChange={(e) => setFMonth(e.target.value)} className="bg-neutral-950/60 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-pink-500">
            <option value="">Mes: Todos</option>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => { setFStatus(''); setFArea(''); setFPriority(''); setFReason(''); setFInvoice(''); setFMonth(''); setFSearch(''); }} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg px-3 py-2 text-sm font-medium transition-colors">Limpiar</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500 text-sm">Cargando solicitudes...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-sm">No se encontraron solicitudes con los filtros seleccionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800" style={{ backgroundColor: '#1a1a1a' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Folio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Área</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider hidden md:table-cell">Requerimiento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider hidden lg:table-cell">Prioridad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider hidden lg:table-cell">Monto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider hidden md:table-cell">Razón</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Factura</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-neutral-300">{req.folio}</td>
                    <td className="px-4 py-3 text-sm text-neutral-300">{req.area}</td>
                    <td className="px-4 py-3 text-sm text-neutral-300 hidden md:table-cell max-w-xs truncate">{req.requirement_name}</td>
                    <td className="px-4 py-3 hidden lg:table-cell"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[req.priority]}`}>{req.priority}</span></td>
                    <td className="px-4 py-3 text-sm text-neutral-300 hidden lg:table-cell whitespace-nowrap">{formatCurrency(req.amount, req.currency)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-300 hidden md:table-cell">{req.reason_type}</td>
                    <td className="px-4 py-3 text-sm">{req.file_path ? <span className="text-pink-400 font-medium">Sí</span> : <span className="text-amber-400 font-medium">Pendiente</span>}</td>
                    <td className="px-4 py-3"><span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[req.status]}`}>{req.status}</span></td>
                    <td className="px-4 py-3 text-right"><button onClick={() => { setSelected(req); setApproverObs(req.approver_observations ?? ''); }} className="inline-flex items-center gap-1.5 text-pink-400 hover:text-pink-300 text-sm font-medium transition-colors"><Eye className="w-4 h-4" /><span className="hidden sm:inline">Ver</span></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-neutral-800 text-sm text-neutral-500">{filtered.length} solicitud{filtered.length !== 1 ? 'es' : ''} encontrada{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      {selected && (
        <DetailModal req={selected} profile={profilesMap[selected.user_id]} approverProfile={selected.approver_id ? profilesMap[selected.approver_id] : undefined} approverObs={approverObs} setApproverObs={setApproverObs} canApprove={canApprove(selected)} actionLoading={actionLoading} onAction={handleAction} onClose={() => { setSelected(null); setApproverObs(''); }} onGetFileUrl={() => getFileUrl(selected)} />
      )}
    </div>
  );
}

function DetailModal({ req, profile, approverProfile, approverObs, setApproverObs, canApprove, actionLoading, onAction, onClose, onGetFileUrl }: {
  req: PaymentRequest; profile?: Profile; approverProfile?: Profile; approverObs: string; setApproverObs: (v: string) => void; canApprove: boolean; actionLoading: boolean; onAction: (req: PaymentRequest, action: 'approve' | 'reject' | 'pay') => void; onClose: () => void; onGetFileUrl: () => Promise<string | null>;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  useEffect(() => { onGetFileUrl().then(setFileUrl); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-white" /></div>
            <div><h3 className="text-lg font-semibold text-white">{req.folio}</h3><p className="text-sm text-neutral-500">{req.requirement_name}</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"><X className="w-5 h-5 text-neutral-400" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-3">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[req.status]}`}>{req.status}</span>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLORS[req.priority]}`}>{req.priority}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <DetailItem label="Solicitante" value={profile?.full_name ?? '—'} />
            <DetailItem label="Área" value={req.area} />
            <DetailItem label="Cargo" value={req.job_title ?? '—'} />
            <DetailItem label="Proyecto" value={req.project ?? '—'} />
            <DetailItem label="Concepto de pago" value={req.payment_concept} />
            <DetailItem label="Monto" value={formatCurrency(req.amount, req.currency)} />
            <DetailItem label="Razón o motivo" value={req.reason_type} />
            <DetailItem label="Justificación" value={req.reason_text ?? '—'} />
            <DetailItem label="Factura" value={req.file_path ? 'Sí' : 'Pendiente'} />
            <DetailItem label="Fecha de solicitud" value={new Date(req.request_date).toLocaleDateString('es-MX')} />
            <DetailItem label="Fecha req. de pago" value={new Date(req.required_payment_date).toLocaleDateString('es-MX')} />
            <DetailItem label="Observaciones" value={req.observations ?? '—'} />
          </div>
          {req.file_name && (
            <div className="bg-neutral-950/60 rounded-xl border border-neutral-800 p-4">
              <p className="text-sm font-medium text-neutral-300 mb-2">Archivo adjunto</p>
              {fileUrl ? <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-pink-400 hover:text-pink-300 text-sm font-medium transition-colors"><Download className="w-4 h-4" />{req.file_name}</a> : <p className="text-sm text-neutral-500">{req.file_name}</p>}
            </div>
          )}
          {approverProfile && (
            <div className="bg-neutral-950/60 rounded-xl border border-neutral-800 p-4">
              <p className="text-sm font-medium text-neutral-300 mb-2">Aprobado por</p>
              <p className="text-sm text-neutral-300">{approverProfile.full_name} · {approverProfile.area}</p>
              {req.approved_at && <p className="text-xs text-neutral-500 mt-1">{new Date(req.approved_at).toLocaleString('es-MX')}</p>}
              {req.approver_observations && <p className="text-sm text-neutral-400 mt-2 italic">"{req.approver_observations}"</p>}
            </div>
          )}
          {canApprove && (req.status === 'Enviada' || req.status === 'Aprobada') && (
            <div className="border-t border-neutral-800 pt-4">
              <label className="block text-sm font-medium text-neutral-300 mb-2">Observaciones del aprobador</label>
              <textarea value={approverObs} onChange={(e) => setApproverObs(e.target.value)} rows={2} className="w-full bg-neutral-950/60 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors resize-none mb-3" placeholder="Agregar comentarios sobre la decisión..." />
              <div className="flex flex-wrap gap-3">
                {req.status === 'Enviada' && (<>
                  <button onClick={() => onAction(req, 'approve')} disabled={actionLoading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/20"><CheckCircle2 className="w-4 h-4" />Aprobar</button>
                  <button onClick={() => onAction(req, 'reject')} disabled={actionLoading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50 shadow-lg shadow-red-600/20"><XCircle className="w-4 h-4" />Rechazar</button>
                </>)}
                {req.status === 'Aprobada' && <button onClick={() => onAction(req, 'pay')} disabled={actionLoading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-pink-600 text-white hover:bg-pink-500 transition-colors disabled:opacity-50 shadow-lg shadow-pink-600/20"><DollarSign className="w-4 h-4" />Marcar como pagada</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (<div><p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-0.5">{label}</p><p className="text-sm text-neutral-200">{value}</p></div>);
}
