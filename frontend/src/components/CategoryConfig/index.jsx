import AllConfigs from './AllConfigs';
import ConfigDetail from './ConfigDetail';
import CreateConfig from './CreateConfig';

export function ConfigAll({ onNavigate, bearerToken, onTokenExpired, cachedConfigs, configsStale, configsLoaded, refreshConfigs }) {
  return <AllConfigs onNavigate={onNavigate} bearerToken={bearerToken} onTokenExpired={onTokenExpired}
    cachedConfigs={cachedConfigs} configsStale={configsStale} configsLoaded={configsLoaded} refreshConfigs={refreshConfigs} />;
}

export function ConfigCreate({ bearerToken, onTokenExpired, onNavigate, editConfigId, cachedConfigs, refreshConfigs, markConfigsStale }) {
  return <CreateConfig bearerToken={bearerToken} onTokenExpired={onTokenExpired} onNavigate={onNavigate} editConfigId={editConfigId}
    cachedConfigs={cachedConfigs} refreshConfigs={refreshConfigs} markConfigsStale={markConfigsStale} />;
}

export function ConfigSummary({ bearerToken, onTokenExpired }) {
  return (
    <div className="bg-gh-surface border border-gh-border rounded-md p-8 text-center">
      <h2 className="text-lg font-medium text-gh-text mb-2">Generate Summary</h2>
      <p className="text-xs text-gh-text-muted">Summary generation will be wired here (same as current Template Summary).</p>
    </div>
  );
}

export function ConfigDetailPage({ configId, onNavigate, bearerToken, onTokenExpired }) {
  return <ConfigDetail configId={configId} onNavigate={onNavigate} bearerToken={bearerToken} onTokenExpired={onTokenExpired} />;
}
