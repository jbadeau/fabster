// Commands
export { initWorkspace } from './commands/init-workspace.js';
export { addPlugin } from './commands/add-plugin.js';
export { generateApp } from './commands/generate-app.js';
export { generateLibrary } from './commands/generate-library.js';
export { runTarget } from './commands/run-target.js';

// Tasks
export { implementFeature } from './tasks/implement-feature.js';
export { implementComponent } from './tasks/implement-component.js';

// Skills
export {
  codeGenerationSkill,
  testingSkill,
  reactSkill,
  refactoringSkill,
} from './skills.js';

// Rules (Nx Conformance compatible)
export {
  projectsHaveTagsRule,
  projectsHaveReadmeRule,
  humanApprovalRule,
  projectNamesAreKebabCaseRule,
  rootPackageHasLicenseRule,
} from './rules.js';

// Agents
export { nxDeveloper } from './agents/nx-developer.js';
