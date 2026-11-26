import { BACKUP_KEY, DEFAULT_SETTINGS, LEGACY_CARD_HEADERS, SCHEMA_VERSION, STORAGE_KEY } from '../config'
import type { WallCard, WallLink, WallState } from '../types'

export function emptyState(): WallState {
  return {
    version: SCHEMA_VERSION,
    cards: [],
    links: [],
    settings: { ...DEFAULT_SETTINGS },
    savedAt: 0,
  }
}

const num = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const clamp01 = (v: number) => Math.min(0.97, Math.max(0.03, v))

/**
 * 저장된 JSON은 손상되거나 옛 버전일 수 있다. 통째로 버리는 대신
 * 살릴 수 있는 항목만 추려 낸다 — 한 달치 기록을 날리지 않기 위한 장치.
 */
export function normalize(raw: unknown): WallState {
  const base = emptyState()
  if (!raw || typeof raw !== 'object') return base

  const data = raw as Record<string, unknown>
  const cards: WallCard[] = Array.isArray(data.cards)
    ? data.cards
        .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
        .map((c) => ({
          id: str(c.id) || crypto.randomUUID(),
          text: str(c.text).slice(0, 200),
          author: str(c.author).slice(0, 40),
          x: clamp01(num(c.x, Math.random())),
          y: clamp01(num(c.y, Math.random())),
          rotation: num(c.rotation, 0),
          createdAt: num(c.createdAt, Date.now()),
          updatedAt: num(c.updatedAt, num(c.createdAt, Date.now())),
          hidden: c.hidden === true,
        }))
        .filter((c) => c.text.trim().length > 0)
    : []

  const ids = new Set(cards.map((c) => c.id))
  const seen = new Set<string>()
  const links: WallLink[] = Array.isArray(data.links)
    ? data.links
        .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
        .map((l) => ({
          id: str(l.id) || crypto.randomUUID(),
          from: str(l.from),
          to: str(l.to),
          createdAt: num(l.createdAt, Date.now()),
          source: l.source === 'admin' ? ('admin' as const) : ('visitor' as const),
        }))
        // 사라진 카드로 이어진 선, 자기 자신으로의 선, 중복 선은 버린다.
        .filter((l) => {
          if (!ids.has(l.from) || !ids.has(l.to) || l.from === l.to) return false
          const key = [l.from, l.to].sort().join('|')
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
    : []

  const s = (data.settings ?? {}) as Record<string, unknown>
  return {
    version: SCHEMA_VERSION,
    cards,
    links,
    settings: {
      title: str(s.title, DEFAULT_SETTINGS.title),
      subtitle: str(s.subtitle, DEFAULT_SETTINGS.subtitle),
      promptLabel: str(s.promptLabel, DEFAULT_SETTINGS.promptLabel),
      cardHeader: LEGACY_CARD_HEADERS.includes(str(s.cardHeader))
        ? DEFAULT_SETTINGS.cardHeader
        : str(s.cardHeader, DEFAULT_SETTINGS.cardHeader),
      maxLinksPerCard: Math.max(0, num(s.maxLinksPerCard, DEFAULT_SETTINGS.maxLinksPerCard)),
      maxTextLength: Math.max(4, num(s.maxTextLength, DEFAULT_SETTINGS.maxTextLength)),
      bannedWords: Array.isArray(s.bannedWords)
        ? s.bannedWords.filter((w): w is string => typeof w === 'string')
        : [],
    },
    savedAt: num(data.savedAt, 0),
  }
}

export function loadState(): WallState {
  for (const key of [STORAGE_KEY, BACKUP_KEY]) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = normalize(JSON.parse(raw))
      if (key === BACKUP_KEY) console.warn('[wall] 주 저장소를 읽지 못해 백업에서 복구했습니다.')
      return parsed
    } catch (err) {
      console.error(`[wall] ${key} 읽기 실패`, err)
    }
  }
  return emptyState()
}

let lastSerialized = ''

export function saveState(state: WallState): WallState {
  const next = { ...state, savedAt: Date.now() }
  const serialized = JSON.stringify(next)
  try {
    // 덮어쓰기 직전 상태를 백업으로 한 세대 남긴다.
    if (lastSerialized) localStorage.setItem(BACKUP_KEY, lastSerialized)
    localStorage.setItem(STORAGE_KEY, serialized)
    lastSerialized = serialized
  } catch (err) {
    console.error('[wall] 저장 실패', err)
  }
  return next
}

export function readBackup(): WallState | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    return raw ? normalize(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function toExportJson(state: WallState): string {
  return JSON.stringify({ ...state, exportedAt: Date.now() }, null, 2)
}
