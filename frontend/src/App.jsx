import { useState } from 'react';
import Sidebar from './components/Sidebar';
import CreateTemplate from './components/CreateTemplate';
import TemplateSummary from './components/TemplateSummary';
import UpdateCategory from './components/UpdateCategory';

const pages = {
  'create-template': CreateTemplate,
  'template-summary': TemplateSummary,
  'update-category': UpdateCategory,
};

export default function App() {
  const [activePage, setActivePage] = useState('create-template');
  const [bearerToken, setBearerToken] = useState(() => localStorage.getItem('bearer_token') || '');

  function updateToken(token) {
    setBearerToken(token);
    localStorage.setItem('bearer_token', token);
  }

  const Page = pages[activePage];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Sidebar activePage={activePage} onNavigate={setActivePage} bearerToken={bearerToken} onTokenChange={updateToken} />
      <main className="ml-60 flex-1 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Page bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />
        </div>
      </main>
    </div>
  );
}
