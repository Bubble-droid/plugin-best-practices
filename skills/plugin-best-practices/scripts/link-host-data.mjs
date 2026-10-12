#!/usr/bin/env node
/**
 * Connect a local GUI.for.Cores client's `data` directory to this repository so a plugin can be
 * developed and tested live.
 *
 * This is repository *tooling* (run with Node), not plugin code — Node built-ins are fine here.
 *
 * Usage:
 *   node scripts/link-host-data.mjs --client <clash|singbox> --data <client data dir> [options]
 *
 * Options:
 *   --client <clash|singbox>  Which client the data directory belongs to. Required.
 *   --data <dir>              Path to the client's `data` directory (see "Finding it" below). Required.
 *   --plugin <id>             Also link a repository plugin into <data>/plugins/<id>.js.
 *   --link-dir <dir>          Where the repo-side symlink lives. Default: <repo>/.client-data
 *   --unlink                  Remove the links instead of creating them.
 *   --force                   Proceed even if <data> does not look like a client data directory.
 *   -h, --help                Show this help.
 *
 * Finding the data directory:
 *   It sits next to the client executable, e.g.
 *     …/GUI.for.Clash/data        (Windows / Linux)
 *     /Applications/GUI.for.Clash.app/Contents/Resources/data   (macOS, location varies)
 *   The safest way is to start the client, add a plugin from the UI, then look for `data/plugins.yaml`
 *   under the app's install folder.
 *
 * Result:
 *   - <repo>/.client-data/<client>  ->  <data>            (a repo-local symlink; add it to .gitignore)
 *   - <data>/plugins/<id>.js    ->  <repo>/plugins/<group>/<id>.js   (when --plugin is given)
 *   After linking, edits to the repository file are what the client loads; use the client's plugin
 *   "reload" action to pick them up.
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, renameSync, symlinkSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const argv = process.argv.slice(2)
const has = (name, short) => argv.includes(name) || (short && argv.includes(short))
const value = (name) => {
  const i = argv.indexOf(name)
  return i === -1 ? undefined : argv[i + 1]
}

if (has('--help', '-h')) {
  const text = `Usage: node scripts/link-host-data.mjs --client <clash|singbox> --data <dir> [options]

  --client <clash|singbox>  Client the data directory belongs to. Required.
  --data <dir>              Path to the client's data directory. Required.
  --plugin <id>             Also link <repo>/plugins/**/<id>.js into <data>/plugins/<id>.js.
  --link-dir <dir>          Repo-side link root. Default: <repo>/.client-data
  --unlink                  Remove the links.
  --force                   Proceed even if <dir> does not look like a client data directory.
  -h, --help                Show this help.`
  console.log(text)
  process.exit(0)
}

const findRepoRoot = () => {
  let dir = process.cwd()
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'plugins')) || existsSync(join(dir, 'plugins.d.ts'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return process.cwd()
}

const isSymlink = (path) => {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

const linkDir = (target, dest) => {
  symlinkSync(target, dest, process.platform === 'win32' ? 'junction' : 'dir')
}

const removeIfLink = (path) => {
  if (isSymlink(path)) {
    unlinkSync(path)
    return true
  }
  return false
}

/** Find a plugin script in the repository by catalog id. */
const findPluginFile = (repoRoot, id) => {
  const base = join(repoRoot, 'plugins')
  for (const group of readdirSync(base, { withFileTypes: true })) {
    if (!group.isDirectory() || group.name === 'Resources') continue
    const candidate = join(base, group.name, `${id}.js`)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

const client = value('--client')
const dataDir = value('--data') && resolve(value('--data'))
const pluginId = value('--plugin')
const repoRoot = findRepoRoot()
const linkRoot = resolve(value('--link-dir') || join(repoRoot, '.client-data'))
const unlink = has('--unlink')
const force = has('--force')

if (!client || !['clash', 'singbox'].includes(client)) {
  console.error('Error: --client must be "clash" or "singbox".')
  process.exit(1)
}
if (!dataDir) {
  console.error('Error: --data <client data dir> is required.')
  process.exit(1)
}

const linkPath = join(linkRoot, client)

if (unlink) {
  let removed = 0
  if (removeIfLink(linkPath)) {
    console.log(`removed link ${linkPath}`)
    removed += 1
  }
  if (pluginId) {
    const pluginLink = join(dataDir, 'plugins', `${pluginId}.js`)
    if (removeIfLink(pluginLink)) {
      console.log(`removed link ${pluginLink}`)
      removed += 1
    }
  }
  console.log(removed ? 'Done.' : 'Nothing to remove (no symlinks found).')
  process.exit(0)
}

if (!existsSync(dataDir)) {
  console.error(`Error: ${dataDir} does not exist.`)
  process.exit(1)
}

const looksLikeData = existsSync(join(dataDir, 'plugins.yaml')) || existsSync(join(dataDir, 'plugins'))
if (!looksLikeData && !force) {
  console.error(
    `Error: ${dataDir} does not contain plugins.yaml or a plugins/ folder.\n` +
      `Pass --force if this really is the client data directory.`,
  )
  process.exit(1)
}

// 1. repo-side link: .client-data/<client> -> <data>
mkdirSync(linkRoot, { recursive: true })
if (isSymlink(linkPath)) {
  const current = resolve(dirname(linkPath), readlinkSync(linkPath))
  if (current === dataDir) {
    console.log(`already linked: ${linkPath} -> ${dataDir}`)
  } else {
    console.error(
      `Error: ${linkPath} already links to ${current}.\n` +
        `Remove it (or run --unlink) before linking ${dataDir}.`,
    )
    process.exit(1)
  }
} else if (existsSync(linkPath)) {
  console.error(`Error: ${linkPath} exists and is not a symlink; refusing to overwrite.`)
  process.exit(1)
} else {
  linkDir(dataDir, linkPath)
  console.log(`linked ${linkPath} -> ${dataDir}`)
}

// 2. optional plugin file link: <data>/plugins/<id>.js -> repo file
if (pluginId) {
  const source = findPluginFile(repoRoot, pluginId)
  if (!source) {
    console.error(`Error: could not find plugins/**/${pluginId}.js in ${repoRoot}.`)
    process.exit(1)
  }
  const pluginsDir = join(dataDir, 'plugins')
  mkdirSync(pluginsDir, { recursive: true })
  const pluginLink = join(pluginsDir, `${pluginId}.js`)

  if (isSymlink(pluginLink)) {
    unlinkSync(pluginLink)
  } else if (existsSync(pluginLink)) {
    const backup = `${pluginLink}.bak`
    renameSync(pluginLink, backup)
    console.log(`backed up existing ${pluginId}.js to ${backup}`)
  }
  symlinkSync(source, pluginLink)
  console.log(`linked ${pluginLink} -> ${source}`)
}

console.log(`
Next steps:
  1. In the client, add/toggle the plugin so it is registered under ${join(dataDir, 'plugins.yaml')}.
  2. Use the plugin card's reload action after editing the repository file.
  If a plugin link was created, the client now runs the file in this repository directly.

If .client-data/ is not already ignored, add .client-data/ to .gitignore.
`)
