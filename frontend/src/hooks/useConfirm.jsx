import { useState, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts) => new Promise(resolve => {
    setState({ opts, resolve });
  }), []);

  const dialog = state ? (
    <ConfirmDialog
      {...state.opts}
      onCancel={() => { state.resolve(false); setState(null); }}
      onConfirm={() => { state.resolve(true); setState(null); }}
    />
  ) : null;

  return { confirm, dialog };
}
