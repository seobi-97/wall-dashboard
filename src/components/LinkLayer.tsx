import type { WallLink } from '../types'

export type Point = { x: number; y: number }

type Props = {
  links: WallLink[]
  positions: Record<string, Point>
  /** 방금 생긴 선 — 그려지는 애니메이션을 준다 */
  highlightIds?: Set<string>
  dimmed?: boolean
}

/** id를 안정적인 0/1로 바꿔 선이 매번 같은 방향으로 휘게 한다. */
function bendSign(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0
  return h % 2 === 0 ? 1 : -1
}

function curve(a: Point, b: Point, id: string) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const bend = Math.min(70, len * 0.12) * bendSign(id)
  const mx = (a.x + b.x) / 2 + (-dy / len) * bend
  const my = (a.y + b.y) / 2 + (dx / len) * bend
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`
}

/** 카드 사이를 잇는 빨간 실. 카드 뒤에 깔리고 클릭을 가로채지 않는다. */
export default function LinkLayer({ links, positions, highlightIds, dimmed }: Props) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: dimmed ? 0.35 : 1, transition: 'opacity 300ms' }}
      aria-hidden
    >
      {links.map((link) => {
        const a = positions[link.from]
        const b = positions[link.to]
        if (!a || !b) return null
        const isNew = highlightIds?.has(link.id)

        return (
          <g key={link.id}>
            <path
              d={curve(a, b, link.id)}
              fill="none"
              stroke="var(--color-thread)"
              strokeWidth={1.6}
              strokeLinecap="round"
              opacity={0.85}
              style={
                isNew
                  ? ({
                      '--dash': '2400',
                      strokeDasharray: 2400,
                      animation: 'draw-thread 900ms ease-out both',
                    } as React.CSSProperties)
                  : undefined
              }
            />
            <circle cx={a.x} cy={a.y} r={2.6} fill="var(--color-thread)" />
            <circle cx={b.x} cy={b.y} r={2.6} fill="var(--color-thread)" />
          </g>
        )
      })}
    </svg>
  )
}
