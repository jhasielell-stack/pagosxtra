import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, User, Briefcase, Building2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { AREAS } from '@/types';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [area, setArea] = useState('Asistencia');
  const [jobTitle, setJobTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Ingresa tu correo y contraseña.');
        setLoading(false);
        return;
      }
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      if (!fullName.trim() || !email.trim() || !password) {
        setError('Completa todos los campos obligatorios.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, area, jobTitle);
      if (error) {
        setError(error);
      }
    }
    setLoading(false);
  }

  const areas = AREAS;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={64} showText={false} />
          </div>
          <h1 className="text-2xl font-bold text-white">Colectivo Tomate</h1>
          <p className="text-neutral-400 mt-1 text-sm">Sistema de Pagos Extraordinarios</p>
          <p className="text-neutral-600 mt-0.5 text-xs">Asociación Civil · Puebla</p>
        </div>

        <div className="bg-neutral-900/80 backdrop-blur rounded-2xl border border-neutral-800 p-8 shadow-2xl">
          <div className="flex gap-2 mb-6 bg-neutral-950/50 rounded-lg p-1">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'login' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-pink-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-neutral-950/60 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Área</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full bg-neutral-950/60 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors appearance-none"
                  >
                    {areas.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Cargo</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                    className="w-full bg-neutral-950/60 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                    placeholder="Tu cargo"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-neutral-950/60 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                  placeholder="tucorreo@colectivotomate.org"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'signup' ? 6 : 1}
                  className="w-full bg-neutral-950/60 border border-neutral-700 rounded-lg pl-10 pr-10 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                  placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-500 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-600/20"
            >
              {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
