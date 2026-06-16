import { getCompleted, setAll, setAuthed } from './store';

/** 应用加载时调一次：登录态则把本地 ids 与云端并集合并，写回本地缓存。 */
export async function bootstrapSync(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const local = getCompleted();
    const res = await fetch('/api/progress/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: local }),
    });
    if (res.status === 401) {
      setAuthed(false);
      return; // 游客：保持纯本地
    }
    if (!res.ok) return;
    const data = (await res.json()) as { ids: string[] };
    setAuthed(true);
    setAll(data.ids);
  } catch {
    /* 离线：保留本地 */
  }
}
