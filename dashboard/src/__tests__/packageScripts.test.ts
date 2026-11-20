import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function extractTopLevelKeys(jsonObjectBody: string): string[] {
  const keys: string[] = []
  const keyPattern = /"((?:\\.|[^"\\])*)"\s*:/g
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < jsonObjectBody.length; i += 1) {
    const ch = jsonObjectBody[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      if (depth === 1) {
        keyPattern.lastIndex = i
        const match = keyPattern.exec(jsonObjectBody)
        if (match && match.index === i) {
          keys.push(JSON.parse(`"${match[1]}"`))
        }
      }
      inString = true
    } else if (ch === '{') {
      depth += 1
    } else if (ch === '}') {
      depth -= 1
    }
  }

  return keys
}

describe('dashboard/package.json scripts', () => {
  it('declares every npm script name at most once', () => {
    const pkgPath = path.resolve(__dirname, '../../package.json')
    const raw = fs.readFileSync(pkgPath, 'utf8')
    const scriptsMatch = /"scripts"\s*:\s*(\{[\s\S]*?\})/.exec(raw)

    expect(scriptsMatch).not.toBeNull()
    const keys = extractTopLevelKeys(scriptsMatch![1])
    const uniqueKeys = new Set(keys)

    expect(keys.length).toBeGreaterThan(0)
    expect(keys.length).toBe(uniqueKeys.size)
  })
})
