import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'My Jarvis AI',
  },
});

export async function POST(req: NextRequest) {
  try {
    const { messages, model = 'google/gemini-2.0-flash-exp:free' } = await req.json();

    const stream = await openrouter.chat.completions.create({
      model: model,
      messages: messages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'OpenRouter API error' }, { status: 500 });
  }
}
