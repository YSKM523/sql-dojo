'use client';
import { useEffect } from 'react';
import { bootstrapSync } from '@/lib/progress/sync';

export default function ProgressSync() {
  useEffect(() => {
    void bootstrapSync();
  }, []);
  return null;
}
