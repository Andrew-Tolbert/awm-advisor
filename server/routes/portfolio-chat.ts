import { Application } from 'express';
import { getWorkspaceClient } from '@databricks/appkit';

interface AppKitWithServer {
  server: { extend(fn: (app: Application) => void): void };
}

const ENDPOINT_NAME = 'mas-af54fe47-endpoint';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function setupPortfolioChatRoute(appkit: AppKitWithServer) {
  appkit.server.extend((app) => {
    app.post('/api/portfolio-chat', async (req, res) => {
      const messages = (req.body?.messages ?? []) as ChatMessage[];
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'messages array required' });
        return;
      }

      try {
        const ws = getWorkspaceClient({});
        await ws.config.ensureResolved();
        const host = ws.config.host;
        if (!host) {
          res.status(500).json({ error: 'DATABRICKS_HOST not configured' });
          return;
        }

        const headers = new Headers({ 'Content-Type': 'application/json' });
        await ws.config.authenticate(headers);

        const input = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content }));

        const upstream = await fetch(
          `${host}/serving-endpoints/${ENDPOINT_NAME}/invocations`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ input, stream: true }),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => '');
          console.error('[portfolio-chat] upstream error', upstream.status, text);
          res.status(upstream.status || 502).json({
            error: 'Serving endpoint error',
            detail: text.slice(0, 500),
          });
          return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
          }
        } finally {
          res.end();
        }
      } catch (err) {
        console.error('[portfolio-chat] failed:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: (err as Error).message });
        } else {
          res.end();
        }
      }
    });
  });
}
