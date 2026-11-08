/**
 * Publishes the working tree to GitHub via the Git Data API.
 *
 * Why this exists: the local git HTTPS transport fails in this environment
 * ("Repository not found" through the proxy), while the REST API works. This
 * script builds the same commit the CLI would produce: blobs → tree → commit →
 * fast-forward the ref.
 *
 * The file list comes from `git ls-files`, so .gitignore is respected.
 *
 * Usage:  node scripts/publish.mjs <owner/repo> <branch> <token> <commit-message>
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const [repo, branch = 'main', token, message = 'chore: publish'] = process.argv.slice(2)
if (!repo || !token) {
  console.error('usage: node scripts/publish.mjs <owner/repo> <branch> <token> <message>')
  process.exit(1)
}

const API = `https://api.github.com/repos/${repo}`
const headers = {
  'User-Agent': 'what-if-lab-publisher',
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
}

async function api(path, init = {}) {
  const response = await fetch(`${API}${path}`, { ...init, headers })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} -> ${response.status}: ${text.slice(0, 300)}`)
  }
  return text ? JSON.parse(text) : {}
}

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

console.log(`publishing ${files.length} files to ${repo}#${branch}`)

// 1. blobs (sequential-ish with small concurrency to stay friendly to the API)
const treeEntries = []
const concurrency = 6
let cursor = 0

async function worker() {
  while (cursor < files.length) {
    const index = cursor
    cursor += 1
    const path = files[index]
    const content = readFileSync(path)
    const blob = await api('/git/blobs', {
      method: 'POST',
      body: JSON.stringify({ content: content.toString('base64'), encoding: 'base64' }),
    })
    treeEntries[index] = { path, mode: '100644', type: 'blob', sha: blob.sha }
    process.stdout.write(`\r  blob ${index + 1}/${files.length}`)
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()))
process.stdout.write('\n')

// 2. current head, so the commit fast-forwards instead of rewriting history
let baseTree
let parents = []
try {
  const head = await api(`/git/ref/heads/${branch}`)
  const parentSha = head.object.sha
  const parentCommit = await api(`/git/commits/${parentSha}`)
  baseTree = parentCommit.tree.sha
  parents = [parentSha]
  console.log(`  parent ${parentSha.slice(0, 8)}`)
} catch {
  console.log('  no existing branch; creating the first commit')
}

// 3. tree
const tree = await api('/git/trees', {
  method: 'POST',
  body: JSON.stringify(baseTree ? { base_tree: baseTree, tree: treeEntries } : { tree: treeEntries }),
})
console.log(`  tree ${tree.sha.slice(0, 8)}`)

// 4. commit
const commit = await api('/git/commits', {
  method: 'POST',
  body: JSON.stringify({
    message,
    tree: tree.sha,
    parents,
    author: { name: 'KK-Trade', email: '132676579+iiiiiiiiiiiiiiKK@users.noreply.github.com' },
  }),
})
console.log(`  commit ${commit.sha.slice(0, 8)}`)

// 5. move the branch
if (parents.length > 0) {
  await api(`/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  })
} else {
  await api('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }) })
}

console.log(`done: https://github.com/${repo}/commit/${commit.sha}`)
