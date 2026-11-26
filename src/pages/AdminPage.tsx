import { useMemo, useRef, useState } from 'react'
import WallCanvas from '../components/WallCanvas'
import { ADMIN_PASSCODE, ADMIN_SESSION_KEY, STORAGE_KEY } from '../config'
import { useHashRoute } from '../hooks/useHashRoute'
import { useWall, wallActions } from '../lib/store'
import { normalize, readBackup, toExportJson } from '../lib/storage'
import { countLinks, formatDateTime, hasLink } from '../lib/wall'
import type { WallCard } from '../types'

type Tab = 'cards' | 'wall' | 'data' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'cards', label: '카드 목록' },
  { id: 'wall', label: '벽 배치 · 연결' },
  { id: 'data', label: '데이터' },
  { id: 'settings', label: '전시 설정' },
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'ok',
  )
  const [tab, setTab] = useState<Tab>('cards')
  const [, navigate] = useHashRoute()
  const state = useWall()

  if (!authed) return <PasscodeGate onPass={() => setAuthed(true)} />

  return (
    <div className="min-h-full bg-wall-900 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-wall-800/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          <h1 className="text-lg font-semibold">표현의 벽 · 관리자</h1>
          <span className="text-xs text-white/40">
            카드 {state.cards.length} · 연결 {state.links.length} · 마지막 저장{' '}
            {state.savedAt ? formatDateTime(state.savedAt) : '-'}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => navigate('wall')}
              className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:bg-white/5"
            >
              벽 화면으로
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem(ADMIN_SESSION_KEY)
                setAuthed(false)
              }}
              className="rounded-md border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:bg-white/5"
            >
              잠그기
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'rounded-t-md px-4 py-2.5 text-sm transition',
                tab === t.id
                  ? 'border-b-2 border-thread text-white'
                  : 'text-white/45 hover:text-white/75',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {tab === 'cards' && <CardsTab />}
        {tab === 'wall' && <WallTab />}
        {tab === 'data' && <DataTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  )
}

function PasscodeGate({ onPass }: { onPass: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value === ADMIN_PASSCODE) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'ok')
      onPass()
    } else {
      setError(true)
      setValue('')
    }
  }

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-wall-900 p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-white/10 bg-wall-800 p-8">
        <h1 className="text-lg font-semibold text-white">관리자 암호</h1>
        <p className="mt-1 text-sm text-white/40">전시 운영자만 들어오는 화면입니다.</p>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(false)
          }}
          className="mt-6 w-full rounded-lg border border-white/15 bg-wall-700 px-4 py-3 text-white focus:border-thread focus:outline-none"
        />
        {error && <p className="mt-2 text-sm text-thread">암호가 맞지 않습니다.</p>}
        <button className="mt-5 w-full rounded-lg bg-thread px-4 py-3 font-medium text-white transition hover:brightness-110">
          들어가기
        </button>
      </form>
    </div>
  )
}

function CardsTab() {
  const { cards, links } = useWall()
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...cards]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((c) => !q || c.text.toLowerCase().includes(q) || c.author.toLowerCase().includes(q))
  }, [cards, query])

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="내용 · 작성자 검색"
          className="w-72 rounded-lg border border-white/15 bg-wall-800 px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-thread focus:outline-none"
        />
        <span className="text-sm text-white/40">{rows.length}개</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs tracking-wide text-white/45 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">내용</th>
              <th className="w-40 px-4 py-3 font-medium">작성자</th>
              <th className="w-20 px-4 py-3 font-medium">연결</th>
              <th className="w-36 px-4 py-3 font-medium">작성 시각</th>
              <th className="w-56 px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {rows.map((card) => (
              <CardRow key={card.id} card={card} linkCount={countLinks(links, card.id)} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-white/35">
                  아직 카드가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CardRow({ card, linkCount }: { card: WallCard; linkCount: number }) {
  const [text, setText] = useState(card.text)
  const [author, setAuthor] = useState(card.author)
  const dirty = text !== card.text || author !== card.author

  return (
    <tr className={card.hidden ? 'bg-white/[0.02] opacity-50' : ''}>
      <td className="px-4 py-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && dirty) wallActions.updateCard(card.id, { text, author })
          }}
          className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 font-hand text-xl text-white hover:border-white/15 focus:border-thread focus:outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="-"
          className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-white/70 placeholder:text-white/20 hover:border-white/15 focus:border-thread focus:outline-none"
        />
      </td>
      <td className="px-4 py-2 text-white/50">{linkCount}</td>
      <td className="px-4 py-2 text-xs text-white/40">{formatDateTime(card.createdAt)}</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1.5">
          <button
            disabled={!dirty}
            onClick={() => wallActions.updateCard(card.id, { text: text.trim(), author: author.trim() })}
            className="rounded bg-thread px-2.5 py-1.5 text-xs whitespace-nowrap text-white transition hover:brightness-110 disabled:bg-white/10 disabled:text-white/30"
          >
            저장
          </button>
          <button
            onClick={() => wallActions.updateCard(card.id, { hidden: !card.hidden })}
            className="rounded border border-white/15 px-2.5 py-1.5 text-xs whitespace-nowrap text-white/70 transition hover:bg-white/5"
          >
            {card.hidden ? '보이기' : '숨기기'}
          </button>
          <button
            onClick={() => {
              if (confirm(`"${card.text}" 카드를 지울까요? 연결된 선도 함께 사라집니다.`))
                wallActions.removeCard(card.id)
            }}
            className="rounded border border-thread/40 px-2.5 py-1.5 text-xs whitespace-nowrap text-thread transition hover:bg-thread/10"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}

