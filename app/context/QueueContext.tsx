"use client";

import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

export interface Workflow {
  workflow: string;
  steps: string[];
}

interface QueueState {
  count: number;
  workflows: Workflow[];
}

type QueueAction =
  | { type: 'SET_COUNT'; payload: number }
  | { type: 'SET_WORKFLOWS'; payload: Workflow[] };

const initialState: QueueState = {
  count: 0,
  workflows: [],
};

function reducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'SET_COUNT':
      return { ...state, count: Math.max(0, action.payload) };
    case 'SET_WORKFLOWS':
      return { ...state, workflows: action.payload };
    default:
      return state;
  }
}

export interface QueueContextValue {
  count: number;
  setCount: (count: number) => void;
  workflows: Workflow[];
  setWorkflows: (workflows: Workflow[]) => void;
}

const QueueContext = createContext<QueueContextValue | undefined>(undefined);

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setCount = useCallback((count: number) => dispatch({ type: 'SET_COUNT', payload: count }), []);
  const setWorkflows = useCallback((workflows: Workflow[]) => dispatch({ type: 'SET_WORKFLOWS', payload: workflows }), []);

  const value = useMemo<QueueContextValue>(() => ({
    count: state.count,
    setCount,
    workflows: state.workflows,
    setWorkflows,
  }), [state.count, setCount, state.workflows, setWorkflows]);

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueueContext(): QueueContextValue {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueueContext must be used within a QueueProvider');
  return ctx;
}
