export interface OutputRef {
  readonly _tag: 'outputRef';
  readonly nodeId: string;
  readonly outputName: string;
}

export interface NodeHandle {
  readonly id: string;
  output(name: string): OutputRef;
}
