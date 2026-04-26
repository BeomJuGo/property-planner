import { useCallback } from 'react';
import { useApp } from '@/context/AppContext';

export function useToast() {
  const { dispatch, state } = useApp();

  const toast = useCallback(
    (message: string) => {
      const id = Math.random().toString(36).slice(2);
      dispatch({ type: 'ADD_TOAST', payload: message });
      setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 3000);
    },
    [dispatch]
  );

  return { toast, toasts: state.toasts };
}
