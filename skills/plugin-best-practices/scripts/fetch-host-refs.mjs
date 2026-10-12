#!/usr/bin/env node
/**
 * Fetch the GUI.for.Cores host front-ends so plugin authors and agents can read the real component,
 * style, store, and bridge sources locally.
 *
 * This is repository *tooling* (run with Node), not plugin code — Node built-ins are fine here.
 *
 * Usage:
 *   node scripts/fetch-host-refs.mjs [options]
 *
 * Options:
 *   --repo <clash|singbox|both>  Which host to fetch. Default: both.
 *   --out <dir>                  Destination root. Default: <repo>/.host-refs
 *   --ref <git ref>              Branch/tag/commit to check out. Default: the remote HEAD.
 *   --force                      Re-clone even if the destination already exists.
 *   --pull                       Update an existing clone instead of doing nothing.
 *   -h, --help                   Show this help.
 *
 * Only `frontend/src` is checked out (sparse + blobless clone), so this stays small.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const REPOS = {
  clash: 'https://github.com/GUI-for-Cores/GUI.for.Clash.git',
  singbox: 'https://github.com/GUI-for-Cores/GUI.for.SingBox.git',
}

const argv = process.argv.slice(2)

const getFlag = (name, short) => argv.includes(name) || (short && argv.includes(short))
const getValue = (name) => {
  const i = argv.indexOf(name)
  return i === -1 ? undefined : argv[i + 1]
}

if (getFlag('--help', '-h')) {
  console.log(`Usage: node scripts/fetch-host-refs.mjs [options]

  --repo <clash|singbox|both>  Which host to fetch. Default: both.
  --out <dir>                  Destination root. Default: <repo>/.host-refs
  --ref <git ref>              Branch/tag/commit to check out. Default: remote HEAD.
  --force                      Re-clone even if the destination already exists.
  --pull                       Update an existing clone.
  -h, --help                   Show this help.

Only frontend/src is checked out (sparse blobless clone).`)
  process.exit(0)
}

/** Walk up from the current directory until we find the Plugin-Hub checkout. */
const findRepoRoot = () => {
  let dir = process.cwd()
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'plugins.d.ts')) || existsSync(join(dir, 'plugins'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return process.cwd()
}

const run = (cmd, args, options = {}) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with code ${result.status}`)
  }
}

const repoRoot = findRepoRoot()
const outRoot = resolve(getValue('--out') || join(repoRoot, '.host-refs'))
const ref = getValue('--ref')
const which = getValue('--repo') || 'both'
const force = getFlag('--force')
const pull = getFlag('--pull')

if (!['clash', 'singbox', 'both'].includes(which)) {
  console.error(`Unknown --repo "${which}" (expected clash | singbox | both)`)
  process.exit(1)
}

const targets = which === 'both' ? ['clash', 'singbox'] : [which]

mkdirSync(outRoot, { recursive: true })
console.log(`Host references → ${outRoot}`)

for (const name of targets) {
  const dir = join(outRoot, name)

  if (existsSync(dir) && force) {
    console.log(`\n[${name}] removing existing clone`)
    rmSync(dir, { recursive: true, force: true })
  }

  if (existsSync(dir)) {
    if (pull) {
      console.log(`\n[${name}] pulling latest`)
      run('git', ['-C', dir, 'fetch', '--depth', '1', 'origin'])
      run('git', ['-C', dir, 'reset', '--hard', 'FETCH_HEAD'])
    } else {
      console.log(`\n[${name}] already present (use --pull to update, --force to re-clone)`)
    }
    continue
  }

  console.log(`\n[${name}] cloning ${REPOS[name]}`)
  const cloneArgs = ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPOS[name], dir]
  if (ref) cloneArgs.splice(2, 0, '--branch', ref)
  run('git', cloneArgs)
  run('git', ['-C', dir, 'sparse-checkout', 'set', 'frontend/src'])
}

console.log(`\nDone. Reference sources:`)
for (const name of targets) {
  console.log(`  ${name}: ${join(outRoot, name, 'frontend', 'src')}`)
}
console.log(`
Useful starting points (paths are relative to each host):
  components/            global Vue components and their props
  assets/styles/         utilities, variables, custom classes
  assets/globalMethods.ts  the PluginApis object exposed as the global \`Plugins\`
  stores/plugins.ts      the plugin loader, metadata proxy, and lifecycle
  bridge/, utils/        the rest of the \`Plugins\` surface

If .host-refs is not already ignored, add \`.host-refs/\` to .gitignore.
`)
