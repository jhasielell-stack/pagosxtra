import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Layout, { Page } from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';
import RequestForm from '@/pages/RequestForm';
import MyRequests from '@/pages/MyRequests';
import ProfileSettings from '@/pages/ProfileSettings';
import { TomatoMark } from '@/components/Logo';

function App() {
  const { profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('form');

  const isAdmin = profile?.role === 'administrador';

  useEffect(() => {
    if (profile) {
      if (isAdmin) {
        setPage('dashboard');
      } else {
        setPage((prev) => (prev === 'dashboard' ? 'form' : prev));
      }
    }
  }, [profile, isAdmin]);

  useEffect(() => {
    if (!profile) return;
    if (isAdmin && page !== 'dashboard') {
      setPage('dashboard');
    }
  }, [profile, page, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <TomatoMark size={48} />
          </div>
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Cargando Colectivo Tomate...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <LoginPage />;
  }

  const solicitantePages: Page[] = ['form', 'my-requests', 'profile-settings'];

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {isAdmin ? (
        page === 'profile-settings' ? (
          <ProfileSettings />
        ) : (
          <Dashboard />
        )
      ) : page === 'my-requests' ? (
        <MyRequests onNewRequest={() => setPage('form')} />
      ) : page === 'profile-settings' ? (
        <ProfileSettings />
      ) : (
        <RequestForm
          onSubmitted={() => setPage('my-requests')}
          onNavigateToMyRequests={() => setPage('my-requests')}
        />
      )}
    </Layout>
  );
}

export default App;
