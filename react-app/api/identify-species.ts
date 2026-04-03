import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  maxDuration: 60,
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options)
    if (response.status === 529 && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
      continue
    }
    return response
  }
  throw new Error('Max retries exceeded')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { imageUrl, hints } = req.body
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' })

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) throw new Error('Could not fetch image from storage')
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg'

    let hintsText = ''
    if (hints) {
      const parts: string[] = []
      if (hints.growthForm) parts.push(`- Growth form: ${hints.growthForm}`)
      if (hints.lifeStage) parts.push(`- Life stage: ${hints.lifeStage}`)
      if (hints.partPhotographed) parts.push(`- Part photographed: ${hints.partPhotographed}`)
      if (parts.length > 0) {
        hintsText = `\n\nThe user has provided these hints about the subject:\n${parts.join('\n')}`
      }
    }

    const claudeResponse = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
            { type: 'text', text: `You are a botanist and entomologist specializing in Tampa Bay, Florida (USDA Zone 9b-10a).

The subject of interest is centered in this photo.

Identification guidelines:
- Focus on the most prominent organism near the center of the image
- Consider the plant's growth form carefully: distinguish trees from shrubs from herbaceous plants from vines from grasses
- Account for life stage: seedlings, juvenile plants, and dormant plants look very different from mature specimens in bloom
- If the photo shows bark, trunk, or canopy of a large plant, it is likely a tree — not an herb or wildflower
- Be conservative with confidence scores: use 90+ only when diagnostic features (flowers, fruit, leaf arrangement) are clearly visible. Use 50-70 when working from foliage alone
- If multiple species are visible, identify only the centered/most prominent one${hintsText}

Identify the species. Return a JSON array of up to 3 possible identifications, ordered by confidence. Each object must have exactly these fields:
{ "common": "Common name", "scientific": "Scientific binomial", "type": "plant" or "bug", "category": "Tree", "Shrub", "Wildflower", etc., "confidence": 0-100 integer, "isNative": true/false (native to Florida), "description": "One sentence", "care": "One care tip for Tampa Bay" or null for insects, "bloom": ["Spring","Summer","Fall","Winter","Year-round"] or null, "season": ["Spring","Summer","Fall","Winter","Year-round"] or null (for insects) }
Return ONLY the JSON array, no other text.` },
          ],
        }],
      }),
    })

    const claudeData = await claudeResponse.json()
    if (claudeData.error) throw new Error(claudeData.error.message)

    const text = claudeData.content?.[0]?.text || ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No species identified. Try a clearer photo.')

    const identifications = JSON.parse(jsonMatch[0])
    return res.status(200).json({ identifications })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Identification failed' })
  }
}
