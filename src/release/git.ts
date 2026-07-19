import { execa } from 'execa'

/**
 * Returns true if the working tree has uncommitted changes.
 */
export async function isRepoDirty(cwd: string = process.cwd()): Promise<boolean> {
  const { stdout } = await execa('git', ['status', '--porcelain'], { cwd })
  return !!stdout
}

/**
 * Returns the name of the currently checked-out branch.
 */
export async function getCurrentBranch(cwd: string = process.cwd()): Promise<string> {
  const { stdout } = await execa('git', ['branch', '--show-current'], { cwd })
  return stdout
}

/**
 * Returns true if the given local branch is behind its remote counterpart on
 * origin (i.e. would be advanced by a `git pull`).
 *
 * Implementation: refresh the remote-tracking ref with a targeted
 * `git fetch origin <branch>`, then compare the local branch against
 * `origin/<branch>` via `git rev-list --left-right --count`. The output is
 * `<ahead> <behind>`; the local branch is outdated when `behind > 0`.
 *
 * This replaces the previous approach of parsing `git remote show origin`
 * output with a regex, which was brittle: it depended on git's locale
 * (e.g. broke under a non-English git) and made an extra network round-trip.
 *
 * If the fetch (or the comparison) fails — offline, no such remote branch, or
 * no remote configured — we can't determine sync state, so we don't block the
 * release on it and report "not outdated".
 */
export async function isBranchOutdated(
  branch: string,
  cwd: string = process.cwd(),
): Promise<boolean> {
  try {
    await execa('git', ['fetch', 'origin', branch], { cwd })

    const { stdout } = await execa(
      'git',
      ['rev-list', '--left-right', '--count', `${branch}...origin/${branch}`],
      { cwd },
    )
    // `<branch>...origin/<branch>` → "<ahead> <behind>"; local is outdated
    // when it is behind the remote.
    const behind = Number(stdout.trim().split(/\s+/)[1] ?? 0)
    return behind > 0
  }
  catch {
    return false
  }
}
