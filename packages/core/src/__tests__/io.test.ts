import { describe, expect, it } from 'vitest';
import { boolean, dir, file, number, string } from '../builders/io.js';

describe('io descriptors', () => {
  it('creates a string descriptor', () => {
    const d = string();
    expect(d).toEqual({ kind: 'string' });
  });

  it('creates a string descriptor with description', () => {
    const d = string('A name');
    expect(d).toEqual({ kind: 'string', description: 'A name' });
  });

  it('creates a string descriptor with options', () => {
    const d = string({ description: 'Tags', array: true, required: false });
    expect(d).toEqual({
      kind: 'string',
      description: 'Tags',
      array: true,
      required: false,
    });
  });

  it('creates a number descriptor', () => {
    expect(number()).toEqual({ kind: 'number' });
  });

  it('creates a boolean descriptor', () => {
    expect(boolean()).toEqual({ kind: 'boolean' });
  });

  it('creates a dir descriptor', () => {
    expect(dir()).toEqual({ kind: 'dir' });
  });

  it('creates a file descriptor', () => {
    expect(file('A config file')).toEqual({
      kind: 'file',
      description: 'A config file',
    });
  });
});
