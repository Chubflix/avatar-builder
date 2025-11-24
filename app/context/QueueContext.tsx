"use client";

import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

export interface QueueItem {
  id: string | number;
  [key: string]: any;
}

interface QueueState {
  items: QueueItem[];
  isProcessing: boolean;
}

type QueueAction =
  | { type: 'ENQUEUE'; payload: QueueItem }
  | { type: 'DEQUEUE' }
  | { type: 'CLEAR' }
  | { type: 'SET_PROCESSING'; payload: boolean };

const initialState: QueueState = {
  items: [],
  isProcessing: false,
};

function reducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'ENQUEUE':
      return { ...state, items: [...state.items, action.payload] };
    case 'DEQUEUE':
      return { ...state, items: state.items.slice(1) };
    case 'CLEAR':
      return { ...state, items: [] };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    default:
      return state;
  }
}

export interface QueueContextValue {
  items: QueueItem[];
  isProcessing: boolean;
  enqueue: (item: QueueItem) => void;
  dequeue: () => void;
  clear: () => void;
  setProcessing: (processing: boolean) => void;
}

const QueueContext = createContext<QueueContextValue | undefined>(undefined);

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const enqueue = useCallback((item: QueueItem) => dispatch({ type: 'ENQUEUE', payload: item }), []);
  const dequeue = useCallback(() => dispatch({ type: 'DEQUEUE' }), []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const setProcessing = useCallback((p: boolean) => dispatch({ type: 'SET_PROCESSING', payload: p }), []);

  const value = useMemo<QueueContextValue>(() => ({
    items: state.items,
    isProcessing: state.isProcessing,
    enqueue,
    dequeue,
    clear,
    setProcessing,
  }), [state.items, state.isProcessing, enqueue, dequeue, clear, setProcessing]);

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueueContext(): QueueContextValue {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueueContext must be used within a QueueProvider');
  return ctx;
}