function WallTab() {
  const { cards, links, settings } = useWall()
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev.slice(-1), id],
    )

  const [a, b] = selected
  const pairLinked = a && b ? hasLink(links, a, b) : false
  const existing = a && b ? links.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a)) : undefined
  const textOf = (id?: string) => cards.find((c) => c.id === id)?.text ?? ''

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <p className="text-white/50">
          카드를 끌어 옮기고, 두 장을 눌러 선을 잇거나 끊습니다.
        </p>
        <button
          onClick={() => {
            if (confirm('모든 카드를 다시 흩뿌릴까요? 지금 배치는 사라집니다.'))
              wallActions.relayoutCards()
          }}
          className="ml-auto rounded-md border border-white/15 px-3 py-2 text-white/70 transition hover:bg-white/5"
        >
          자동 재배치
        </button>
      </div>

      <div className="wall-surface relative h-[62vh] overflow-hidden rounded-xl border border-white/10">
        <WallCanvas
          cards={cards}
          links={links}
          cardHeader={settings.cardHeader}
          draggable
          onMoveCard={(id, x, y) => wallActions.updateCard(id, { x, y })}
          selectedIds={new Set(selected)}
          onSelectCard={toggle}
        />
      </div>

      <div className="mt-4 flex min-h-12 flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-wall-800 px-4 py-3 text-sm">
        {selected.length === 0 && <span className="text-white/40">카드를 눌러 선택하세요.</span>}
        {selected.length === 1 && (
          <span className="text-white/60">
            <b className="font-hand text-lg">{textOf(a)}</b> 선택됨 — 이을 카드를 하나 더 누르세요.
          </span>
        )}
        {selected.length === 2 && (
          <>
            <span className="text-white/70">
              <b className="font-hand text-lg">{textOf(a)}</b>
              <span className="mx-2 text-thread">—</span>
              <b className="font-hand text-lg">{textOf(b)}</b>
            </span>
            {pairLinked ? (
              <button
                onClick={() => {
                  if (existing) wallActions.removeLink(existing.id)
                  setSelected([])
                }}
                className="rounded-md border border-thread/40 px-3 py-2 text-thread transition hover:bg-thread/10"
              >
                선 끊기
              </button>
            ) : (
              <button
                onClick={() => {
                  wallActions.addLink(a, b, 'admin')
                  setSelected([])
                }}
                className="rounded-md bg-thread px-3 py-2 text-white transition hover:brightness-110"
              >
                선으로 잇기
              </button>
            )}
            <button
              onClick={() => setSelected([])}
              className="rounded-md border border-white/15 px-3 py-2 text-white/60 transition hover:bg-white/5"
            >
              선택 해제
            </button>
          </>
        )}
      </div>

      <h2 className="mt-8 mb-3 text-sm tracking-wide text-white/45 uppercase">
        연결 목록 {links.length}개
      </h2>
      <ul className="divide-y divide-white/8 overflow-hidden rounded-lg border border-white/10">
        {links.map((link) => (
          <li key={link.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="max-w-56 truncate font-hand text-lg text-white/85">{textOf(link.from)}</span>
            <span className="text-thread">—</span>
            <span className="max-w-56 truncate font-hand text-lg text-white/85">{textOf(link.to)}</span>
            <span className="ml-auto shrink-0 text-xs whitespace-nowrap text-white/30">
              {link.source === 'admin' ? '관리자' : '관람객'} · {formatDateTime(link.createdAt)}
            </span>
            <button
              onClick={() => wallActions.removeLink(link.id)}
              className="shrink-0 rounded border border-white/15 px-2 py-1 text-xs whitespace-nowrap text-white/60 transition hover:bg-white/5"
            >
              삭제
            </button>
          </li>
        ))}
        {links.length === 0 && <li className="px-4 py-8 text-center text-white/35">아직 연결이 없습니다.</li>}
      </ul>
    </section>
  )
}

