'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Property, DistanceMatrix, AuthUser, AppSettings } from '@/lib/types';

type TabId = 'input' | 'plan' | 'distances' | 'aiplan' | 'settings';

interface Toast {
  id: string;
  message: string;
}

interface AppState {
  places: Property[];
  distanceMatrix: DistanceMatrix;
  user: AuthUser | null;
  settings: AppSettings;
  activeTab: TabId;
  isLoading: boolean;
  toasts: Toast[];
  planRoute: string[] | null;
}

type Action =
  | { type: 'SET_PLACES'; payload: Property[] }
  | { type: 'ADD_PLACE'; payload: Property }
  | { type: 'UPDATE_PLACE'; payload: { id: string; data: Partial<Property> } }
  | { type: 'DELETE_PLACE'; payload: string }
  | { type: 'SET_MATRIX'; payload: DistanceMatrix }
  | { type: 'MERGE_MATRIX'; payload: DistanceMatrix }
  | { type: 'SET_USER'; payload: AuthUser | null }
  | { type: 'SET_TAB'; payload: TabId }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'ADD_TOAST'; payload: string }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SET_PLAN_ROUTE'; payload: string[] | null };

const defaultSettings: AppSettings = {
  stationRadius: 1000,
  superRadius: 500,
  defaultVisitMin: 40,
  startTime: '10:00',
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PLACES':
      return { ...state, places: action.payload };
    case 'ADD_PLACE':
      return { ...state, places: [...state.places, action.payload] };
    case 'UPDATE_PLACE':
      return {
        ...state,
        places: state.places.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.data } : p
        ),
      };
    case 'DELETE_PLACE':
      return { ...state, places: state.places.filter((p) => p.id !== action.payload) };
    case 'SET_MATRIX':
      return { ...state, distanceMatrix: action.payload };
    case 'MERGE_MATRIX':
      return { ...state, distanceMatrix: { ...state.distanceMatrix, ...action.payload } };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'ADD_TOAST': {
      const id = Math.random().toString(36).slice(2);
      const toast: Toast = { id, message: action.payload };
      return { ...state, toasts: [...state.toasts.slice(-2), toast] };
    }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    case 'SET_PLAN_ROUTE':
      return { ...state, planRoute: action.payload };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
  initialPlaces?: Property[];
  initialUser?: AuthUser | null;
}

export function AppProvider({ children, initialPlaces = [], initialUser = null }: AppProviderProps) {
  const [state, dispatch] = useReducer(reducer, {
    places: initialPlaces,
    distanceMatrix: {},
    user: initialUser,
    settings: defaultSettings,
    activeTab: 'input',
    isLoading: false,
    toasts: [],
    planRoute: null,
  });

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
