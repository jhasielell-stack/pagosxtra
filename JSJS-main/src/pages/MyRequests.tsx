import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/cutoff';
import type { PaymentRequest, RequestStatus, Profile } from '@/types';
import RequestChat from '@/components/RequestChat';
import {
  ClipboardList, FileText, Clock, CheckCircle2, XCircle, Search, ChevronRight,
  Paperclip, Download, Send, Upload, MessageSquare, AlertCircle, X, RotateCcw,
} from 'lucide-react';

interface MyRequestsProps {
  onNewRequest: () => void;
}

const STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; border: string; icon: typeof Clock }> = {
  Borrador: { bg: 'bg-neutral-700/40', text: 'text-neutral-300', border: 'border-neutral-600/40', icon: FileText },
  Enviada: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', icon: Clock },
  Aprobada: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle2 },
  Rechazada: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'bg-red-500/30', icon: XCircle },
  Pagada: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30', icon: CheckCircle2 },
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  Borrador: 'Borrador',
  Enviada: 'Pendiente',
  Aprobada: 'Aprobada',
  Rechazada: 'Rechazada',
  Pagada: 'Pagada',
};

export default function MyRequests({ onNewRequest }: MyRequestsProps) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selected, setSelected] = useState<PaymentRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [profile]);

  async function fetchRequests() {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setRequests(data as PaymentRequest[]);
    }
    setLoading(false);
  }

  const filtered = requests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.folio.toLowerCase().includes(q) ||
        r.requirement_name.toLowerCase().includes(q) ||
        r.payment_concept.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    total: requests.length,
    pendientes: requests.filter((r) => r.status === 'Enviada').length,
    aprobadas: requests.filter((r) => r.status === 'Aprobada' || r.status === 'Pagada').length,
    rechazadas: requests.filter((r) => r.status === 'Rechazada').length,
  };

  function handleOpenDetail(req: PaymentRequest) {
    setSelected(req);
  }

  function handleUpdatedRequest(updated: PaymentRequest) {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelected(updated);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Mis Solicitudes</h2>
          <p className="text-sm text-neutral-500">Colectivo Tomate · Asociación Civil · Puebla</p>
        </div>
        <button
          onClick={onNewRequest}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-pink-600 text-white hover:bg-pink-500 transition-colors shadow-lg shadow-pink-600/20"
        >
          <ClipboardList className="w-4 h-4" />
          Nueva Solicitud
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Total" value={counts.total} icon={FileText} color="text-neutral-300 bg-neutral-800/60" />
        <SummaryCard label="Pendientes" value={counts.pendientes} icon={Clock} color="text-amber-400 bg-amber-500/10" />
        <SummaryCard label="Aprobadas" value={counts.aprobadas} icon={CheckCircle2} color="text-emerald-400 bg-emerald-500/10" />
        <SummaryCard label="Rechazadas" value={counts.rechazadas} icon={XCircle} color="text-red-400 bg-red-500/10" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio, requerimiento o concepto..."
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-pink-500"
        >
          <option value="">Todos los estatus</option>
          <option value="Enviada">Pendiente</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Rechazada">Rechazada</option>
          <option value="Pagada">Pagada</option>
          <option value="Borrador">Borrador</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-neutral-500 text-sm py-12">Cargando solicitudes...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-white mb-2">
            {requests.length === 0 ? 'No tienes solicitudes aún' : 'Sin resultados'}
          </h3>
          <p className="text-sm text-neutral-500 mb-6">
            {requests.length === 0
              ? 'Crea tu primera solicitud de pago extraordinario para comenzar.'
              : 'Prueba con otros criterios de búsqueda.'}
          </p>
          {requests.length === 0 && (
            <button
              onClick={onNewRequest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-pink-600 text-white hover:bg-pink-500 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              Crear Nueva Solicitud
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const style = STATUS_STYLES[r.status];
            const Icon = style.icon;
            const canResubmit = r.status === 'Rechazada' || r.status === 'Borrador';
            const noInvoice = !r.file_path;
            return (
              <div
                key={r.id}
                onClick={() => handleOpenDetail(r)}
                className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 hover:border-neutral-700 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-sm font-mono font-semibold text-pink-400">{r.folio}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
                        <Icon className="w-3 h-3" />
                        {STATUS_LABELS[r.status]}
                      </span>
                      {noInvoice && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <AlertCircle className="w-3 h-3" />
                          Factura pendiente
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-1 truncate">{r.requirement_name}</h4>
                    <p className="text-sm text-neutral-500 mb-2 truncate">{r.payment_concept}</p>
                    <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                      <span>Fecha: {new Date(r.request_date).toLocaleDateString('es-MX')}</span>
                      <span className="font-medium text-neutral-300">{formatCurrency(r.amount, r.currency)}</span>
                      <span>Area: {r.area}</span>
                      <span>Prioridad: {r.priority}</span>
                    </div>
                    {canResubmit && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-pink-400">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Toca para revisar comentarios, subir factura y reenviar</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-neutral-500 transition-colors flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && profile && (
        <RequestDetailModal
          request={selected}
          profile={profile}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdatedRequest}
        />
      )}
    </div>
  );
}

function RequestDetailModal({
  request,
  profile,
  onClose,
  onUpdated,
}: {
  request: PaymentRequest;
  profile: Profile;
  onClose: () => void;
  onUpdated: (req: PaymentRequest) => void;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(true);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const canResubmit = request.status === 'Rechazada' || request.status === 'Borrador';

  const fetchFileUrl = useCallback(async () => {
    if (!request.file_path) {
      setLoadingFile(false);
      return;
    }
    const { data } = await supabase.storage.from('payment-files').createSignedUrl(request.file_path, 3600);
    if (data) setFileUrl(data.signedUrl);
    setLoadingFile(false);
  }, [request.file_path]);

  useEffect(() => {
    fetchFileUrl();
  }, [fetchFileUrl]);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleUploadInvoice() {
    if (!newFile || !profile) return;
    setUploading(true);
    const ext = newFile.name.split('.').pop();
    const uniqueName = `${request.folio}-invoice-${Date.now()}.${ext}`;
    const path = `${profile.id}/${uniqueName}`;
    const { error: uploadError } = await supabase.storage.from('payment-files').upload(path, newFile);
    if (uploadError) {
      showToast('Error al subir la factura', 'error');
      setUploading(false);
      return;
    }

    const { data, error: updateError } = await supabase
      .from('payment_requests')
      .update({
        file_path: path,
        file_name: newFile.name,
        file_type: newFile.type,
      })
      .eq('id', request.id)
      .select()
      .single();

    if (updateError || !data) {
      showToast('Error al guardar la factura', 'error');
    } else {
      onUpdated(data as PaymentRequest);
      setNewFile(null);
      showToast('Factura subida correctamente', 'success');
      setFileUrl(null);
      setLoadingFile(true);
      fetchFileUrl();
    }
    setUploading(false);
  }

  async function handleResubmit() {
    if (!profile) return;
    setResubmitting(true);
    const { data, error } = await supabase
      .from('payment_requests')
      .update({
        status: 'Enviada',
        approver_observations: null,
        approved_at: null,
      })
      .eq('id', request.id)
      .select()
      .single();

    if (error || !data) {
      showToast('Error al reenviar la solicitud', 'error');
    } else {
      onUpdated(data as PaymentRequest);
      showToast(`Solicitud ${request.folio} reenviada para revisión`, 'success');
    }
    setResubmitting(false);
  }

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
        <div className="flex justify-between items-center border-b border-neutral-800 px-6 py-4 sticky top-0 bg-neutral-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">{request.folio}</h4>
              <p className="text-sm text-neutral-500">{request.requirement_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Admin comment for rejected/pending requests */}
          {request.approver_observations && (
            <div className={`rounded-xl border p-4 ${
              request.status === 'Rechazada'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-semibold text-neutral-300">Comentario del administrador</span>
              </div>
              <p className="text-sm text-neutral-200">{request.approver_observations}</p>
            </div>
          )}

          {/* Fields */}
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
          </div>

          {/* Current file */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
            <span className="text-neutral-500 font-medium block mb-2">Factura / Comprobante adjunto</span>
            {loadingFile ? (
              <span className="text-neutral-400 text-sm">Cargando documento...</span>
            ) : fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-pink-500/15 text-pink-400 hover:bg-pink-500/25 px-4 py-2 rounded-lg text-sm font-medium border border-pink-500/30 transition-colors"
              >
                <Download className="w-4 h-4" />
                {request.file_name ?? 'Abrir documento'}
              </a>
            ) : (
              <span className="text-amber-400 italic text-sm">No se ha adjuntado factura. Pendiente de comprobar.</span>
            )}
          </div>

          {/* Upload invoice section — available for rejected/draft/pending */}
          {(canResubmit || !request.file_path) && (
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
              <span className="text-neutral-500 font-medium block mb-2">
                {request.file_path ? 'Reemplazar factura' : 'Subir factura o comprobante'}
              </span>
              <p className="text-xs text-neutral-600 mb-3">
                Si tiene la factura en este momento, súbala aquí. Puede adjuntar PDF, XML o imagen.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <label className="cursor-pointer flex-1 w-full">
                  <input
                    type="file"
                    accept=".pdf,.xml,image/*"
                    className="hidden"
                    onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="w-full bg-neutral-900 border-2 border-dashed border-neutral-700 rounded-lg px-4 py-4 text-sm text-neutral-400 hover:border-pink-500 transition-colors flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {newFile ? newFile.name : 'Seleccionar archivo...'}
                  </div>
                </label>
                <button
                  onClick={handleUploadInvoice}
                  disabled={!newFile || uploading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-pink-600 text-white hover:bg-pink-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Paperclip className="w-4 h-4" />
                  {uploading ? 'Subiendo...' : 'Subir factura'}
                </button>
              </div>
            </div>
          )}

          {/* Chat */}
          <RequestChat requestId={request.id} profile={profile} />

          {/* Resubmit button */}
          {canResubmit && (
            <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
              <button
                onClick={handleResubmit}
                disabled={resubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-pink-600 text-white hover:bg-pink-500 transition-colors disabled:opacity-50 shadow-lg shadow-pink-600/20"
              >
                <Send className="w-4 h-4" />
                {resubmitting ? 'Enviando...' : 'Reenviar solicitud para revisión'}
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-fadeIn ${
          toast.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-700 text-emerald-300'
            : 'bg-red-950/95 border-red-700 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof FileText; color: string }) {
  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  );
}
