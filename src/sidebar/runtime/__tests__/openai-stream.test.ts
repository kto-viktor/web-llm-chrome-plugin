import { describe, it, expect } from 'vitest';
import { parseOpenAISSE, threadMessagesToOpenAI } from '../openai-stream';

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i++]));
    },
  });
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const v of gen) out.push(v);
  return out;
}

describe('parseOpenAISSE', () => {
  it('yields content deltas in order', async () => {
    const stream = streamFromChunks([
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n',
      'data: {"choices":[{"delta":{"content":" there"}}]}\n',
      'data: [DONE]\n',
    ]);
    expect(await collect(parseOpenAISSE(stream))).toEqual(['Hi', ' there']);
  });

  it('handles partial chunks across reads', async () => {
    const stream = streamFromChunks([
      'data: {"choices":[{"delta":{"con',
      'tent":"Hello"}}]}\n',
      'data: {"choices":[{"delta":{"content":"!"}}]}\n',
      'data: [DONE]\n',
    ]);
    expect(await collect(parseOpenAISSE(stream))).toEqual(['Hello', '!']);
  });

  it('skips comment lines and empty data', async () => {
    const stream = streamFromChunks([
      ': keepalive\n',
      'data: \n',
      'data: {"choices":[{"delta":{"content":"x"}}]}\n',
      'data: [DONE]\n',
    ]);
    expect(await collect(parseOpenAISSE(stream))).toEqual(['x']);
  });

  it('tolerates missing content fields (e.g. tool-call only deltas)', async () => {
    const stream = streamFromChunks([
      'data: {"choices":[{"delta":{"role":"assistant"}}]}\n',
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n',
      'data: [DONE]\n',
    ]);
    expect(await collect(parseOpenAISSE(stream))).toEqual(['ok']);
  });

  it('handles CRLF line endings', async () => {
    const stream = streamFromChunks([
      'data: {"choices":[{"delta":{"content":"a"}}]}\r\n',
      'data: {"choices":[{"delta":{"content":"b"}}]}\r\n',
      'data: [DONE]\r\n',
    ]);
    expect(await collect(parseOpenAISSE(stream))).toEqual(['a', 'b']);
  });
});

describe('threadMessagesToOpenAI', () => {
  it('extracts text from text parts and drops other parts', () => {
    const messages = [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hi ' },
          { type: 'tool-call', toolName: 'foo', args: {} },
          { type: 'text', text: 'there' },
        ],
      },
      {
        role: 'system',
        content: [{ type: 'text', text: 'You are helpful.' }],
      },
    ];
    expect(threadMessagesToOpenAI(messages as never)).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
      { role: 'system', content: 'You are helpful.' },
    ]);
  });
});
