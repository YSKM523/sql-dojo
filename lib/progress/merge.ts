/** 本地与云端已通关 id 的并集去重（顺序无关，作为集合）。 */
export function mergeIds(local: readonly string[], remote: readonly string[]): string[] {
  return Array.from(new Set([...remote, ...local]));
}
