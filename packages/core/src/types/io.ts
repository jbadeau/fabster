export type PrimitiveIOKind = 'string' | 'number' | 'boolean';
export type DomainIOKind = 'dir' | 'file';
export type IOKind = PrimitiveIOKind | DomainIOKind;

export interface IOKindMap {
  string: string;
  number: number;
  boolean: boolean;
  dir: string;
  file: string;
}

export interface IODescriptor<K extends IOKind = IOKind> {
  readonly kind: K;
  readonly description?: string;
  readonly required?: boolean;
  readonly array?: boolean;
}

export type IOSchema = Record<string, IODescriptor>;

export type IOValue<D extends IODescriptor> = D extends { array: true }
  ? IOKindMap[D['kind']][]
  : IOKindMap[D['kind']];

export type IOValues<S extends IOSchema> = {
  [K in keyof S]: IOValue<S[K]>;
};
