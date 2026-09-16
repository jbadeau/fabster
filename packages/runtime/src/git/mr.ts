import { miseExec } from '../engine/mise.js';

export async function createMR(
  cwd: string,
  branch: string,
  targetBranch: string,
  title: string,
  description: string,
): Promise<string | null> {
  // Push the branch
  const pushResult = await miseExec(`git push origin ${branch}`, cwd);
  if (pushResult.exitCode !== 0) {
    return null;
  }

  // Create PR via gh CLI
  const escaped_title = title.replace(/"/g, '\\"');
  const escaped_desc = description.replace(/"/g, '\\"');
  const result = await miseExec(
    `gh pr create --base "${targetBranch}" --head "${branch}" --title "${escaped_title}" --body "${escaped_desc}"`,
    cwd,
  );

  if (result.exitCode !== 0) {
    return null;
  }

  return result.stdout.trim();
}
