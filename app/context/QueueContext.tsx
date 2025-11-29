"use client";

import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

export interface Workflow {
  workflow: string;
  steps: string[];
}

export interface Job {
  id?: string;
  uuid?: string;
  job_status?: string;
  status?: string;
  state?: string;
  progress?: number;
  progress_pct?: number;
  percent?: number;
  percentage?: number;
  prompt?: string;
  created_at?: string;
  position?: number;
  type?: string;
  workflow?: string;
  [key: string]: any;
}

export interface CategorizedJobs {
  active: Job | null;
  pending: Job[];
  completed: Job[];
  error: Job[];
  canceled: Job[];
}

interface QueueState {
  count: number;
  workflows: Workflow[];
  jobs: CategorizedJobs;
}

type QueueAction =
  | { type: 'SET_COUNT'; payload: number }
  | { type: 'SET_WORKFLOWS'; payload: Workflow[] }
  | { type: 'SET_JOBS'; payload: CategorizedJobs };

const initialState: QueueState = {
  count: 0,
  workflows: [],
  jobs: {
    active: null,
    pending: [],
    completed: [],
    error: [],
    canceled: []
  },
};

function reducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'SET_COUNT':
      return { ...state, count: Math.max(0, action.payload) };
    case 'SET_WORKFLOWS':
      return { ...state, workflows: action.payload };
    case 'SET_JOBS':
      return { ...state, jobs: action.payload };
    default:
      return state;
  }
}

export interface QueueContextValue {
  count: number;
  setCount: (count: number) => void;
  workflows: Workflow[];
  setWorkflows: (workflows: Workflow[]) => void;
  jobs: CategorizedJobs;
  setJobs: (jobs: CategorizedJobs) => void;
}

const QueueContext = createContext<QueueContextValue | undefined>(undefined);

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setCount = useCallback((count: number) => dispatch({ type: 'SET_COUNT', payload: count }), []);
  const setWorkflows = useCallback((workflows: Workflow[]) => dispatch({ type: 'SET_WORKFLOWS', payload: workflows }), []);
  const setJobs = useCallback((jobs: CategorizedJobs) => dispatch({ type: 'SET_JOBS', payload: jobs }), []);

  const value = useMemo<QueueContextValue>(() => ({
    count: state.count,
    setCount,
    workflows: state.workflows,
    setWorkflows,
    jobs: state.jobs,
    setJobs,
  }), [state.count, setCount, state.workflows, setWorkflows, state.jobs, setJobs]);

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueueContext(): QueueContextValue {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueueContext must be used within a QueueProvider');
  return ctx;
}
