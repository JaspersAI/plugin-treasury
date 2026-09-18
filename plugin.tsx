import { definePlugin } from '@jaspers-ai/sdk'
import { auctions, debt, rates, spending } from './sources.ts'

export default definePlugin({ id: 'treasury', sources: { rates, debt, auctions, spending }, views: {} })
