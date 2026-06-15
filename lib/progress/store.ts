const KEY = 'sqldojo:completed';
// 稳定的空数组引用——useSyncExternalStore 要求 snapshot 在未变化时返回同一引用，
// 否则会触发 "getServerSnapshot should be cached" 警告甚至无限渲染。
const EMPTY: readonly string[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: string[] | null = null;

function read(): string[] {
  if (typeof window === 'undefined') return EMPTY as string[];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : (EMPTY as string[]);
  } catch {
    cache = EMPTY as string[];
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
  write(EMPTY as string[]);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// useSyncExternalStore：返回稳定引用（cache 仅在 write 时换新；空态用 EMPTY 常量）。
export function getSnapshot(): string[] {
  return read();
}

export function getServerSnapshot(): string[] {
  return EMPTY as string[];
}
