export interface LocaleOption {
  name: string
  localeCode: string
  flagEmoji: string
  rtl?: boolean
}

/** Curated list of common learning targets. localeCode drives TTS voice. */
export const LOCALE_OPTIONS: LocaleOption[] = [
  { name: 'Spanish', localeCode: 'es-ES', flagEmoji: '🇪🇸' },
  { name: 'Spanish (Mexico)', localeCode: 'es-MX', flagEmoji: '🇲🇽' },
  { name: 'French', localeCode: 'fr-FR', flagEmoji: '🇫🇷' },
  { name: 'German', localeCode: 'de-DE', flagEmoji: '🇩🇪' },
  { name: 'Italian', localeCode: 'it-IT', flagEmoji: '🇮🇹' },
  { name: 'Portuguese (Brazil)', localeCode: 'pt-BR', flagEmoji: '🇧🇷' },
  { name: 'Portuguese (Portugal)', localeCode: 'pt-PT', flagEmoji: '🇵🇹' },
  { name: 'Dutch', localeCode: 'nl-NL', flagEmoji: '🇳🇱' },
  { name: 'Swedish', localeCode: 'sv-SE', flagEmoji: '🇸🇪' },
  { name: 'Polish', localeCode: 'pl-PL', flagEmoji: '🇵🇱' },
  { name: 'Russian', localeCode: 'ru-RU', flagEmoji: '🇷🇺' },
  { name: 'Ukrainian', localeCode: 'uk-UA', flagEmoji: '🇺🇦' },
  { name: 'Turkish', localeCode: 'tr-TR', flagEmoji: '🇹🇷' },
  { name: 'Greek', localeCode: 'el-GR', flagEmoji: '🇬🇷' },
  { name: 'Japanese', localeCode: 'ja-JP', flagEmoji: '🇯🇵' },
  { name: 'Korean', localeCode: 'ko-KR', flagEmoji: '🇰🇷' },
  { name: 'Chinese (Mandarin)', localeCode: 'zh-CN', flagEmoji: '🇨🇳' },
  { name: 'Chinese (Taiwan)', localeCode: 'zh-TW', flagEmoji: '🇹🇼' },
  { name: 'Hindi', localeCode: 'hi-IN', flagEmoji: '🇮🇳' },
  { name: 'Vietnamese', localeCode: 'vi-VN', flagEmoji: '🇻🇳' },
  { name: 'Thai', localeCode: 'th-TH', flagEmoji: '🇹🇭' },
  { name: 'Indonesian', localeCode: 'id-ID', flagEmoji: '🇮🇩' },
  { name: 'Arabic', localeCode: 'ar-SA', flagEmoji: '🇸🇦', rtl: true },
  { name: 'Hebrew', localeCode: 'he-IL', flagEmoji: '🇮🇱', rtl: true },
  { name: 'English', localeCode: 'en-US', flagEmoji: '🇺🇸' },
]

const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'])

/** True if the locale's language is written right-to-left. */
export function isRtlLocale(localeCode: string): boolean {
  return RTL_LANGS.has(localeCode.slice(0, 2).toLowerCase())
}
