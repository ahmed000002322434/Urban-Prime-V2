import { createWorker } from 'tesseract.js'
import { z } from 'zod'

import { uid } from '../lib/tauri'
import type { ContextSnapshot, InsightCard, OperationStatus, ProviderConfig } from '../types/glaze'

const CARD_SCHEMA = z.object({
  cards: z
    .array(
      z.object({
        title: z.string().min(3),
        reason: z.string().min(12),
        confidence: z.number().min(0).max(1).default(0.82),
        suggested_action: z.string().min(12),
        apply_mode: z.enum(['copy', 'insert', 'replace_selection']).default('insert'),
        preview: z.string().min(12),
      }),
    )
    .max(3),
})

const SYSTEM_PROMPT = `You are Glaze, a companion-first desktop AI overlay.
Return strict JSON using this shape: {"cards":[{"title":"","reason":"","confidence":0.84,"suggested_action":"","apply_mode":"insert","preview":""}]}
Rules:
- Max 3 cards.
- Only produce contextual suggestions grounded in the current app and visible work.
- Be concise, premium, and actionable.
- "preview" should be directly usable text the user may insert.
- Do not wrap the JSON in markdown.`

function stripCodeFence(raw: string) {
  return raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
}

function buildFallbackCards(snapshot: ContextSnapshot): InsightCard[] {
  const source = snapshot.appName || 'your workspace'

  return [
    {
      id: uid('insight'),
      title: `Refine tone in ${source}`,
      reason: 'Glaze saw enough context to offer a cleaner, more confident rewrite without changing your intent.',
      confidence: 0.74,
      suggestedAction:
        'Tighten the current passage, make the wording more decisive, and remove filler.',
      applyMode: 'insert',
      sourceApp: source,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
      preview:
        'Here is a tighter version with clearer intent, smoother pacing, and fewer filler phrases.',
      status: 'fresh',
    },
    {
      id: uid('insight'),
      title: `Surface next step`,
      reason: 'The active window suggests a task in progress, so a single actionable next step is more useful than a long response.',
      confidence: 0.68,
      suggestedAction: 'Offer one concrete next step the user can apply immediately.',
      applyMode: 'copy',
      sourceApp: source,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
      preview: 'Next step: summarize the current section in one sentence before expanding it.',
      status: 'fresh',
    },
  ]
}

function normalizeCards(raw: string, snapshot: ContextSnapshot) {
  const parsed = CARD_SCHEMA.parse(JSON.parse(stripCodeFence(raw)))
  return parsed.cards.map<InsightCard>((card) => ({
    id: uid('insight'),
    title: card.title,
    reason: card.reason,
    confidence: card.confidence,
    suggestedAction: card.suggested_action,
    applyMode: card.apply_mode,
    sourceApp: snapshot.appName,
    expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    preview: card.preview,
    status: 'fresh',
  }))
}

async function extractTextFromScreenshot(screenshotDataUrl: string) {
  const worker = await createWorker('eng')

  try {
    const result = await worker.recognize(screenshotDataUrl)
    return result.data.text.trim()
  } finally {
    await worker.terminate()
  }
}

function buildUserPrompt(snapshot: ContextSnapshot) {
  return [
    `Active app: ${snapshot.appName}`,
    `Window title: ${snapshot.windowTitle}`,
    `Timestamp: ${snapshot.timestamp}`,
    snapshot.contextSummary ? `Context summary:\n${snapshot.contextSummary}` : '',
    snapshot.extractedText ? `Extracted text:\n${snapshot.extractedText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function callOpenAiCompatible(
  provider: ProviderConfig,
  snapshot: ContextSnapshot,
  userPrompt: string,
) {
  const content = snapshot.screenshotDataUrl && provider.supportsVision
    ? [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: snapshot.screenshotDataUrl } },
      ]
    : [{ type: 'text', text: userPrompt }]

  const baseUrl = provider.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKeyPlaintext}`,
      ...(provider.kind === 'openrouter'
        ? {
            'HTTP-Referer': 'https://glaze.local',
            'X-Title': 'Glaze',
          }
        : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.45,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  const payload = await response.json()
  return payload.choices?.[0]?.message?.content as string
}

async function callAnthropic(provider: ProviderConfig, snapshot: ContextSnapshot, userPrompt: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKeyPlaintext ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: snapshot.screenshotDataUrl && provider.supportsVision
            ? [
                { type: 'text', text: userPrompt },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: snapshot.screenshotDataUrl.split(',')[1],
                  },
                },
              ]
            : [{ type: 'text', text: userPrompt }],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  const payload = await response.json()
  const block = payload.content?.find((entry: { type: string }) => entry.type === 'text')
  return block?.text as string
}

async function callGemini(provider: ProviderConfig, snapshot: ContextSnapshot, userPrompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKeyPlaintext}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: snapshot.screenshotDataUrl && provider.supportsVision
              ? [
                  { text: userPrompt },
                  {
                    inline_data: {
                      mime_type: 'image/png',
                      data: snapshot.screenshotDataUrl.split(',')[1],
                    },
                  },
                ]
              : [{ text: userPrompt }],
          },
        ],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(await response.text())
  }

  const payload = await response.json()
  return payload.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('\n')
}

async function callProvider(provider: ProviderConfig, snapshot: ContextSnapshot) {
  if (!provider.apiKeyPlaintext) {
    throw new Error('Provider key is still locked.')
  }

  const userPrompt = buildUserPrompt(snapshot)

  switch (provider.kind) {
    case 'anthropic':
      return callAnthropic(provider, snapshot, userPrompt)
    case 'gemini':
      return callGemini(provider, snapshot, userPrompt)
    default:
      return callOpenAiCompatible(provider, snapshot, userPrompt)
  }
}

export async function generateInsights(snapshot: ContextSnapshot, provider?: ProviderConfig) {
  const hydratedSnapshot = !snapshot.extractedText && snapshot.screenshotDataUrl && !provider?.supportsVision
    ? {
        ...snapshot,
        extractedText: await extractTextFromScreenshot(snapshot.screenshotDataUrl),
      }
    : snapshot

  if (!provider?.enabled) {
    return {
      cards: buildFallbackCards(hydratedSnapshot),
      snapshot: hydratedSnapshot,
    }
  }

  try {
    const raw = await callProvider(provider, hydratedSnapshot)
    return {
      cards: normalizeCards(raw, hydratedSnapshot),
      snapshot: hydratedSnapshot,
    }
  } catch (error) {
    console.warn('Provider request failed, using fallback cards instead.', error)
    return {
      cards: buildFallbackCards(hydratedSnapshot),
      snapshot: hydratedSnapshot,
    }
  }
}

export async function testProviderConnection(provider: ProviderConfig): Promise<OperationStatus> {
  if (!provider.apiKeyPlaintext) {
    return { ok: false, message: 'Unlock the provider key first.' }
  }

  try {
    await callProvider(provider, {
      id: uid('snapshot'),
      timestamp: new Date().toISOString(),
      appName: 'Glaze Diagnostics',
      windowTitle: 'Connection Test',
      windowBounds: { x: 0, y: 0, width: 1200, height: 900 },
      extractedText: 'Respond with a valid JSON payload for a desktop insight card.',
    })

    return { ok: true, message: `${provider.label} is ready.` }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Provider check failed.',
    }
  }
}
