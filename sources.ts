import { defineSource } from '@jaspers-ai/sdk'
import { z } from 'zod'

// The published SDK types a source's arguments as unknown, since from there it cannot see the
// schema beside them. Each run names what its own input parses to.
type Args = Record<string, any>

// The US Treasury's Fiscal Data API. No key, no account, no limit published: the government's own
// numbers for what it owes and what it pays to borrow.

const HOST = 'api.fiscaldata.treasury.gov'
const BASE = `https://${HOST}/services/api/fiscal_service`

/** Every dataset here answers the same way, so one reader serves them all. */
async function table(
  ctx: { fetch: typeof fetch },
  path: string,
  { limit, filter, sort = '-record_date' }: { limit: number; filter?: string; sort?: string },
): Promise<Record<string, unknown>[]> {
  const query = new URLSearchParams({ sort, 'page[size]': String(Math.min(limit, 10000)) })
  if (filter) query.set('filter', filter)
  const response = await ctx.fetch(`${BASE}${path}?${query.toString()}`)
  if (!response.ok) throw new Error(`Fiscal Data answered ${response.status}.`)
  const body = (await response.json()) as { data?: Record<string, unknown>[]; error?: string }
  if (!body.data) throw new Error(body.error ?? 'Fiscal Data answered with no rows.')
  // Everything arrives as strings; anything that reads as a number becomes one, so it can be charted.
  return body.data.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      const numeric = typeof value === 'string' && value !== '' && Number.isFinite(Number(value)) && !key.endsWith('_date')
      out[key] = numeric ? Number(value) : value
    }
    return out
  })
}

const from = z.string().optional().describe('Earliest record date, YYYY-MM-DD.')
const limit = z.number().int().min(1).max(10000).default(120)

export const rates = defineSource({
  description:
    'The average interest rate the US Treasury pays, by security, month by month. What the government actually pays to borrow, as opposed to what the market quotes.',
  hosts: [HOST],
  input: z.object({ security: z.string().optional().describe('One security, like Treasury Bills, Treasury Notes, or Treasury Bonds.'), from, limit }),
  async run(raw, ctx) {
    const { security, from: start, limit: take } = raw as Args
    const parts = [start ? `record_date:gte:${start}` : '', security ? `security_desc:eq:${security}` : ''].filter(Boolean)
    return { rows: await table(ctx, '/v2/accounting/od/avg_interest_rates', { limit: take, filter: parts.join(',') || undefined }) }
  },
})

export const debt = defineSource({
  description: 'The total US public debt, to the penny, by day: what is held by the public, what is held inside government, and the total.',
  hosts: [HOST],
  input: z.object({ from, limit }),
  async run(raw, ctx) {
    const { from: start, limit: take } = raw as Args
    return { rows: await table(ctx, '/v2/accounting/od/debt_to_penny', { limit: take, filter: start ? `record_date:gte:${start}` : undefined }) }
  },
})

export const auctions = defineSource({
  description: 'Treasury securities as they were auctioned: the term, the issue and maturity dates, the rate, and the amount. Where new supply comes from.',
  hosts: [HOST],
  input: z.object({ from, limit }),
  async run(raw, ctx) {
    const { from: start, limit: take } = raw as Args
    return { rows: await table(ctx, '/v1/accounting/od/auctions_query', { limit: take, filter: start ? `auction_date:gte:${start}` : undefined, sort: '-auction_date' }) }
  },
})

export const spending = defineSource({
  description: "Federal spending by agency for a fiscal year, from the Monthly Treasury Statement: where the money went.",
  hosts: [HOST],
  input: z.object({ from, limit: z.number().int().min(1).max(10000).default(200) }),
  async run(raw, ctx) {
    const { from: start, limit: take } = raw as Args
    return { rows: await table(ctx, '/v1/accounting/mts/mts_table_5', { limit: take, filter: start ? `record_date:gte:${start}` : undefined }) }
  },
})
