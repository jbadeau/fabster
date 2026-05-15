import type { IODescriptor, IOKind } from '../types/io.js';

interface IODescriptorOptions {
  description?: string;
  required?: boolean;
  array?: boolean;
}

function ioDescriptor<K extends IOKind>(
  kind: K,
  descriptionOrOptions?: string | IODescriptorOptions,
): IODescriptor<K> {
  if (typeof descriptionOrOptions === 'string') {
    return Object.freeze({ kind, description: descriptionOrOptions });
  }
  if (descriptionOrOptions != null) {
    return Object.freeze({ kind, ...descriptionOrOptions });
  }
  return Object.freeze({ kind });
}

export function string(
  descriptionOrOptions?: string | IODescriptorOptions,
): IODescriptor<'string'> {
  return ioDescriptor('string', descriptionOrOptions);
}

export function number(
  descriptionOrOptions?: string | IODescriptorOptions,
): IODescriptor<'number'> {
  return ioDescriptor('number', descriptionOrOptions);
}

export function boolean(
  descriptionOrOptions?: string | IODescriptorOptions,
): IODescriptor<'boolean'> {
  return ioDescriptor('boolean', descriptionOrOptions);
}

export function dir(
  descriptionOrOptions?: string | IODescriptorOptions,
): IODescriptor<'dir'> {
  return ioDescriptor('dir', descriptionOrOptions);
}

export function file(
  descriptionOrOptions?: string | IODescriptorOptions,
): IODescriptor<'file'> {
  return ioDescriptor('file', descriptionOrOptions);
}
