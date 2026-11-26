import type { WallCard, WallLink } from '../types'

/** 카드가 놓일 수 있는 영역(제목/하단 버튼과 겹치지 않도록 여백을 둔다). */
export const PLACEMENT_BOUNDS = { minX: 0.07, maxX: 0.93, minY: 0.32, maxY: 0.8 }

const ASPECT = 1.8 // 가로가 넓은 화면에서 거리 계산을 덜 찌그러지게 보정

function minDistance(x: number, y: number, cards: WallCard[]) {
  let best = Number.POSITIVE_INFINITY
  for (const c of cards) {
    const dx = (c.x - x) * ASPECT
    const dy = c.y - y
    best = Math.min(best, Math.hypot(dx, dy))
  }
  return best
}

/**
 * 기존 카드들과 되도록 겹치지 않는 자리를 고른다.
 * 무작위 후보를 여러 개 뽑아 가장 한가한 곳을 쓰는 방식 — 벽이 빽빽해져도 멈추지 않는다.
 */
export function pickSpot(cards: WallCard[]): { x: number; y: number; rotation: number } {
  const { minX, maxX, minY, maxY } = PLACEMENT_BOUNDS
  let best = { x: 0.5, y: 0.5 }
  let bestScore = -1

  for (let i = 0; i < 80; i += 1) {
    const x = minX + Math.random() * (maxX - minX)
    const y = minY + Math.random() * (maxY - minY)
    const score = cards.length === 0 ? 1 : minDistance(x, y, cards)
    if (score > bestScore) {
      bestScore = score
      best = { x, y }
    }
    if (bestScore > 0.22) break // 충분히 떨어졌으면 더 찾지 않는다
  }

  return { ...best, rotation: Math.round((Math.random() * 8 - 4) * 10) / 10 }
}

/** 전체 카드를 처음부터 다시 흩뿌린다(관리자 '자동 재배치'). */
export function relayout(cards: WallCard[]): WallCard[] {
  const placed: WallCard[] = []
  for (const card of cards) {
    const spot = pickSpot(placed)
    const next = { ...card, ...spot }
    placed.push(next)
  }
  return placed
}

export const linkKey = (a: string, b: string) => [a, b].sort().join('|')

export function hasLink(links: WallLink[], a: string, b: string) {
  const key = linkKey(a, b)
  return links.some((l) => linkKey(l.from, l.to) === key)
}

export function countLinks(links: WallLink[], cardId: string) {
  return links.filter((l) => l.from === cardId || l.to === cardId).length
}

export function findBannedWord(text: string, bannedWords: string[]): string | null {
  const normalized = text.toLowerCase().replace(/\s+/g, '')
  for (const word of bannedWords) {
    const w = word.toLowerCase().replace(/\s+/g, '')
    if (w && normalized.includes(w)) return word
  }
  return null
}

export function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
