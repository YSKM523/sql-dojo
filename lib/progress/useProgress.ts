'use client';
import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, getServerSnapshot } from './store';

export function useCompletedIds(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
