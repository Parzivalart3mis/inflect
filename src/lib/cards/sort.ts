import type { CardDTO, DeckKind } from '@/types/dto'

/**
 * Vocab decks read best alphabetically (by the front word); grammar decks keep
 * their existing order (newest-first). Pure so it can be unit-tested.
 */
export function sortCardsForDeck(
  cards: CardDTO[],
  kind: DeckKind,
): CardDTO[] {
  if (kind !== 'vocab') return cards
  return [...cards].sort((a, b) =>
    a.front.localeCompare(b.front, undefined, { sensitivity: 'base' }),
  )
}
