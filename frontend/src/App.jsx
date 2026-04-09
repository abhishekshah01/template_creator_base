import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CreateTemplate from './components/CreateTemplate';
import TemplateSummary from './components/TemplateSummary';
import UpdateCategory from './components/UpdateCategory';
import { ConfigAll, ConfigCreate, ConfigSummary, ConfigDetailPage } from './components/CategoryConfig';

const MIN_SIDEBAR = 200;
const MAX_SIDEBAR = 400;
const DEFAULT_SIDEBAR = 260;

export default function App() {
  const [activePage, setActivePage] = useState('create-template');
  const [bearerToken, setBearerToken] = useState(() => localStorage.getItem('bearer_token') || '');
  const [configDetailId, setConfigDetailId] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar_width');
    return saved ? Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, Number(saved))) : DEFAULT_SIDEBAR;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  function updateToken(token) {
    setBearerToken(token);
    localStorage.setItem('bearer_token', token);
  }

  function navigate(page, param) {
    if (page === 'config-detail' || page === 'config-edit') {
      setConfigDetailId(param);
    }
    setActivePage(page);
  }

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e) {
      const newWidth = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, e.clientX));
      setSidebarWidth(newWidth);
    }

    function handleMouseUp() {
      setIsDragging(false);
      localStorage.setItem('sidebar_width', String(sidebarWidth));
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, sidebarWidth]);

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
        return <ConfigDetailPage configId={configDetailId} onNavigate={navigate} bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'config-edit':
        return <ConfigCreate bearerToken={bearerToken} onTokenExpired={() => updateToken('')} onNavigate={navigate} editConfigId={configDetailId} />;
      default:
        return <CreateTemplate />;
    }
  }

  return (
    <div className="flex min-h-screen bg-gh-canvas text-gh-text font-sans">
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        bearerToken={bearerToken}
        onTokenChange={updateToken}
        width={sidebarWidth}
      />
      {/* Drag handle */}
      <div
        ref={dragRef}
        onMouseDown={handleMouseDown}
        className="fixed top-0 h-screen z-10 group cursor-col-resize"
        style={{ left: sidebarWidth - 3, width: 7 }}
      >
        <div className={`w-[2px] h-full mx-auto transition-colors ${isDragging ? 'bg-[#1f6feb]' : 'bg-transparent group-hover:bg-[#1f6feb]'}`} />
      </div>
      <main style={{ marginLeft: sidebarWidth }} className="flex-1 min-h-screen">
        <div className={`px-6 py-8 ${activePage === 'create-template' ? '' : 'max-w-4xl mx-auto'}`}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
