import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { WallCard, WallLink } from '../types'
import CardNote from './CardNote'
import LinkLayer, { type Point } from './LinkLayer'

type Props = {
  cards: WallCard[]
  links: WallLink[]
  cardHeader: string
  highlightCardId?: string | null
  highlightLinkIds?: Set<string>
  dimmed?: boolean
  /** 관리자 화면에서만 카드를 끌어 옮길 수 있다. */
  draggable?: boolean
  onMoveCard?: (id: string, x: number, y: number) => void
  selectedIds?: Set<string>
  onSelectCard?: (id: string) => void
  children?: React.ReactNode
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * 카드와 실을 함께 그리는 벽. 실의 양 끝은 실제로 렌더된 카드의 중심을 재서 잡기 때문에
 * 글자 수에 따라 카드 높이가 달라져도 선이 어긋나지 않는다.
 */
export default function WallCanvas({
  cards,
  links,
  cardHeader,
  highlightCardId,
  highlightLinkIds,
  dimmed,
  draggable,
  onMoveCard,
  selectedIds,
  onSelectCard,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<string, HTMLDivElement>())
  const [positions, setPositions] = useState<Record<string, Point>>({})
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  // 끌어 옮긴 직후의 클릭은 선택으로 치지 않는다.
  const movedRef = useRef(false)

  const measure = useCallback(() => {
    const root = containerRef.current
    if (!root) return
    const base = root.getBoundingClientRect()
    const next: Record<string, Point> = {}
    for (const [id, node] of nodeRefs.current) {
      const r = node.getBoundingClientRect()
      next[id] = { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 }
    }
    setPositions(next)
  }, [])

  useLayoutEffect(() => {
    measure()
  }, [cards, measure, drag])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    // 웹폰트가 늦게 뜨면 카드 크기가 바뀌므로 로드 후 한 번 더 잰다.
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [measure])

  const handlePointerDown = (card: WallCard) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return
    e.preventDefault()
    const root = containerRef.current
    if (!root) return
    const base = root.getBoundingClientRect()
    const start = { x: e.clientX, y: e.clientY, cx: card.x, cy: card.y }
    const target = e.currentTarget
    movedRef.current = false
    target.setPointerCapture(e.pointerId)

    const onMove = (ev: PointerEvent) => {
      const x = clamp(start.cx + (ev.clientX - start.x) / base.width, 0.03, 0.97)
      const y = clamp(start.cy + (ev.clientY - start.y) / base.height, 0.03, 0.97)
      movedRef.current = true
      setDrag({ id: card.id, x, y })
    }

    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture?.(ev.pointerId)
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      const x = clamp(start.cx + (ev.clientX - start.x) / base.width, 0.03, 0.97)
      const y = clamp(start.cy + (ev.clientY - start.y) / base.height, 0.03, 0.97)
      setDrag(null)
      if (Math.abs(x - start.cx) > 0.001 || Math.abs(y - start.cy) > 0.001) {
        onMoveCard?.(card.id, x, y)
      }
    }

    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {children}
      <LinkLayer links={links} positions={positions} highlightIds={highlightLinkIds} dimmed={dimmed} />
      {cards.map((card) => {
        const shown = drag && drag.id === card.id ? { ...card, x: drag.x, y: drag.y } : card
        return (
          <CardNote
            key={card.id}
            card={shown}
            header={cardHeader}
            highlighted={highlightCardId === card.id}
            selected={selectedIds?.has(card.id)}
            draggable={draggable}
            onPointerDown={handlePointerDown(card)}
            onClick={
              onSelectCard
                ? () => {
                    if (movedRef.current) {
                      movedRef.current = false
                      return
                    }
                    onSelectCard(card.id)
                  }
                : undefined
            }
            ref={(node) => {
              if (node) nodeRefs.current.set(card.id, node)
              else nodeRefs.current.delete(card.id)
            }}
          />
        )
      })}
    </div>
  )
}
