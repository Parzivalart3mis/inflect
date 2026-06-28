import { Errors, requireUser, route } from '@/lib/api'
import { getOwnedDeck, listDeckCards } from '@/lib/db/cards'
import { slugifyFilename, toCsv } from '@/lib/cards/csv'

type Ctx = { params: Promise<{ deckId: string }> }

export const GET = route(async (_request: Request, ctx: Ctx) => {
  const userId = await requireUser()
  const { deckId } = await ctx.params

  const deck = await getOwnedDeck(userId, deckId)
  if (!deck) throw Errors.notFound('Deck')

  const cards = await listDeckCards(userId, deckId)
  const csv = toCsv(
    ['front', 'back', 'has_exception', 'is_pinned'],
    cards.map((c) => [c.front, c.back ?? '', c.hasException, c.isPinned]),
  )

  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${slugifyFilename(deck.name)}.csv"`,
      'cache-control': 'no-store',
    },
  })
})
