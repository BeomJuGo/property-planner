'use client';

import { useApp } from '@/context/AppContext';

export default function ToastContainer() {
  const { state } = useApp();
  if (!state.toasts.length) return null;
  return (
    <div className="toast-container">
      {state.toasts.map((t) => (
        <div key={t.id} className="toast-item">{t.message}</div>
      ))}
    </div>
  );
}
