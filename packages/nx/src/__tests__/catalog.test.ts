import { describe, expect, it } from 'vitest';
import {
  initWorkspace,
  addPlugin,
  generateApp,
  generateLibrary,
  runTarget,
  implementFeature,
  implementComponent,
  nxDeveloper,
} from '../index.js';

describe('@fabster/nx catalog', () => {
  it('exports commands', () => {
    expect(initWorkspace.kind).toBe('command');
    expect(addPlugin.kind).toBe('command');
    expect(generateApp.kind).toBe('command');
    expect(generateLibrary.kind).toBe('command');
    expect(runTarget.kind).toBe('command');
  });

  it('exports tasks', () => {
    expect(implementFeature.kind).toBe('task');
    expect(implementFeature.reasoning).toBe('high');
    expect(implementComponent.kind).toBe('task');
    expect(implementComponent.reasoning).toBe('medium');
  });

  it('exports the nx-developer agent', () => {
    expect(nxDeveloper.kind).toBe('agent');
    expect(nxDeveloper.name).toBe('nx-developer');
    expect(nxDeveloper.capabilities.length).toBeGreaterThan(0);
    expect(nxDeveloper.tools.readFile).toBeDefined();
    expect(nxDeveloper.tools.writeFile).toBeDefined();
    expect(nxDeveloper.tools.listDirectory).toBeDefined();
    expect(nxDeveloper.tools.runCommand).toBeDefined();
  });
});
