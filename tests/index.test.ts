import { describe, it, expect } from 'vitest';
import { hello } from '../src/index.js';

describe('hello', () => {
  it('returns greeting with name', () => {
    expect(hello('world')).toBe('Hello, world!');
  });
});
