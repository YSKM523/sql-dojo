const KEY = 'sqldojo:completed';

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  if (typeof window === 'undefined') {
    cache = [];
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: string[]): void {
  cache = ids;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* 隐私模式等写入失败时忽略 */
    }
  }
  listeners.forEach((l) => l());
}

export function getCompleted(): string[] {
  return read();
}

export function isCompleted(id: string): boolean {
  return read().includes(id);
}

export function markCompleted(id: string): void {
  const ids = read();
  if (!ids.includes(id)) write([...ids, id]);
}

export function clearProgress(): void {
  write([]);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// 供 useSyncExternalStore 使用：未变化时返回同一引用，避免无限渲染。
export function getSnapshot(): string[] {
  return read();
}

export function getServerSnapshot(): string[] {
  return [];
}
