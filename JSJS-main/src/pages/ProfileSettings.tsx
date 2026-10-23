import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AREAS } from '@/types';
import { User, Building2, Briefcase, Save, CheckCircle2, AlertCircle, Mail } from 'lucide-react';

export default function ProfileSettings() {
  const { profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [area, setArea] = useState(profile?.area ?? 'Asistencia');
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    if (!fullName.trim()) {
      showToast('El nombre no puede estar vacío', 'error');
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      full_name: fullName.trim(),
      area,
      job_title: jobTitle.trim(),
    });
    if (error) {
      showToast(error, 'error');
    } else {
      showToast('Perfil actualizado correctamente', 'success');
    }
    setSaving(false);
  }

  if (!profile) return null;

  const inputClass = 'w-full bg-neutral-950/60 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors';
  const labelClass = 'block text-sm font-medium text-neutral-300 mb-1.5';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Configuración de Perfil</h2>
        <p className="text-sm text-neutral-500">Actualiza tu información personal cuando lo necesites</p>
      </div>

      {/* Profile card */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
        {/* Avatar + email (read-only) */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-neutral-800">
          <div className="w-16 h-16 rounded-full bg-pink-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-white truncate">{profile.full_name}</p>
            <p className="text-sm text-neutral-500 truncate">{profile.email}</p>
            <p className="text-xs text-neutral-600 mt-0.5">
              Cuenta creada el {new Date(profile.created_at).toLocaleDateString('es-MX')}
            </p>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nombre de usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="Tu nombre completo"
              />
            </div>
            <p className="text-xs text-neutral-600 mt-1.5">Este es el nombre que verán los administradores en tus solicitudes.</p>
          </div>

          <div>
            <label className={labelClass}>Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                type="email"
                value={profile.email}
                disabled
                className={inputClass + ' opacity-60 cursor-not-allowed'}
              />
            </div>
            <p className="text-xs text-neutral-600 mt-1.5">El correo no se puede cambiar. Si necesitas actualizarlo, contacta al administrador.</p>
          </div>

          <div>
            <label className={labelClass}>Área</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className={inputClass + ' appearance-none'}
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Cargo</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className={inputClass}
                placeholder="Tu cargo o puesto"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-pink-600 text-white hover:bg-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-600/20"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6">
        <h3 className="text-sm font-semibold text-white mb-3">Información de cuenta</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Rol</span>
            <span className="text-neutral-300 capitalize">{profile.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Área asignada</span>
            <span className="text-neutral-300">{profile.area}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">ID de usuario</span>
            <span className="text-neutral-600 font-mono text-xs">{profile.id.slice(0, 8)}...</span>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-fadeIn ${
          toast.type === 'success'
            ? 'bg-emerald-950/95 border-emerald-700 text-emerald-300'
            : 'bg-red-950/95 border-red-700 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
