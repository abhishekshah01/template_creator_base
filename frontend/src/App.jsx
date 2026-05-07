import { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CreateTemplate from './components/CreateTemplate';
import TemplateSummary from './components/TemplateSummary';
import UpdateCategory from './components/UpdateCategory';
import { ConfigAll, ConfigCreate, ConfigSummary, ConfigDetailPage } from './components/CategoryConfig';
import Settings from './components/Settings';
import Banner from './components/Banner';
import { api } from './api';

const MIN_SIDEBAR = 200;
const MAX_SIDEBAR = 400;
const DEFAULT_SIDEBAR = 260;

export default function App() {
  const [activePage, setActivePage] = useState('create-template');
  const [bearerToken, setBearerToken] = useState(() => localStorage.getItem('bearer_token') || '');
  const [configDetailId, setConfigDetailId] = useState(null);
  const [infoBannerDismissed, setInfoBannerDismissed] = useState(false);
  const [envWarningDismissed, setEnvWarningDismissed] = useState(false);

  // Environment state
  const [activeEnv, setActiveEnv] = useState(() => localStorage.getItem('active_env') || 'eph-leadgen1');
  const [envConfig, setEnvConfig] = useState(null);
  const [standardEnvs, setStandardEnvs] = useState([]);
  const [deploymentScope, setDeploymentScope] = useState(null);
  const [ephemeralEnabled, setEphemeralEnabled] = useState(true);
  const [envError, setEnvError] = useState(null); // global env connectivity error
  const [previousEnv, setPreviousEnv] = useState(null);

  // Load environments on mount + validate current env
  useEffect(() => {
    api.getEnvironments().then(async (data) => {
      setActiveEnv(data.active);
      setEnvConfig(data.active_config);
      setStandardEnvs(data.environments || []);
      setDeploymentScope(data.deployment_scope || 'dev');
      setEphemeralEnabled(data.ephemeral_enabled ?? true);

      // Validate env by trying a config fetch
      const token = localStorage.getItem('bearer_token');
      if (token) {
        try {
          const configs = await api.listCategoryConfigs(token);
          const list = Array.isArray(configs) ? configs : (configs?.configs || configs?.data || configs?.results || []);
          setCachedConfigs(Array.isArray(list) ? list : []);
          setConfigsLoaded(true);
        } catch {
          setEnvError(`Could not reach "${data.active}". The environment may not exist or its services are not running.`);
          setConfigsLoaded(true);
        }
      }
    }).catch(() => {});
  }, []);

  const [envSwitching, setEnvSwitching] = useState(false);

  async function switchEnv(envName) {
    setPreviousEnv(activeEnv);
    setEnvError(null);
    setEnvWarningDismissed(false);
    setEnvSwitching(true);
    // Clear immediately so AllConfigs shows loading state
    setCachedConfigs([]);
    setConfigsStale(false);
    setConfigsLoaded(false);
    try {
      const data = await api.switchEnvironment(envName);
      setActiveEnv(data.env);
      setEnvConfig(prev => ({ ...prev, ...data.config, env: data.env, label: data.label }));
      localStorage.setItem('active_env', data.env);

      // Validate by fetching configs for the new env
      if (bearerToken) {
        try {
          const configs = await api.listCategoryConfigs(bearerToken);
          const list = Array.isArray(configs) ? configs : (configs?.configs || configs?.data || configs?.results || []);
          setCachedConfigs(Array.isArray(list) ? list : []);
          setConfigsStale(false);
          setConfigsLoaded(true);
        } catch (valErr) {
          setEnvError(`Could not reach "${envName}". The environment may not exist or its services are not running.`);
          setCachedConfigs([]);
          setConfigsStale(false);
          setConfigsLoaded(true); // prevent AllConfigs from retrying
        }
      } else {
        setConfigsLoaded(false);
      }
    } catch (e) {
      setEnvError(`Failed to switch to "${envName}": ${e.message}`);
      setConfigsLoaded(true);
    } finally {
      setEnvSwitching(false);
    }
  }

  function switchToPreviousEnv() {
    if (previousEnv) switchEnv(previousEnv);
  }

  // Cached configs state
  const [cachedConfigs, setCachedConfigs] = useState([]);
  const [configsStale, setConfigsStale] = useState(false);
  const [configsLoaded, setConfigsLoaded] = useState(false);

  async function refreshConfigs() {
    if (!bearerToken) return [];
    const data = await api.listCategoryConfigs(bearerToken);
    const list = Array.isArray(data) ? data : (data?.configs || data?.data || data?.results || []);
    const configs = Array.isArray(list) ? list : [];
    setCachedConfigs(configs);
    setConfigsStale(false);
    setConfigsLoaded(true);
    return configs;
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
        return <CreateTemplate bearerToken={bearerToken} />;
      case 'template-summary':
        return <TemplateSummary bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'update-category':
        return <UpdateCategory bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'config-all':
        return <ConfigAll onNavigate={navigate} bearerToken={bearerToken} onTokenExpired={() => updateToken('')}
          cachedConfigs={cachedConfigs} configsStale={configsStale} configsLoaded={configsLoaded} refreshConfigs={refreshConfigs} activeEnv={activeEnv}
          envError={envError} previousEnv={previousEnv} onSwitchBack={switchToPreviousEnv} envSwitching={envSwitching} setEnvError={setEnvError} />;
      case 'config-create':
        return <ConfigCreate bearerToken={bearerToken} onTokenExpired={() => updateToken('')} onNavigate={navigate}
          cachedConfigs={cachedConfigs} refreshConfigs={refreshConfigs} markConfigsStale={markConfigsStale} envConfig={envConfig} />;
      case 'config-summary':
        return <ConfigSummary bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'config-detail':
        return <ConfigDetailPage configId={configDetailId} onNavigate={navigate} bearerToken={bearerToken} onTokenExpired={() => updateToken('')} />;
      case 'config-edit':
        return <ConfigCreate bearerToken={bearerToken} onTokenExpired={() => updateToken('')} onNavigate={navigate} editConfigId={configDetailId}
          cachedConfigs={cachedConfigs} refreshConfigs={refreshConfigs} markConfigsStale={markConfigsStale} envConfig={envConfig} />;
      case 'settings':
        return <Settings activeEnv={activeEnv} standardEnvs={standardEnvs} onSwitchEnv={switchEnv} envConfig={envConfig}
          bearerToken={bearerToken} onTokenChange={updateToken} deploymentScope={deploymentScope} ephemeralEnabled={ephemeralEnabled} />;
      default:
        return <CreateTemplate bearerToken={bearerToken} />;
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
        deploymentScope={deploymentScope}
        ephemeralEnabled={ephemeralEnabled}
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
        <div className={`px-6 py-8 ${['create-template', 'config-create', 'config-edit'].includes(activePage) ? '' : 'max-w-4xl mx-auto'}`}>
          {/* Global env error banners — shown on ALL pages */}
          {envError && (
            <div className="mb-4 space-y-2">
              <Banner variant="critical" onDismiss={() => setEnvError(null)}>
                {envError}{previousEnv && <> — <button onClick={switchToPreviousEnv} className="text-[#58a6ff] hover:underline font-medium">switch back to {previousEnv}</button></>}
              </Banner>
              {!envWarningDismissed && (
                <Banner variant="warning" onDismiss={() => setEnvWarningDismissed(true)}>
                  Switch to a valid environment using the dropdown in the sidebar, or check the environment name for typos.
                </Banner>
              )}
            </div>
          )}
          {/* Persistent auth info banner — shown on auth-dependent pages */}
          {!envError && bearerToken && !infoBannerDismissed && activePage !== 'create-template' && activePage !== 'settings' && (
            <Banner variant="upsell" onDismiss={() => setInfoBannerDismissed(true)} className="mb-4">
              API tokens are environment-specific. Ensure your token matches the active environment <strong className="text-white">({activeEnv})</strong>.
            </Banner>
          )}
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
