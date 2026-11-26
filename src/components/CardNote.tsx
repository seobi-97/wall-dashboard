import { forwardRef } from 'react'
import type { WallCard } from '../types'

type Props = {
  card: WallCard
  header: string
  /** 방금 붙은 카드 강조 */
  highlighted?: boolean
  selected?: boolean
  draggable?: boolean
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  onClick?: () => void
}

/** 벽에 붙은 종이 한 장. 위치는 부모 캔버스 기준 비율 좌표로 잡는다. */
const CardNote = forwardRef<HTMLDivElement, Props>(function CardNote(
  { card, header, highlighted, selected, draggable, onPointerDown, onClick },
  ref,
) {
  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onClick={onClick}
      style={
        {
          left: `${card.x * 100}%`,
          top: `${card.y * 100}%`,
          '--rot': `${card.rotation}deg`,
          transform: `translate(-50%, -50%) rotate(${card.rotation}deg)`,
        } as React.CSSProperties
      }
      className={[
        'absolute w-[clamp(132px,12.5vw,196px)] origin-center rounded-[2px] bg-paper px-3 py-2 text-wall-900 paper-shadow',
        'transition-[box-shadow,filter] duration-300',
        draggable ? 'cursor-grab active:cursor-grabbing touch-none' : '',
        onClick ? 'cursor-pointer' : '',
        highlighted ? 'z-30 animate-[pop-in_520ms_cubic-bezier(.2,.9,.3,1.2)_both,glow-pulse_1.6s_ease-in-out_2]' : '',
        selected ? 'z-30 ring-2 ring-thread ring-offset-2 ring-offset-wall-900' : '',
      ].join(' ')}
    >
      <p className="truncate border-b border-wall-900/15 pb-1 text-[7px] font-medium tracking-[0.12em] text-wall-900/45 uppercase">
        {header}
      </p>
      <p className="pt-1.5 font-hand text-[clamp(19px,1.9vw,27px)] leading-[1.15] break-words whitespace-pre-wrap text-wall-900">
        {card.text}
      </p>
      {card.author ? (
        <p className="pt-1 text-right font-hand text-[clamp(12px,1.1vw,16px)] text-wall-900/50">
          — {card.author}
        </p>
      ) : null}
    </div>
  )
})

export default CardNote
