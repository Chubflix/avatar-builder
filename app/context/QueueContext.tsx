"use client";

import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

interface QueueState {
  count: number;
}

type QueueAction =
  | { type: 'SET_COUNT'; payload: number };

const initialState: QueueState = {
  count: 0,
};

function reducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'SET_COUNT':
      return { ...state, count: Math.max(0, action.payload) };
    default:
      return state;
  }
}

export interface QueueContextValue {
  count: number;
  setCount: (count: number) => void;
}

const QueueContext = createContext<QueueContextValue | undefined>(undefined);

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setCount = useCallback((count: number) => dispatch({ type: 'SET_COUNT', payload: count }), []);

  const value = useMemo<QueueContextValue>(() => ({
    count: state.count,
    setCount,
  }), [state.count, setCount]);

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueueContext(): QueueContextValue {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueueContext must be used within a QueueProvider');
  return ctx;
}
