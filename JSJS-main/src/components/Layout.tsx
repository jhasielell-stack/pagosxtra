import { useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Notification, UserRole } from '@/types';
import { LayoutDashboard, ClipboardList, Plus, Bell, LogOut, Menu, ListChecks, Settings } from 'lucide-react';
import Logo from '@/components/Logo';

export type Page = 'dashboard' | 'form' | 'approvals' | 'my-requests' | 'profile-settings';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

const NAV_ITEMS: { key: Page; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['administrador'] },
  { key: 'form', label: 'Nueva Solicitud', icon: Plus, roles: ['solicitante', 'aprobador'] },
  { key: 'my-requests', label: 'Mis Solicitudes', icon: ListChecks, roles: ['solicitante', 'aprobador'] },
  { key: 'profile-settings', label: 'Configuración', icon: Settings, roles: ['solicitante', 'aprobador', 'administrador'] },
];

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const visibleNav = NAV_ITEMS.filter((item) => profile && item.roles.includes(profile.role));
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  async function fetchNotifications() {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications((data as Notification[]) ?? []);
  }

  async function markAllRead() {
    if (!profile) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false);
    fetchNotifications();
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleLabel: Record<UserRole, string> = {
    solicitante: 'Solicitante',
    aprobador: 'Aprobador',
    administrador: 'Administrador',
  };

  // If trying to access dashboard without admin role, redirect to approvals
  const currentNavItem = NAV_ITEMS.find((n) => n.key === currentPage);
  const canViewCurrent = currentNavItem && profile && currentNavItem.roles.includes(profile.role);

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-neutral-900 text-white flex flex-col transition-transform duration-300 border-r border-neutral-800 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex items-center px-5 py-5 border-b border-neutral-800">
          <Logo size={40} />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}

          {profile?.role !== 'administrador' && (
            <div className="px-3 py-6">
              <div className="rounded-lg bg-neutral-800/50 border border-neutral-700/50 px-3 py-2.5">
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Crea y da seguimiento a tus solicitudes de pago extraordinario.
                </p>
              </div>
            </div>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-neutral-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
            <p className="text-xs text-neutral-400">{profile ? roleLabel[profile.role] : ''} {profile?.area ? `· ${profile.area}` : ''}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-neutral-900 border-b border-neutral-800 px-4 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <Menu className="w-5 h-5 text-neutral-300" />
            </button>
            <h2 className="text-base font-semibold text-white">
              {currentNavItem?.label ?? ''}
            </h2>
          </div>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotif(!showNotif); if (!showNotif && unreadCount > 0) markAllRead(); }}
              className="relative p-2 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-neutral-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 bg-neutral-900 rounded-xl shadow-2xl border border-neutral-700 max-h-96 overflow-y-auto z-50">
                <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Notificaciones</span>
                  {notifications.length > 0 && (
                    <span className="text-xs text-neutral-500">{notifications.length} total</span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-neutral-500">Sin notificaciones</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-neutral-800 last:border-0 ${!n.read ? 'bg-pink-500/5' : ''}`}
                    >
                      <p className="text-sm text-neutral-300">{n.message}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {new Date(n.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          {canViewCurrent ? children : (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md">
                <div className="inline-block mb-4">
                  <Logo size={56} showText={false} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Acceso restringido</h3>
                <p className="text-sm text-neutral-400">
                  Esta sección está disponible únicamente para usuarios con rol de Administrador.
                  Si necesitas acceso a las métricas y gráficos, contacta al administrador del sistema.
                </p>
                <button
                  onClick={() => onNavigate('form')}
                  className="mt-6 px-5 py-2.5 rounded-lg text-sm font-medium bg-pink-600 text-white hover:bg-pink-500 transition-colors"
                >
                  Ir a Nueva Solicitud
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
