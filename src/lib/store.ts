import { useSyncExternalStore } from 'react'
import { STORAGE_KEY } from '../config'
import type { WallCard, WallLink, WallSettings, WallState } from '../types'
import { emptyState, loadState, saveState } from './storage'
import { hasLink, pickSpot, relayout } from './wall'

let state: WallState = emptyState()
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function hydrate() {
  if (hydrated) return
  hydrated = true
  state = loadState()
}

/** 모든 변경은 이 한 곳을 지나며 곧바로 localStorage에 기록된다. */
function commit(updater: (prev: WallState) => WallState) {
  hydrate()
  state = saveState(updater(state))
  emit()
}

function subscribe(listener: () => void) {
  hydrate()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): WallState {
  hydrate()
  return state
}

// 벽 화면과 관리자 화면을 다른 탭에서 띄워 두어도 서로 반영되게 한다.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return
    state = loadState()
    emit()
  })
}

export function useWall(): WallState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export const wallActions = {
  /** 관람객이 카드를 한 장 붙인다. linkTo에 적힌 기존 카드들과 빨간 실로 이어진다. */
  addCard(input: { text: string; author?: string; linkTo?: string[] }): {
    cardId: string
    linkIds: string[]
  } {
    const id = crypto.randomUUID()
    const now = Date.now()
    const createdLinkIds: string[] = []

    commit((prev) => {
      const spot = pickSpot(prev.cards)
      const card: WallCard = {
        id,
        text: input.text.trim(),
        author: (input.author ?? '').trim(),
        ...spot,
        createdAt: now,
        updatedAt: now,
        hidden: false,
      }

      const newLinks: WallLink[] = []
      for (const targetId of input.linkTo ?? []) {
        if (targetId === id) continue
        if (!prev.cards.some((c) => c.id === targetId)) continue
        if (hasLink([...prev.links, ...newLinks], id, targetId)) continue
        const linkId = crypto.randomUUID()
        createdLinkIds.push(linkId)
        newLinks.push({ id: linkId, from: id, to: targetId, createdAt: now, source: 'visitor' })
      }

      return { ...prev, cards: [...prev.cards, card], links: [...prev.links, ...newLinks] }
    })

    return { cardId: id, linkIds: createdLinkIds }
  },

  updateCard(id: string, patch: Partial<Pick<WallCard, 'text' | 'author' | 'hidden' | 'x' | 'y' | 'rotation'>>) {
    commit((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)),
    }))
  },

  removeCard(id: string) {
    commit((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== id),
      links: prev.links.filter((l) => l.from !== id && l.to !== id),
    }))
  },

  addLink(from: string, to: string, source: WallLink['source'] = 'admin') {
    if (from === to) return
    commit((prev) => {
      if (hasLink(prev.links, from, to)) return prev
      if (!prev.cards.some((c) => c.id === from) || !prev.cards.some((c) => c.id === to)) return prev
      return {
        ...prev,
        links: [...prev.links, { id: crypto.randomUUID(), from, to, createdAt: Date.now(), source }],
      }
    })
  },

  removeLink(id: string) {
    commit((prev) => ({ ...prev, links: prev.links.filter((l) => l.id !== id) }))
  },

  updateSettings(patch: Partial<WallSettings>) {
    commit((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  },

  relayoutCards() {
    commit((prev) => ({ ...prev, cards: relayout(prev.cards) }))
  },

  /** JSON 가져오기 / 백업 복원 */
  replaceAll(next: WallState) {
    commit(() => next)
  },

  resetAll() {
    commit(() => emptyState())
  },
}
