import { useEffect, useMemo, useRef, useState } from 'react'
import { IDLE_RESET_MS } from '../config'
import { findBannedWord } from '../lib/wall'
import type { WallCard, WallSettings } from '../types'

type Props = {
  settings: WallSettings
  cards: WallCard[]
  onSubmit: (input: { text: string; author: string; linkTo: string[] }) => void
  onClose: () => void
}

type Step = 'write' | 'link' | 'done'

export default function ComposeModal({ settings, cards, onSubmit, onClose }: Props) {
  const [step, setStep] = useState<Step>('write')
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 키오스크: 누군가 쓰다 말고 가버려도 다음 사람을 위해 스스로 닫힌다.
  const idleRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (step === 'done') return
    const reset = () => {
      window.clearTimeout(idleRef.current)
      idleRef.current = window.setTimeout(onClose, IDLE_RESET_MS)
    }
    reset()
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown']
    for (const ev of events) window.addEventListener(ev, reset)
    return () => {
      window.clearTimeout(idleRef.current)
      for (const ev of events) window.removeEventListener(ev, reset)
    }
  }, [onClose, step])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'done') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, step])

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...cards]
      .reverse()
      .filter((c) => !q || c.text.toLowerCase().includes(q))
      .slice(0, 120)
  }, [cards, query])

  const goNext = () => {
    const value = text.trim()
    if (!value) return setError('한 글자 이상 적어 주세요.')
    if (value.length > settings.maxTextLength)
      return setError(`${settings.maxTextLength}자까지만 적을 수 있어요.`)
    const banned = findBannedWord(value, settings.bannedWords)
    if (banned) return setError('이 문구는 전시에 올릴 수 없어요. 다른 표현으로 적어 주세요.')
    setError(null)
    if (cards.length === 0) return submit([])
    setStep('link')
  }

  const submit = (linkTo: string[]) => {
    onSubmit({ text: text.trim(), author: author.trim(), linkTo })
    setStep('done')
    window.setTimeout(onClose, 3200)
  }

  const toggle = (id: string) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= settings.maxLinksPerCard) return prev
      return [...prev, id]
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-wall-800 shadow-2xl">
        {step === 'write' && (
          <div className="p-7 sm:p-9">
            <p className="text-xs tracking-[0.2em] text-white/35 uppercase">step 1 / 2</p>
            <h2 className="mt-2 text-xl leading-snug font-medium sm:text-2xl">{settings.promptLabel}</h2>

            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, settings.maxTextLength))
                setError(null)
              }}
              rows={2}
              placeholder="예: 춤추기, 조용한 산책, 매일 쓰는 일기"
              className="mt-6 w-full resize-none rounded-lg border border-white/15 bg-wall-700 px-4 py-4 font-hand text-3xl text-white placeholder:text-white/25 focus:border-thread focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-white/40">
              <span className={error ? 'text-thread' : ''}>{error ?? '단어 하나도 좋아요.'}</span>
              <span>
                {text.length} / {settings.maxTextLength}
              </span>
            </div>

            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value.slice(0, 20))}
              placeholder="이름 또는 별명 (선택)"
              className="mt-4 w-full rounded-lg border border-white/15 bg-wall-700 px-4 py-3 text-base text-white placeholder:text-white/25 focus:border-thread focus:outline-none"
            />

            <div className="mt-8 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/15 px-5 py-4 text-base text-white/70 transition hover:bg-white/5"
              >
                그만두기
              </button>
              <button
                onClick={goNext}
                className="flex-[2] rounded-lg bg-thread px-5 py-4 text-base font-medium text-white transition hover:brightness-110"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {step === 'link' && (
          <div className="flex max-h-[85vh] flex-col p-7 sm:p-9">
            <p className="text-xs tracking-[0.2em] text-white/35 uppercase">step 2 / 2</p>
            <h2 className="mt-2 text-xl leading-snug font-medium sm:text-2xl">
              벽에 걸린 단어 중, 당신의 <span className="font-hand text-3xl text-thread">{text}</span>
              와(과) 이어질 단어를 골라 주세요.
            </h2>
            <p className="mt-2 text-sm text-white/45">
              최대 {settings.maxLinksPerCard}개 · 고르지 않고 넘어가도 괜찮아요.
            </p>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="단어 검색"
              className="mt-5 w-full rounded-lg border border-white/15 bg-wall-700 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-thread focus:outline-none"
            />

            <div className="scrollbar-thin mt-4 flex flex-wrap content-start gap-2 overflow-y-auto pr-1">
              {candidates.map((c) => {
                const on = picked.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={[
                      'max-w-full rounded-full border px-4 py-2.5 font-hand text-xl transition',
                      on
                        ? 'border-thread bg-thread/15 text-white'
                        : 'border-white/15 text-white/70 hover:border-white/35',
                    ].join(' ')}
                  >
                    <span className="block truncate">{c.text}</span>
                  </button>
                )
              })}
              {candidates.length === 0 && (
                <p className="py-6 text-sm text-white/35">검색 결과가 없어요.</p>
              )}
            </div>

            <div className="mt-7 flex gap-3">
              <button
                onClick={() => setStep('write')}
                className="flex-1 rounded-lg border border-white/15 px-5 py-4 text-base text-white/70 transition hover:bg-white/5"
              >
                뒤로
              </button>
              <button
                onClick={() => submit(picked)}
                className="flex-[2] rounded-lg bg-thread px-5 py-4 text-base font-medium text-white transition hover:brightness-110"
              >
                {picked.length > 0 ? `${picked.length}개와 이어 붙이기` : '그냥 붙이기'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="p-14 text-center">
            <p className="font-hand text-5xl text-thread">{text}</p>
            <p className="mt-5 text-lg text-white/80">벽에 붙였습니다. 고맙습니다.</p>
            <p className="mt-2 text-sm text-white/35">잠시 후 벽으로 돌아갑니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