function DataTab() {
  const state = useWall()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  // 저장될 때마다 다시 렌더되므로 그때그때 재는 것으로 충분하다.
  const bytes = (() => {
    try {
      return new Blob([localStorage.getItem(STORAGE_KEY) ?? '']).size
    } catch {
      return 0
    }
  })()

  const download = () => {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')
    const blob = new Blob([toExportJson(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expression-wall-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('JSON 파일을 내려받았습니다.')
  }

  const importFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const next = normalize(JSON.parse(String(reader.result)))
        if (
          !confirm(
            `카드 ${next.cards.length}개, 연결 ${next.links.length}개를 불러옵니다. 지금 기록은 덮어써집니다. 계속할까요?`,
          )
        )
          return
        wallActions.replaceAll(next)
        setMessage('불러왔습니다.')
      } catch {
        setMessage('파일을 읽지 못했습니다. 내보내기로 만든 JSON인지 확인해 주세요.')
      }
    }
    reader.readAsText(file)
  }

  const restore = () => {
    const backup = readBackup()
    if (!backup) return setMessage('복원할 백업이 없습니다.')
    if (!confirm(`직전 상태(카드 ${backup.cards.length}개)로 되돌릴까요?`)) return
    wallActions.replaceAll(backup)
    setMessage('직전 상태로 되돌렸습니다.')
  }

  return (
    <section className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-white/10 bg-wall-800 p-5">
        <h2 className="font-medium">지금 저장된 기록</h2>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm text-white/60 sm:grid-cols-4">
          <div>
            <dt className="text-white/35">카드</dt>
            <dd>{state.cards.length}개</dd>
          </div>
          <div>
            <dt className="text-white/35">연결</dt>
            <dd>{state.links.length}개</dd>
          </div>
          <div>
            <dt className="text-white/35">용량</dt>
            <dd>{(bytes / 1024).toFixed(1)} KB</dd>
          </div>
          <div>
            <dt className="text-white/35">마지막 저장</dt>
            <dd>{state.savedAt ? formatDateTime(state.savedAt) : '-'}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-white/35">
          기록은 이 브라우저의 localStorage에만 있습니다. 브라우저 데이터를 지우거나 기기를 바꾸면
          사라지니, 전시 기간에는 하루 한 번 JSON으로 내보내 두는 것을 권합니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={download}
          className="rounded-lg bg-thread px-5 py-3 text-sm font-medium text-white transition hover:brightness-110"
        >
          JSON 내보내기
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-white/15 px-5 py-3 text-sm text-white/75 transition hover:bg-white/5"
        >
          JSON 가져오기
        </button>
        <button
          onClick={restore}
          className="rounded-lg border border-white/15 px-5 py-3 text-sm text-white/75 transition hover:bg-white/5"
        >
          직전 상태로 복원
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) importFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {message && <p className="text-sm text-white/60">{message}</p>}

      <div className="rounded-lg border border-thread/30 bg-thread/5 p-5">
        <h2 className="font-medium text-thread">전체 초기화</h2>
        <p className="mt-1 text-sm text-white/50">
          모든 카드와 연결을 지웁니다. 되돌릴 수 없으니 먼저 내보내기를 하세요.
        </p>
        <button
          onClick={() => {
            if (!confirm('정말 모든 기록을 지울까요?')) return
            if (!confirm('마지막 확인입니다. 되돌릴 수 없습니다.')) return
            wallActions.resetAll()
            setMessage('모든 기록을 지웠습니다.')
          }}
          className="mt-4 rounded-lg border border-thread px-5 py-3 text-sm text-thread transition hover:bg-thread/10"
        >
          전부 지우기
        </button>
      </div>
    </section>
  )
}

function SettingsTab() {
  const { settings } = useWall()

  return (
    <section className="max-w-2xl space-y-5">
      <Field label="큰 제목 (줄바꿈 가능)">
        <textarea
          rows={2}
          value={settings.title}
          onChange={(e) => wallActions.updateSettings({ title: e.target.value })}
          className="input"
        />
      </Field>
      <Field label="부제 / 안내 문구">
        <input
          value={settings.subtitle}
          onChange={(e) => wallActions.updateSettings({ subtitle: e.target.value })}
          className="input"
        />
      </Field>
      <Field label="작성 화면 질문">
        <input
          value={settings.promptLabel}
          onChange={(e) => wallActions.updateSettings({ promptLabel: e.target.value })}
          className="input"
        />
      </Field>
      <Field label="카드 머리말 (종이 위 작은 글씨)">
        <input
          value={settings.cardHeader}
          onChange={(e) => wallActions.updateSettings({ cardHeader: e.target.value })}
          className="input"
        />
      </Field>
      <div className="grid grid-cols-2 gap-5">
        <Field label="한 번에 이을 수 있는 최대 개수">
          <input
            type="number"
            min={0}
            max={10}
            value={settings.maxLinksPerCard}
            onChange={(e) => wallActions.updateSettings({ maxLinksPerCard: Number(e.target.value) })}
            className="input"
          />
        </Field>
        <Field label="글자 수 제한">
          <input
            type="number"
            min={4}
            max={200}
            value={settings.maxTextLength}
            onChange={(e) => wallActions.updateSettings({ maxTextLength: Number(e.target.value) })}
            className="input"
          />
        </Field>
      </div>
      <Field label="금칙어 (쉼표 또는 줄바꿈으로 구분)">
        <textarea
          rows={3}
          value={settings.bannedWords.join(', ')}
          onChange={(e) =>
            wallActions.updateSettings({
              bannedWords: e.target.value
                .split(/[,\n]/)
                .map((w) => w.trim())
                .filter(Boolean),
            })
          }
          className="input"
        />
      </Field>
      <p className="text-xs text-white/35">설정은 입력하는 즉시 저장됩니다.</p>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-white/55">{label}</span>
      {children}
    </label>
  )
}
