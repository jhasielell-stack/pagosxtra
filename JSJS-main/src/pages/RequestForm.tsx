import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AREAS, PRIORITIES, REASON_TYPES, CURRENCIES } from '@/types';
import type { PaymentRequest, Area, Priority, ReasonType, Currency } from '@/types';
import { CheckCircle2, XCircle, Send, Save, FileText, ListChecks, Plus } from 'lucide-react';

const PRIORITIES_ORDER: Record<Priority, string> = {
  Urgente: 'text-red-400 bg-red-500/15 border-red-500/30',
  Alta: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  Media: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  Baja: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
};

interface RequestFormProps {
  onSubmitted?: () => void;
  onNavigateToMyRequests?: () => void;
}

export default function RequestForm({ onSubmitted, onNavigateToMyRequests }: RequestFormProps) {
  const { profile } = useAuth();

  const [folio, setFolio] = useState('');
  const [area, setArea] = useState<Area>(profile?.area ?? 'Asistencia');
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? '');
  const [requirementName, setRequirementName] = useState('');
  const [priority, setPriority] = useState<Priority>('Media');
  const [project, setProject] = useState('');
  const [paymentConcept, setPaymentConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('MXN');
  const [reasonType, setReasonType] = useState<ReasonType>('Interna');
  const [reasonText, setReasonText] = useState('');
  const [requiredPaymentDate, setRequiredPaymentDate] = useState('');
  const [observations, setObservations] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [successFolio, setSuccessFolio] = useState<string>('');
  const [successDraft, setSuccessDraft] = useState(false);
  const [successPaymentDate, setSuccessPaymentDate] = useState<string | null>(null);

  useEffect(() => {
    async function getFolio() {
      const { data, error } = await supabase.rpc('generate_folio');
      if (!error && data) setFolio(data as string);
    }
    getFolio();
  }, []);

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: FormEvent, saveAsDraft: boolean) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!profile) return;
    if (!requiredPaymentDate) { setError('Debe seleccionar una fecha de pago requerida.'); return; }

    setLoading(true);
    let filePath: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    if (file) {
      const ext = file.name.split('.').pop();
      const uniqueName = `${folio}-${Date.now()}.${ext}`;
      const path = `${profile.id}/${uniqueName}`;
      const { error: uploadError } = await supabase.storage.from('payment-files').upload(path, file);
      if (uploadError) { setError(`Error al subir archivo: ${uploadError.message}`); setLoading(false); return; }
      filePath = path; fileName = file.name; fileType = file.type;
    }

    const insertData: Partial<PaymentRequest> = { user_id: profile.id, folio, area, job_title: jobTitle, requirement_name: requirementName, priority, project, payment_concept: paymentConcept, amount: parseFloat(amount), currency, reason_type: reasonType, reason_text: reasonText || null, requires_invoice: !!file, file_path: filePath, file_name: fileName, file_type: fileType, required_payment_date: requiredPaymentDate, observations: observations || null, status: saveAsDraft ? 'Borrador' : 'Enviada' };
    const { data, error: insertError } = await supabase.from('payment_requests').insert(insertData).select().single();

    if (insertError) { setError(`Error al guardar: ${insertError.message}`); setLoading(false); return; }

    if (!saveAsDraft && data) {
      const { data: approvers } = await supabase.from('profiles').select('id').eq('role', 'aprobador').eq('area', area);
      if (approvers && approvers.length > 0) {
        const notifInserts = approvers.map((a) => ({ user_id: a.id, request_id: data.id, message: `Nueva solicitud ${folio} - ${requirementName} (${priority})`, type: 'new_request', read: false }));
        await supabase.from('notifications').insert(notifInserts);
      }
      await supabase.from('notifications').insert({ user_id: profile.id, request_id: data.id, message: `Solicitud ${folio} enviada correctamente`, type: 'new_request', read: false });
    }

    setSuccessFolio(folio);
    setSuccessDraft(saveAsDraft);
    setSuccessPaymentDate(requiredPaymentDate);
    setSuccess(saveAsDraft ? `Solicitud ${folio} guardada como borrador.` : `Solicitud ${folio} enviada correctamente.`);
    setLoading(false);

    setRequirementName(''); setProject(''); setPaymentConcept(''); setAmount(''); setReasonText(''); setObservations(''); setFile(null);
    const fileInput = document.getElementById('file-input') as HTMLInputElement; if (fileInput) fileInput.value = '';

    // Refresh folio for next request
    const { data: newFolio } = await supabase.rpc('generate_folio');
    if (newFolio) setFolio(newFolio as string);
  }

  function handleNewRequest() {
    setSuccess(null);
    setSuccessFolio('');
    setSuccessDraft(false);
    setSuccessPaymentDate(null);
  }

  function handleGoToMyRequests() {
    setSuccess(null);
    setSuccessFolio('');
    setSuccessDraft(false);
    setSuccessPaymentDate(null);
    if (onNavigateToMyRequests) onNavigateToMyRequests();
    if (onSubmitted) onSubmitted();
  }

  const inputClass = "w-full bg-neutral-950/60 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors";
  const labelClass = "block text-sm font-medium text-neutral-300 mb-1.5";

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 lg:p-10 text-center animate-fadeIn">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${successDraft ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
            {successDraft ? (
              <Save className="w-10 h-10 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            {successDraft ? 'Borrador guardado' : 'Solicitud enviada con exito'}
          </h2>

          <p className="text-sm text-neutral-400 mb-6 max-w-md mx-auto">
            {successDraft
              ? `Tu solicitud ${successFolio} se ha guardado como borrador. Podras editarla y enviarla cuando estes listo.`
              : `Tu solicitud de pago extraordinario ${successFolio} ha sido enviada para revision. Recibiras una notificacion cuando se apruebe o rechace.`}
          </p>

          <div className="bg-neutral-950/60 rounded-xl border border-neutral-800 px-5 py-4 mb-8 text-left max-w-sm mx-auto">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-neutral-500">Folio</span>
              <span className="font-mono font-semibold text-pink-400">{successFolio}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-neutral-500">Estatus</span>
              <span className={`font-medium ${successDraft ? 'text-amber-400' : 'text-emerald-400'}`}>
                {successDraft ? 'Borrador' : 'Pendiente de revision'}
              </span>
            </div>
            {!successDraft && successPaymentDate && (
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-neutral-500">Fecha de pago</span>
                <span className="font-medium text-neutral-200">{successPaymentDate}</span>
              </div>
            )}
            {!successDraft && !successPaymentDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Fecha de pago</span>
                <span className="font-medium text-neutral-200">{successPaymentDate ? successPaymentDate : 'Por confirmar'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!successDraft && (
              <button
                onClick={handleGoToMyRequests}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium bg-pink-600 text-white hover:bg-pink-500 transition-colors shadow-lg shadow-pink-600/20"
              >
                <ListChecks className="w-4 h-4" />
                Ver mis solicitudes
              </button>
            )}
            <button
              onClick={handleNewRequest}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear otra solicitud
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Nueva Solicitud de Pago Extraordinario</h2>
        <p className="text-sm text-neutral-500">Colectivo Tomate · Asociación Civil · Puebla</p>
      </div>
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 flex items-center gap-3">
          <XCircle className="w-5 h-5 flex-shrink-0" /><span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-white" /></div>
            <div><h3 className="text-lg font-semibold text-white">Datos de la Solicitud</h3><p className="text-sm text-neutral-500">Información principal del pago extraordinario</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className={labelClass}>Folio</label><input type="text" value={folio} disabled className="w-full bg-neutral-950/40 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm font-mono text-neutral-500" /></div>
            <div><label className={labelClass}>Fecha de solicitud</label><input type="text" value={today} disabled className="w-full bg-neutral-950/40 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-neutral-500" /></div>
            <div><label className={labelClass}>Solicitante</label><input type="text" value={profile?.full_name ?? ''} disabled className="w-full bg-neutral-950/40 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-neutral-500" /></div>
            <div><label className={labelClass}>Área <span className="text-pink-500">*</span></label><select value={area} onChange={(e) => setArea(e.target.value as Area)} className={inputClass}>{AREAS.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
            <div><label className={labelClass}>Cargo del solicitante <span className="text-pink-500">*</span></label><input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required className={inputClass} /></div>
            <div><label className={labelClass}>Prioridad <span className="text-pink-500">*</span></label><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={`w-full border rounded-lg px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 transition-colors ${PRIORITIES_ORDER[priority]}`}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div className="md:col-span-2"><label className={labelClass}>Nombre del requerimiento <span className="text-pink-500">*</span></label><input type="text" value={requirementName} onChange={(e) => setRequirementName(e.target.value)} required className={inputClass} placeholder="Breve descripción del requerimiento" /></div>
            <div><label className={labelClass}>Proyecto</label><input type="text" value={project} onChange={(e) => setProject(e.target.value)} className={inputClass} placeholder="Nombre del proyecto" /></div>
            <div className="md:col-span-2"><label className={labelClass}>Concepto de pago <span className="text-pink-500">*</span></label><input type="text" value={paymentConcept} onChange={(e) => setPaymentConcept(e.target.value)} required className={inputClass} placeholder="Detalle del concepto de pago" /></div>
            <div className="flex gap-3">
              <div className="flex-1"><label className={labelClass}>Monto <span className="text-pink-500">*</span></label><input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className={inputClass} placeholder="0.00" /></div>
              <div className="w-24"><label className={labelClass}>Moneda</label><select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={inputClass}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Razón o motivo y Comprobantes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className={labelClass}>Razón o motivo <span className="text-pink-500">*</span></label><select value={reasonType} onChange={(e) => setReasonType(e.target.value as ReasonType)} className={inputClass}>{REASON_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
            <div><label className={labelClass}>Justificación</label><input type="text" value={reasonText} onChange={(e) => setReasonText(e.target.value)} className={inputClass} placeholder="Describa la justificación del pago" /></div>
          </div>
          <div className="mb-4">
            <label className={labelClass}>Subir factura (PDF o XML) <span className="text-neutral-500 text-xs font-normal">(opcional)</span></label>
            <div className="relative">
              <input id="file-input" type="file" accept=".pdf,.xml,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full bg-neutral-950/60 border-2 border-dashed border-neutral-700 rounded-lg px-4 py-6 text-sm text-neutral-400 focus:outline-none focus:border-pink-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-pink-500/20 file:text-pink-400 hover:file:bg-pink-500/30" />
              {file && <div className="mt-2 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="w-4 h-4" /><span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span></div>}
              <p className="text-xs text-neutral-500 mt-2">Si tiene la factura en este momento, súbala aquí. Si no la tiene o no aplica, puede continuar sin adjuntar nada.</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Fecha de Pago y Observaciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className={labelClass}>Fecha requerida de pago <span className="text-pink-500">*</span></label><input type="date" value={requiredPaymentDate} onChange={(e) => setRequiredPaymentDate(e.target.value)} required min={today} className={inputClass} /><p className="text-xs text-neutral-500 mt-1">Seleccione la fecha en que se requiere el pago.</p></div>
            <div><label className={labelClass}>Observaciones</label><textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Comentarios adicionales (opcional)" /></div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button type="button" onClick={(e) => handleSubmit(e as unknown as FormEvent, true)} disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-medium border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2 justify-center"><Save className="w-4 h-4" />Guardar borrador</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg text-sm font-medium bg-pink-600 text-white hover:bg-pink-500 transition-colors disabled:opacity-50 shadow-lg shadow-pink-600/20 flex items-center gap-2 justify-center"><Send className="w-4 h-4" />{loading ? 'Enviando...' : 'Enviar solicitud'}</button>
        </div>
      </form>
    </div>
  );
}
