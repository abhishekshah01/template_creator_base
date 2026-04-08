import { useState } from 'react';
import AllConfigs from './AllConfigs';
import ConfigDetail from './ConfigDetail';

export function ConfigAll({ onNavigate }) {
  return <AllConfigs onNavigate={onNavigate} />;
}

export function ConfigCreate({ bearerToken, onTokenExpired }) {
  // Reuses the existing UpdateCategory component — will be wired up later
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
      <h2 className="text-lg font-medium mb-2">Create Config</h2>
      <p className="text-xs text-slate-500">Create form will be wired here (same layout as current Update Category Config).</p>
    </div>
  );
}

export function ConfigSummary({ bearerToken, onTokenExpired }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
      <h2 className="text-lg font-medium mb-2">Generate Summary</h2>
      <p className="text-xs text-slate-500">Summary generation will be wired here (same as current Template Summary).</p>
    </div>
  );
}

export function ConfigDetailPage({ configId, onNavigate }) {
  return <ConfigDetail configId={configId} onNavigate={onNavigate} />;
}
