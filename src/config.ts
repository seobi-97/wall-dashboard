import type { WallSettings } from './types'

/** localStorage 키. 바꾸면 기존 기록과 분리된다. */
export const STORAGE_KEY = 'expression-wall:v1'
/** 덮어쓰기 직전 상태를 넣어 두는 안전망 */
export const BACKUP_KEY = 'expression-wall:v1:backup'
export const SCHEMA_VERSION = 1

/**
 * 관리자 화면 암호. 실제 인증이 아니라 '아무나 못 들어가게' 하는 수준의 잠금이다.
 * 바꾸려면 프로젝트 루트에 .env.local 을 만들고 VITE_ADMIN_PASSCODE=원하는값 을 넣는다.
 */
export const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE ?? 'wall2026'
export const ADMIN_SESSION_KEY = 'expression-wall:admin'

/** 작성 모달을 열어 둔 채 이만큼 가만히 있으면 자동으로 닫는다(키오스크용, ms). */
export const IDLE_RESET_MS = 90_000

/** 예전 기본 머리말. 저장된 값이 이것이면 새 기본값으로 바꿔 준다. */
export const LEGACY_CARD_HEADERS = ['FAVORITE FORM OF SELF-EXPRESSION?']

export const DEFAULT_SETTINGS: WallSettings = {
  title: 'WHAT IS YOUR FORM\nOF SELF_EXPRESSION?',
  subtitle: '당신의 단어를 한 장 남기고, 이미 걸린 단어와 실로 이어 보세요.',
  promptLabel: '당신을 표현하는 단어나 문장은 무엇인가요?',
  cardHeader: 'EXPRESSION',
  maxLinksPerCard: 3,
  maxTextLength: 40,
  bannedWords: [],
}
