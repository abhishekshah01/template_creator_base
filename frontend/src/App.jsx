import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CreateTemplate from './components/CreateTemplate';
import TemplateSummary from './components/TemplateSummary';
import UpdateCategory from './components/UpdateCategory';
import { ConfigAll, ConfigCreate, ConfigSummary, ConfigDetailPage } from './components/CategoryConfig';
import Settings from './components/Settings';
import { api } from './api';

const MIN_SIDEBAR = 200;
const MAX_SIDEBAR = 400;
const DEFAULT_SIDEBAR = 260;

export default function App() {
  const [activePage, setActivePage] = useState('create-template');
  const [bearerToken, setBearerToken] = useState(() => localStorage.getItem('bearer_token') || '');
  const [configDetailId, setConfigDetailId] = useState(null);

  // Environment state
  const [activeEnv, setActiveEnv] = useState(() => localStorage.getItem('active_env') || 'eph-leadgen1');
  const [envConfig, setEnvConfig] = useState(null);
  const [standardEnvs, setStandardEnvs] = useState([]);

  // Load environments on mount
  useEffect(() => {
    api.getEnvironments().then(data => {
      setActiveEnv(data.active);
      setEnvConfig(data.active_config);
      setStandardEnvs(data.environments || []);
    }).catch(() => {});
  }, []);

  async function switchEnv(envName) {
    try {
      const data = await api.switchEnvironment(envName);
      setActiveEnv(data.env);
      setEnvConfig(prev => ({ ...prev, ...data.config, env: data.env, label: data.label }));
      localStorage.setItem('active_env', data.env);
      // Clear cached data from old env
      setCachedConfigs([]);
      setConfigsStale(false);
      setConfigsLoaded(false);
    } catch (e) {
      console.error('Failed to switch environment:', e);
    }
  }

  // Cached configs state
  const [cachedConfigs, setCachedConfigs] = useState([]);
  const [configsStale, setConfigsStale] = useState(false);
  const [configsLoaded, setConfigsLoaded] = useState(false);

  async function refreshConfigs() {
    if (!bearerToken) return [];
    try {
      const data = await api.listCategoryConfigs(bearerToken);
      const list = Array.isArray(data) ? data : (data?.configs || data?.data || data?.results || []);
      const configs = Array.isArray(list) ? list : [];
      setCachedConfigs(configs);
      setConfigsStale(false);
      setConfigsLoaded(true);
      return configs;
    } catch {
      return cachedConfigs;
    }
  }

  function markConfigsStale() {
    setConfigsStale(true);
  }
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
        return <ConfigAll onNavigate={navigate} bearerToken={bearerToken} onTokenExpired={() => updateToken('')}
          cachedConfigs={cachedConfigs} configsStale={configsStale} configsLoaded={configsLoaded} refreshConfigs={refreshConfigs} />;
      case 'config-create':
        return <ConfigCreate bearerToken={bearerToken} onTokenExpired={() => updateToken('')} onNavigate={navigate}
          cachedConfigs={cachedConfigs} refreshConfigs={refreshConfigs} markConfigsStale={markConfigsStale} />;
      case 'config-summary':
        return <ConfigSummary bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'config-detail':
        return <ConfigDetailPage configId={configDetailId} onNavigate={navigate} bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'config-edit':
        return <ConfigCreate bearerToken={bearerToken} onTokenExpired={() => updateToken('')} onNavigate={navigate} editConfigId={configDetailId}
          cachedConfigs={cachedConfigs} refreshConfigs={refreshConfigs} markConfigsStale={markConfigsStale} />;
      case 'settings':
        return <Settings activeEnv={activeEnv} standardEnvs={standardEnvs} onSwitchEnv={switchEnv} envConfig={envConfig} />;
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
        activeEnv={activeEnv}
        standardEnvs={standardEnvs}
        onSwitchEnv={switchEnv}
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
