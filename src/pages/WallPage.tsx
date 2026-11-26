import { useEffect, useMemo, useRef, useState } from 'react'
import ComposeModal from '../components/ComposeModal'
import WallCanvas from '../components/WallCanvas'
import { useHashRoute } from '../hooks/useHashRoute'
import { useWall, wallActions } from '../lib/store'

export default function WallPage() {
  const { cards, links, settings } = useWall()
  const [, navigate] = useHashRoute()
  const [composing, setComposing] = useState(false)
  const [highlightCardId, setHighlightCardId] = useState<string | null>(null)
  const [highlightLinkIds, setHighlightLinkIds] = useState<Set<string>>(new Set())

  const visibleCards = useMemo(() => cards.filter((c) => !c.hidden), [cards])
  const visibleIds = useMemo(() => new Set(visibleCards.map((c) => c.id)), [visibleCards])
  const visibleLinks = useMemo(
    () => links.filter((l) => visibleIds.has(l.from) && visibleIds.has(l.to)),
    [links, visibleIds],
  )

  const handleSubmit = (input: { text: string; author: string; linkTo: string[] }) => {
    const { cardId, linkIds } = wallActions.addCard(input)
    setHighlightCardId(cardId)
    setHighlightLinkIds(new Set(linkIds))
    window.setTimeout(() => {
      setHighlightCardId(null)
      setHighlightLinkIds(new Set())
    }, 6000)
  }

  // 관리자 진입: 오른쪽 아래 작은 영역을 3번 연달아 눌러야 열린다(관람객 오진입 방지).
  const tapsRef = useRef<number[]>([])
  const openAdmin = () => {
    const now = Date.now()
    tapsRef.current = [...tapsRef.current, now].filter((t) => now - t < 1500)
    if (tapsRef.current.length >= 3) {
      tapsRef.current = []
      navigate('admin')
    }
  }

  useEffect(() => {
    document.title = '표현의 벽'
  }, [])

  return (
    <main className="kiosk-lock wall-surface relative h-full w-full overflow-hidden">
      <WallCanvas
        cards={visibleCards}
        links={visibleLinks}
        cardHeader={settings.cardHeader}
        highlightCardId={highlightCardId}
        highlightLinkIds={highlightLinkIds}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[30vh] bg-gradient-to-b from-wall-900 via-wall-900/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[22vh] bg-gradient-to-t from-wall-900 via-wall-900/85 to-transparent" />
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-8 pt-[6vh] text-center">
          <h1 className="text-[clamp(26px,4.4vw,64px)] leading-[1.08] font-bold tracking-tight whitespace-pre-line text-white/92">
            {settings.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[clamp(12px,1.2vw,17px)] text-white/55">
            {settings.subtitle}
          </p>
        </header>
      </WallCanvas>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-4 pb-[4vh]">
        <p className="text-xs tracking-[0.18em] text-white/35 uppercase">
          {visibleCards.length} words · {visibleLinks.length} threads
        </p>
        <button
          onClick={() => setComposing(true)}
          className="pointer-events-auto rounded-full bg-thread px-10 py-5 text-lg font-medium text-white shadow-[0_8px_40px_-10px_rgba(224,27,36,0.8)] transition hover:brightness-110 active:scale-[0.98]"
        >
          내 단어 붙이기
        </button>
      </div>

      <button
        onClick={openAdmin}
        aria-label="관리자"
        className="absolute right-0 bottom-0 z-30 h-14 w-14 opacity-0"
      />

      {composing && (
        <ComposeModal
          settings={settings}
          cards={visibleCards}
          onSubmit={handleSubmit}
          onClose={() => setComposing(false)}
        />
      )}
    </main>
  )
}
