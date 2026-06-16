const KEY = 'sqldojo:completed';
// 稳定的空数组引用——useSyncExternalStore 要求 snapshot 在未变化时返回同一引用，
// 否则会触发 "getServerSnapshot should be cached" 警告甚至无限渲染。
const EMPTY: readonly string[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: string[] | null = null;

// 登录态标志：仅在 bootstrapSync 拿到 200 时置真，决定 markCompleted 是否后台推云。
let authed = false;
export function setAuthed(v: boolean): void {
  authed = v;
}

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

// 登录态下把单条通关后台推到云端（尽力而为；失败无妨，下次加载 sync 兜底对账）。
function pushCloud(id: string): void {
  if (!authed || typeof window === 'undefined') return;
  try {
    void fetch('/api/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ exerciseId: id }),
    }).catch(() => {});
  } catch {
    /* 忽略 */
  }
}

export function getCompleted(): string[] {
  return read();
}

export function isCompleted(id: string): boolean {
  return read().includes(id);
}

export function markCompleted(id: string): void {
  const ids = read();
  if (!ids.includes(id)) {
    write([...ids, id]);
    pushCloud(id);
  }
}

export function clearProgress(): void {
  // 仅清本地（设备级语义）；云端清理留作后续显式功能。
  write(EMPTY as string[]);
}

// 整体替换本地缓存并广播（供登录后云同步用）。
export function setAll(ids: string[]): void {
  write(Array.from(new Set(ids)));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): string[] {
  return read();
}

export function getServerSnapshot(): string[] {
  return EMPTY as string[];
}
