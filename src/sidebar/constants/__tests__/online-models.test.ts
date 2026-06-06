import { describe, it, expect } from 'vitest';
import { pickInitialOnlineModel, type OnlineModel } from '../online-models';

const a: OnlineModel = { id: 'a', name: 'A' };
const b: OnlineModel = { id: 'b', name: 'B', default: true };
const c: OnlineModel = { id: 'c', name: 'C', featured: true };

describe('pickInitialOnlineModel', () => {
  it('returns null for empty list', () => {
    expect(pickInitialOnlineModel([], 'a')).toBeNull();
  });

  it('honors saved id when present', () => {
    expect(pickInitialOnlineModel([a, b, c], 'c')).toEqual(c);
  });

  it('falls through to default when saved id missing', () => {
    expect(pickInitialOnlineModel([a, b, c], 'gone')).toEqual(b);
  });

  it('uses default when no saved id', () => {
    expect(pickInitialOnlineModel([a, b, c], null)).toEqual(b);
  });

  it('falls back to first when no default flag', () => {
    expect(pickInitialOnlineModel([a, c], null)).toEqual(a);
  });

  it('uses first model marked default when multiple are', () => {
    const x: OnlineModel = { id: 'x', name: 'X', default: true };
    const y: OnlineModel = { id: 'y', name: 'Y', default: true };
    expect(pickInitialOnlineModel([x, y], null)).toEqual(x);
  });
});
