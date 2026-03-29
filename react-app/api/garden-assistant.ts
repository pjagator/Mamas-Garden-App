import type { VercelRequest, VercelResponse } from '@vercel/node'

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

async function callClaude(model: string, systemPrompt: string, userPrompt: string, maxTokens = 1024): Promise<string> {
  const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model, max_tokens: maxTokens, system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.content?.[0]?.text ?? ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { action, data, month, plants } = req.body

    if (action === 'care_profile') {
      const { common, scientific, type, category } = data
      const text = await callClaude('claude-haiku-4-5-20251001',
        'You are a Tampa Bay, Florida (USDA Zone 9b-10a) garden care expert.',
        `Generate a care profile for ${common} (${scientific}), a ${category || type} in Tampa Bay, FL. Return a JSON object with these exact fields: { "watering": { "frequency": "...", "notes": "..." }, "sun": "...", "soil": "...", "fertilizing": { "schedule": "...", "type": "..." }, "pruning": { "timing": "...", "method": "..." }, "mature_size": { "height": "...", "spread": "..." }, "pests_diseases": "...", "companions": "..." }. Return ONLY the JSON object.`)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Failed to generate care profile')
      return res.status(200).json({ care_profile: JSON.parse(jsonMatch[0]) })

    } else if (action === 'reminders') {
      const text = await callClaude('claude-haiku-4-5-20251001',
        'You are a Tampa Bay, Florida garden care expert.',
        `It's ${month}. The user has these plants: ${plants.map((p: any) => p.common).join(', ')}. Generate 3-5 care tasks for this month. Return a JSON array where each object has: { "title": "short task", "detail": "1-2 sentence explanation", "plant": "which plant or empty for general" }. Return ONLY the JSON array.`)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('Failed to generate reminders')
      return res.status(200).json({ reminders: JSON.parse(jsonMatch[0]) })

    } else if (action === 'diagnosis') {
      const { common, scientific, health, imageUrl } = data
      const messages: any[] = [{ role: 'user', content: [
        { type: 'text', text: `This ${common} (${scientific}) is showing signs of being ${health}. Diagnose the issue. Return a JSON object: { "cause": "likely cause", "severity": "low/medium/high", "action": "recommended action", "details": "2-3 sentence explanation" }. Return ONLY the JSON.` },
      ]}]
      if (imageUrl) {
        const imageResponse = await fetch(imageUrl)
        const imageBuffer = await imageResponse.arrayBuffer()
        const base64 = Buffer.from(imageBuffer).toString('base64')
        const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg'
        messages[0].content.unshift({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } })
      }
      const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, system: 'You are a plant pathologist specializing in Tampa Bay, Florida gardens.', messages }),
      })
      const claudeData = await response.json()
      if (claudeData.error) throw new Error(claudeData.error.message)
      const text = claudeData.content?.[0]?.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Failed to diagnose')
      return res.status(200).json({ diagnosis: JSON.parse(jsonMatch[0]) })

    } else if (action === 'suggest_placement') {
      const { plant, zones } = data
      const zoneDescriptions = zones.map((z: any) =>
        `"${z.name || 'Unnamed zone'}": ${z.sun_exposure || 'unknown sun'}, ${z.soil_type || 'unknown soil'}, ${z.moisture_level || 'unknown moisture'}, ${z.wind_exposure || 'unknown wind'}`
      ).join('\n')
      const text = await callClaude('claude-haiku-4-5-20251001',
        'You are a Tampa Bay, Florida garden placement expert. Write in a warm, conversational tone.',
        `The user wants to plant ${plant.common} (${plant.scientific}, a ${plant.category || plant.type}) in their Tampa Bay garden. Their garden zones are:\n${zoneDescriptions}\n\nSuggest which zone(s) would be best and why. Keep it to 2-3 sentences. Return a JSON object: { "suggestion": "your recommendation", "best_zones": ["zone1"], "avoid_zones": ["zone2"] }. Return ONLY the JSON.`)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Failed to generate placement suggestion')
      return res.status(200).json({ placement: JSON.parse(jsonMatch[0]) })

    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Request failed' })
  }
}
