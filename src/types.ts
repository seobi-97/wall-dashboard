/** 벽에 붙는 카드 한 장(포스트잇). */
export type WallCard = {
  id: string
  /** 관람객이 적은 단어 또는 문구 */
  text: string
  /** 선택 입력. 비어 있을 수 있다. */
  author: string
  /** 벽 캔버스 기준 비율 좌표(0~1). 화면 크기가 달라져도 배치가 유지된다. */
  x: number
  y: number
  /** 종이 느낌을 주는 기울기(deg) */
  rotation: number
  createdAt: number
  updatedAt: number
  /** 관리자가 숨긴 카드. 벽에서는 안 보이지만 데이터는 남는다. */
  hidden: boolean
}

/** 카드와 카드를 잇는 빨간 실. */
export type WallLink = {
  id: string
  from: string
  to: string
  createdAt: number
  /** 관람객이 작성 중에 이은 선인지, 관리자가 이은 선인지 */
  source: 'visitor' | 'admin'
}

export type WallSettings = {
  title: string
  subtitle: string
  /** 작성 모달 1단계 안내 문구 */
  promptLabel: string
  /** 카드 상단에 인쇄되는 작은 머리말 */
  cardHeader: string
  /** 한 사람이 한 번에 이을 수 있는 최대 연결 수 */
  maxLinksPerCard: number
  /** 글자 수 제한 */
  maxTextLength: number
  /** 금칙어(쉼표 구분). 포함되면 작성이 막힌다. */
  bannedWords: string[]
}

export type WallState = {
  version: number
  cards: WallCard[]
  links: WallLink[]
  settings: WallSettings
  savedAt: number
}
