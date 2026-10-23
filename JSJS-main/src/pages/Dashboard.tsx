import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/cutoff';
import { AREAS } from '@/types';
import type { PaymentRequest, Profile } from '@/types';
import { BarChart, DonutChart, LineChart } from '@/components/Charts';
import RequestChat from '@/components/RequestChat';
import { TrendingUp, FileText, DollarSign, Clock, Check, X, Eye, Paperclip, XCircle, AlertCircle } from 'lucide-react';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const PALETTE = ['#e91e63', '#ec4899', '#f472b6', '#be185d', '#db2777', '#9d174d', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

function getAreaColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [fYear, setFYear] = useState<string>(new Date().getFullYear().toString());
  const [fMonth, setFMonth] = useState<string>('');
  const [fArea, setFArea] = useState<string>('');
  const [fNoInvoice, setFNoInvoice] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionComment, setActionComment] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [profile]);

  async function openDetail(req: PaymentRequest) {
    setSelectedRequest(req);
    setFileUrl(null);
    if (req.file_path) {
      setLoadingFile(true);
      const { data } = await supabase.storage.from('payment-files').createSignedUrl(req.file_path, 3600);
      if (data) setFileUrl(data.signedUrl);
      setLoadingFile(false);
    }
  }

  async function fetchRequests() {
    setLoading(true);
    const { data, error } = await supabase.from('payment_requests').select('*').order('created_at', { ascending: true });
    if (!error && data) {
      setRequests(data as PaymentRequest[]);
    }
    setLoading(false);
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function updateRequestStatus(id: string, folio: string, newStatus: 'Aprobada' | 'Rechazada', comment: string) {
    setActionLoadingId(id);
    const { error } = await supabase
      .from('payment_requests')
      .update({
        status: newStatus,
        approver_id: profile?.id ?? null,
        approver_observations: comment || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      showToast(`Error al ${newStatus === 'Aprobada' ? 'aprobar' : 'rechazar'} la solicitud ${folio}`, 'error');
    } else {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: newStatus, approver_id: profile?.id ?? null, approver_observations: comment || null, approved_at: new Date().toISOString() } : r
        )
      );
      showToast(`Solicitud ${folio} ${newStatus === 'Aprobada' ? 'aprobada' : 'rechazada'} correctamente`, 'success');
    }
    setActionLoadingId(null);
    setShowApproveModal(false);
    setShowRejectModal(false);
    setActionComment('');
  }

  const years = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => set.add(new Date(r.request_date).getFullYear().toString()));
    const arr = Array.from(set).sort().reverse();
    if (arr.length === 0) arr.push(new Date().getFullYear().toString());
    return arr;
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const d = new Date(r.request_date);
      if (fYear && d.getFullYear().toString() !== fYear) return false;
      if (fMonth && (d.getMonth() + 1).toString().padStart(2, '0') !== fMonth) return false;
      if (fArea && r.area !== fArea) return false;
      if (fNoInvoice && !r.file_path) return false;
      return true;
    });
  }, [requests, fYear, fMonth, fArea, fNoInvoice]);

  const totalRequests = filtered.length;
  const totalAmount = filtered.reduce((sum, r) => sum + (r.currency === 'USD' ? r.amount * 18 : r.amount), 0);
  const pendingCount = filtered.filter((r) => r.status === 'Enviada').length;
  const approvedCount = filtered.filter((r) => r.status === 'Aprobada' || r.status === 'Pagada').length;
  const noInvoiceCount = filtered.filter((r) => !r.file_path).length;

  const areaColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    AREAS.forEach((a, i) => { map[a] = getAreaColor(i); });
    return map;
  }, []);

  const areasMore = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => { counts[r.area] = (counts[r.area] ?? 0) + 1; });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value, color: areaColorMap[label] ?? '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, areaColorMap]);

  const areasFewer = useMemo(() => {
    return [...areasMore].sort((a, b) => a.value - b.value);
  }, [areasMore]);

  const reasonData = useMemo(() => {
    const interna = filtered.filter((r) => r.reason_type === 'Interna').length;
    const externa = filtered.filter((r) => r.reason_type === 'Externa').length;
    return [
      { label: 'Interna', value: interna, color: '#e91e63' },
      { label: 'Externa', value: externa, color: '#64748b' },
    ];
  }, [filtered]);

  const invoiceData = useMemo(() => {
    const conFactura = filtered.filter((r) => !!r.file_path);
    const sinFactura = filtered.filter((r) => !r.file_path);
    const conAmount = conFactura.reduce((sum, r) => sum + (r.currency === 'USD' ? r.amount * 18 : r.amount), 0);
    const sinAmount = sinFactura.reduce((sum, r) => sum + (r.currency === 'USD' ? r.amount * 18 : r.amount), 0);
    return [
      { label: 'Con factura', value: conFactura.length, color: '#e91e63', amount: conAmount },
      { label: 'Sin factura', value: sinFactura.length, color: '#64748b', amount: sinAmount },
    ];
  }, [filtered]);

  const monthlyTrend = useMemo(() => {
    const months: { label: string; value: number; amount: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const monthReqs = filtered.filter((r) => new Date(r.request_date).getMonth() === m);
      const amount = monthReqs.reduce((sum, r) => sum + (r.currency === 'USD' ? r.amount * 18 : r.amount), 0);
      months.push({ label: MONTH_LABELS[m], value: monthReqs.length, amount });
    }
    return months;
  }, [filtered]);

  const tableData = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
  }, [filtered]);

  if (loading) {
    return <div className="text-center text-neutral-500 text-sm py-12">Cargando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Dashboard de Pagos Extraordinarios</h2>
          <p className="text-sm text-neutral-500">Colectivo Tomate · Asociación Civil · Puebla</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-semibold text-neutral-300">Filtros:</span>
          <select value={fYear} onChange={(e) => setFYear(e.target.value)} className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-pink-500">
            {years.map((y) => <option key={y} value={y}>Año {y}</option>)}
          </select>
          <select value={fMonth} onChange={(e) => setFMonth(e.target.value)} className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-pink-500">
            <option value="">Todos los meses</option>
            {MONTH_LABELS.map((m, i) => <option key={m} value={(i + 1).toString().padStart(2, '0')}>{m}</option>)}
          </select>
          <select value={fArea} onChange={(e) => setFArea(e.target.value)} className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-pink-500">
            <option value="">Todas las áreas</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
            <input type="checkbox" checked={fNoInvoice} onChange={(e) => setFNoInvoice(e.target.checked)} className="accent-pink-600" />
            Sin factura / pendiente
          </label>
          <button
            onClick={() => { setFYear(years[0] ?? ''); setFMonth(''); setFArea(''); setFNoInvoice(false); }}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={FileText} label="Total solicitudes" value={totalRequests.toString()} color="pink" />
        <KpiCard icon={DollarSign} label="Monto total (MXN)" value={formatCurrency(totalAmount, 'MXN')} color="rose" />
        <KpiCard icon={Clock} label="Pendientes" value={pendingCount.toString()} color="amber" />
        <KpiCard icon={TrendingUp} label="Aprobadas" value={approvedCount.toString()} color="emerald" />
        <KpiCard icon={AlertCircle} label="Sin factura" value={noInvoiceCount.toString()} color="red" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Áreas con MÁS solicitudes" subtitle="Ranking por número de solicitudes">
          <BarChart data={areasMore} />
        </ChartCard>
        <ChartCard title="Áreas con MENOS solicitudes" subtitle="Ranking ascendente por solicitudes">
          <BarChart data={areasFewer} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Razones: Internas vs Externas" subtitle="Distribución por tipo de razón">
          <DonutChart data={reasonData} />
        </ChartCard>
        <ChartCard title="Con factura vs Sin factura" subtitle="Distribución, porcentajes y montos en MXN">
          <InvoiceChart data={invoiceData} total={filtered.length} />
        </ChartCard>
      </div>

      {/* Line chart */}
      <ChartCard title="Tendencia mensual de solicitudes y montos" subtitle="Volumen y monto total por mes (montos convertidos a MXN)">
        <LineChart data={monthlyTrend} />
      </ChartCard>

      {/* Detail table */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800">
          <h3 className="text-base font-semibold text-white">Tabla de detalle</h3>
          <p className="text-sm text-neutral-500">Listado de solicitudes filtradas</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-850 border-b border-neutral-800" style={{ backgroundColor: '#1a1a1a' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase">Folio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase">Área</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase hidden md:table-cell">Requerimiento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase hidden lg:table-cell">Proyecto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase hidden lg:table-cell">Prioridad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase hidden md:table-cell">Concepto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase hidden lg:table-cell">Razón o motivo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase hidden xl:table-cell">Justificación</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase hidden md:table-cell">Fecha de pago</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase">Factura</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-400 uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {tableData.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-neutral-300">{r.folio}</td>
                  <td className="px-4 py-3 text-sm text-neutral-300">{r.area}</td>
                  <td className="px-4 py-3 text-sm text-neutral-300 hidden md:table-cell max-w-xs truncate">{r.requirement_name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-300 hidden lg:table-cell max-w-xs truncate">{r.project ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-300 hidden lg:table-cell">{r.priority}</td>
                  <td className="px-4 py-3 text-sm text-neutral-300 hidden md:table-cell max-w-xs truncate">{r.payment_concept}</td>
                  <td className="px-4 py-3 text-sm text-neutral-300 hidden lg:table-cell">{r.reason_type}</td>
                  <td className="px-4 py-3 text-sm text-neutral-300 hidden xl:table-cell max-w-xs truncate">{r.reason_text ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-neutral-300 text-right whitespace-nowrap">{formatCurrency(r.amount, r.currency)}</td>
                  <td className="px-4 py-3 text-sm text-neutral-300 hidden md:table-cell whitespace-nowrap">{r.required_payment_date}</td>
                  <td className="px-4 py-3 text-sm">
                    {r.file_path ? (
                      <span className="text-emerald-400 font-medium">Sí</span>
                    ) : (
                      <span className="text-amber-400 font-medium">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-300">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDetail(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-600 text-neutral-300 hover:bg-neutral-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver detalles
                      </button>
                      {(r.status === 'Enviada' || r.status === 'Borrador') && (
                        <>
                          <button
                            onClick={() => { setSelectedRequest(r); setShowApproveModal(true); }}
                            disabled={actionLoadingId === r.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Aprobar
                          </button>
                          <button
                            onClick={() => { setSelectedRequest(r); setShowRejectModal(true); }}
                            disabled={actionLoadingId === r.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-3.5 h-3.5" />
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tableData.length === 0 && (
          <div className="p-8 text-center text-neutral-500 text-sm">Sin datos para mostrar</div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-fadeIn ${
          toast.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-700 text-emerald-300'
            : 'bg-red-950/95 border-red-700 text-red-300'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5 text-emerald-400" /> : <X className="w-5 h-5 text-red-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {selectedRequest && !showApproveModal && !showRejectModal && (
        <DetailModal
          request={selectedRequest}
          fileUrl={fileUrl}
          loadingFile={loadingFile}
          profile={profile}
          onClose={() => setSelectedRequest(null)}
          onApprove={() => setShowApproveModal(true)}
          onReject={() => setShowRejectModal(true)}
          canAct={selectedRequest.status === 'Enviada' || selectedRequest.status === 'Borrador'}
        />
      )}

      {(showApproveModal || showRejectModal) && selectedRequest && (
        <ActionCommentModal
          folio={selectedRequest.folio}
          action={showApproveModal ? 'Aprobar' : 'Rechazar'}
          comment={actionComment}
          setComment={setActionComment}
          loading={actionLoadingId === selectedRequest.id}
          onConfirm={() => updateRequestStatus(selectedRequest.id, selectedRequest.folio, showApproveModal ? 'Aprobada' : 'Rechazada', actionComment)}
          onCancel={() => { setShowApproveModal(false); setShowRejectModal(false); setActionComment(''); }}
        />
      )}
    </div>
  );
}

function DetailModal({
  request,
  fileUrl,
  loadingFile,
  profile,
  onClose,
  onApprove,
  onReject,
  canAct,
}: {
  request: PaymentRequest;
  fileUrl: string | null;
  loadingFile: boolean;
  profile: Profile;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  canAct: boolean;
}) {
  const fields = [
    { label: 'Folio', value: request.folio },
    { label: 'Área', value: request.area },
    { label: 'Requerimiento', value: request.requirement_name },
    { label: 'Proyecto', value: request.project ?? '—' },
    { label: 'Prioridad', value: request.priority },
    { label: 'Concepto de pago', value: request.payment_concept },
    { label: 'Monto', value: formatCurrency(request.amount, request.currency) },
    { label: 'Fecha de pago', value: request.required_payment_date },
    { label: 'Razón o motivo', value: request.reason_type },
    { label: 'Justificación', value: request.reason_text ?? '—' },
    { label: 'Factura', value: request.file_path ? 'Sí' : 'Pendiente' },
    { label: 'Estado', value: request.status },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b border-neutral-800 px-6 py-4 sticky top-0 bg-neutral-900 z-10">
          <h4 className="text-lg font-bold text-white">Detalle de Solicitud: {request.folio}</h4>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {fields.map((f) => (
              <div key={f.label} className={f.label === 'Justificación' ? 'col-span-2' : ''}>
                <span className="text-neutral-500 font-medium block mb-0.5">{f.label}</span>
                <span className="text-neutral-200">{f.value}</span>
              </div>
            ))}
            {request.observations && (
              <div className="col-span-2">
                <span className="text-neutral-500 font-medium block mb-0.5">Observaciones</span>
                <span className="text-neutral-200">{request.observations}</span>
              </div>
            )}
            {request.approver_observations && (
              <div className="col-span-2">
                <span className="text-neutral-500 font-medium block mb-0.5">Comentario del administrador</span>
                <span className="text-neutral-200">{request.approver_observations}</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
            <span className="text-neutral-500 font-medium block mb-2">Documento adjunto</span>
            {loadingFile ? (
              <span className="text-neutral-400 text-sm">Cargando documento...</span>
            ) : fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-pink-500/15 text-pink-400 hover:bg-pink-500/25 px-4 py-2 rounded-lg text-sm font-medium border border-pink-500/30 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
                {request.file_name ?? 'Abrir documento adjunto'}
              </a>
            ) : (
              <span className="text-amber-400 italic text-sm">No se adjuntó factura. Pendiente de comprobar.</span>
            )}
          </div>

          {/* Chat module */}
          <RequestChat requestId={request.id} profile={profile} />

          {canAct && (
            <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
              <button
                onClick={onReject}
                className="bg-red-600/20 text-red-400 hover:bg-red-600/30 px-4 py-2 rounded-lg text-sm font-medium border border-red-500/30 transition-colors"
              >
                Rechazar
              </button>
              <button
                onClick={onApprove}
                className="bg-emerald-600 text-white hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Aprobar solicitud
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionCommentModal({
  folio,
  action,
  comment,
  setComment,
  loading,
  onConfirm,
  onCancel,
}: {
  folio: string;
  action: string;
  comment: string;
  setComment: (v: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-fadeIn" onClick={onCancel}>
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-lg font-bold text-white mb-1">{action} solicitud {folio}</h4>
        <p className="text-sm text-neutral-500 mb-4">Escriba un motivo o comentario (opcional)</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          autoFocus
          className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors resize-none"
          placeholder={`Motivo de ${action.toLowerCase()}...`}
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              action === 'Aprobar' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {loading ? 'Procesando...' : `Confirmar ${action.toLowerCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceChart({ data, total }: { data: { label: string; value: number; color: string; amount: number }[]; total: number }) {
  if (total === 0) return <div className="text-center text-neutral-500 text-sm py-12">Sin datos</div>;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <div className="space-y-3">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-sm text-neutral-400">{d.label}</span>
                <span className="text-sm font-semibold text-white">{pct}%</span>
                <span className="text-sm font-bold text-neutral-200">({d.value})</span>
              </div>
              <span className="text-xs text-neutral-500 pl-5.5">Monto: {formatCurrency(d.amount, 'MXN')}</span>
            </div>
          );
        })}
      </div>
      <div className="relative" style={{ width: 180, height: 180 }}>
        <svg width={180} height={180} className="-rotate-90">
          <circle cx={90} cy={90} r={74} fill="none" stroke="#262626" strokeWidth={32} />
          {(() => {
            const circumference = 2 * Math.PI * 74;
            let offset = 0;
            return data.map((d, i) => {
              const fraction = d.value / total;
              const dash = fraction * circumference;
              const segment = (
                <circle
                  key={i}
                  cx={90}
                  cy={90}
                  r={74}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={32}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              );
              offset -= dash;
              return segment;
            });
          })()}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{total}</span>
          <span className="text-xs text-neutral-500">Total</span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Borrador: 'bg-neutral-700/50 text-neutral-300 border-neutral-600/50',
    Enviada: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Aprobada: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Rechazada: 'bg-red-500/10 text-red-400 border-red-500/30',
    Pagada: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? styles.Borrador}`}>
      {status}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: typeof FileText; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    pink: 'bg-pink-500/10 text-pink-400',
    rose: 'bg-rose-500/10 text-rose-400',
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    red: 'bg-red-500/10 text-red-400',
  };
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-sm text-neutral-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
