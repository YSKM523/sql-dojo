import { describe, it, expect } from 'vitest';
import { mergeIds } from '@/lib/progress/merge';

describe('mergeIds', () => {
  it('并集去重', () => {
    expect(mergeIds(['a', 'b'], ['b', 'c']).sort()).toEqual(['a', 'b', 'c']);
  });
  it('任一为空', () => {
    expect(mergeIds([], ['x']).sort()).toEqual(['x']);
    expect(mergeIds(['y'], []).sort()).toEqual(['y']);
  });
  it('全重叠', () => {
    expect(mergeIds(['a'], ['a']).sort()).toEqual(['a']);
  });
});
