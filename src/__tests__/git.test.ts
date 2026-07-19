import { execa } from 'execa'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isBranchOutdated } from '../release/git'

/**
 * Tests for {@link isBranchOutdated}.
 *
 * The function refreshes `origin/<branch>` with `git fetch origin <branch>`
 * and then compares the local branch against it via
 * `git rev-list --left-right --count`. We exercise the real code path with a
 * bare remote and a local clone so the sync/behind/ahead states are genuine.
 */
describe('isBranchOutdated', () => {
  let tmp: string
  let remote: string
  let local: string

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sheep-outdated-'))
    remote = path.join(tmp, 'remote.git')
    local = path.join(tmp, 'local')

    // Bare remote so multiple working clones can push to it.
    await execa('git', ['init', '-q', '--bare', '-b', 'main', remote])
    // Local clone (sets up `main` tracking `origin/main`).
    await execa('git', ['clone', '-q', remote, local])
    await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: local })
    await execa('git', ['config', 'user.name', 'Tester'], { cwd: local })
    await execa('git', ['config', 'commit.gpgsign', 'false'], { cwd: local })
  })

  afterEach(async () => {
    await fs.remove(tmp)
  })

  /** Commit a change in `dir`, using a unique file per message. */
  async function commitIn(dir: string, message: string): Promise<void> {
    const file = `${message.replace(/[^a-z0-9]/gi, '_')}.txt`
    await fs.writeFile(path.join(dir, file), `${message}\n`)
    await execa('git', ['add', file], { cwd: dir })
    await execa('git', ['commit', '-q', '-m', message], { cwd: dir })
  }

  it('returns false when the local branch is in sync with the remote', async () => {
    await commitIn(local, 'initial')
    await execa('git', ['push', '-q', 'origin', 'main'], { cwd: local })
    expect(await isBranchOutdated('main', local)).toBe(false)
  })

  // This case drives two clones + two pushes + a fetch, which is slow on
  // Windows; raise the per-test timeout so it isn't killed at the 5s default.
  it('returns true when the remote has commits the local branch lacks', async () => {
    await commitIn(local, 'initial')
    await execa('git', ['push', '-q', 'origin', 'main'], { cwd: local })

    // Simulate another contributor pushing directly to the remote.
    const remoteWork = path.join(tmp, 'remote-work')
    await execa('git', ['clone', '-q', remote, remoteWork])
    await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: remoteWork })
    await execa('git', ['config', 'user.name', 'Tester'], { cwd: remoteWork })
    await execa('git', ['config', 'commit.gpgsign', 'false'], { cwd: remoteWork })
    await commitIn(remoteWork, 'remote-only')
    await execa('git', ['push', '-q', 'origin', 'main'], { cwd: remoteWork })

    // Local is behind → outdated.
    expect(await isBranchOutdated('main', local)).toBe(true)
  }, 30000)

  it('returns false when the local branch is ahead of the remote (not behind)', async () => {
    await commitIn(local, 'initial')
    await execa('git', ['push', '-q', 'origin', 'main'], { cwd: local })
    await commitIn(local, 'local-only')

    // Ahead, not behind, so not "outdated".
    expect(await isBranchOutdated('main', local)).toBe(false)
  })

  it('returns false (and does not throw) when there is no origin remote', async () => {
    const solo = path.join(tmp, 'solo')
    await execa('git', ['init', '-q', '-b', 'main', solo])
    await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: solo })
    await execa('git', ['config', 'user.name', 'Tester'], { cwd: solo })
    await execa('git', ['config', 'commit.gpgsign', 'false'], { cwd: solo })
    await commitIn(solo, 'solo commit')

    // No remote → fetch fails → caught → reported as not outdated.
    await expect(isBranchOutdated('main', solo)).resolves.toBe(false)
  })
})
