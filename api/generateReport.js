// api/generateReport.js
//
// Vercel serverless function that powers the career assessment.
// Swapped from Gemini to Anthropic — preserves the Gemini-shaped
// request/response contract so the existing React frontend works
// unchanged.
//
// The frontend sends:
//   {
//     contents: [{ parts: [{ text: <prompt> }] }],
//     generationConfig: {
//       responseMimeType: 'application/json',  // optional
//       responseSchema: <JSON Schema>          // optional
//     }
//   }
//
// This function returns:
//   { candidates: [{ content: { parts: [{ text: <response> }] } }] }
//
// If the frontend asks for structured JSON via responseSchema,
// we use Anthropic's tool_use to guarantee the shape. Otherwise
// we return plain text.

import Anthropic from '@anthropic-ai/sdk';

// Default model — Haiku is fast, cheap, and fine for this use case.
// Bump to 'claude-sonnet-4-6' if skill-gap output feels thin.
const MODEL = 'claude-haiku-4-5';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Extract the prompt from the Gemini-shaped body
    const prompt = req.body?.contents?.[0]?.parts?.[0]?.text;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid request body - missing prompt text' });
    }

    const client = new Anthropic({ apiKey });

    // Check whether the frontend wants structured JSON output
    const schema = req.body?.generationConfig?.responseSchema;
    const wantsJSON = req.body?.generationConfig?.responseMimeType === 'application/json';

    let responseText;

    if (wantsJSON && schema) {
      // Structured output via tool_use - guarantees the schema
      const result = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        tools: [{
          name: 'emit_response',
          description: 'Emit the structured response matching the required schema.',
          input_schema: schema
        }],
        tool_choice: { type: 'tool', name: 'emit_response' },
        messages: [{ role: 'user', content: prompt }]
      });

      const toolUse = result.content.find(c => c.type === 'tool_use');
      if (!toolUse) {
        console.error('Anthropic returned no tool_use block', result);
        return res.status(500).json({ error: 'Unexpected response from AI' });
      }

      responseText = JSON.stringify(toolUse.input);
    } else {
      // Plain text output
      const result = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });

      const textBlock = result.content.find(c => c.type === 'text');
      responseText = textBlock?.text ?? '';
    }

    // Translate back to the Gemini response shape the frontend expects
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{ text: responseText }]
        }
      }]
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      detail: error?.message ?? 'unknown'
    });
  }
}
