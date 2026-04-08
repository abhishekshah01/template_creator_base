import { useState } from 'react';
import Sidebar from './components/Sidebar';
import CreateTemplate from './components/CreateTemplate';
import TemplateSummary from './components/TemplateSummary';
import UpdateCategory from './components/UpdateCategory';
import { ConfigAll, ConfigCreate, ConfigSummary, ConfigDetailPage } from './components/CategoryConfig';

export default function App() {
  const [activePage, setActivePage] = useState('create-template');
  const [bearerToken, setBearerToken] = useState(() => localStorage.getItem('bearer_token') || '');
  const [configDetailId, setConfigDetailId] = useState(null);

  function updateToken(token) {
    setBearerToken(token);
    localStorage.setItem('bearer_token', token);
  }

  function navigate(page, param) {
    if (page === 'config-detail') {
      setConfigDetailId(param);
    }
    setActivePage(page);
  }

  function renderPage() {
    switch (activePage) {
      case 'create-template':
        return <CreateTemplate />;
      case 'template-summary':
        return <TemplateSummary bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'update-category':
        return <UpdateCategory bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'config-all':
        return <ConfigAll onNavigate={navigate} bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'config-create':
        return <ConfigCreate bearerToken={bearerToken} onTokenExpired={() => updateToken('')} onNavigate={navigate} />;
      case 'config-summary':
        return <ConfigSummary bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'config-detail':
        return <ConfigDetailPage configId={configDetailId} onNavigate={navigate} />;
      default:
        return <CreateTemplate />;
    }
  }

  return (
    <div className="flex min-h-screen bg-gh-canvas text-gh-text font-sans">
      <Sidebar activePage={activePage} onNavigate={navigate} bearerToken={bearerToken} onTokenChange={updateToken} />
      <main className="ml-60 flex-1 min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
