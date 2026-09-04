import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, type Content } from '@google/genai';

import { systemInstruction } from '../src/lib/constants';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';

if (!PROJECT) {
  throw new Error('GOOGLE_CLOUD_PROJECT is required. Set it in your .env file.');
}

// Vertex AI mode uses Application Default Credentials (gcloud ADC locally,
// the attached service account on Cloud Run) -- no API key is ever handled.
const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });

interface ChatRequestBody {
  model: string;
  history: Content[];
  message: string;
}

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/api/chat', async (req, res) => {
  const { model, history, message } = req.body as ChatRequestBody;

  if (!model || !message) {
    res.status(400).json({ error: 'model and message are required' });
    return;
  }

  try {
    const chat = ai.chats.create({
      model,
      history: Array.isArray(history) ? history : [],
      config: {
        systemInstruction,
        temperature: 0.2,
        tools: [{ googleSearch: {} }],
      },
    });

    const stream = await chat.sendMessageStream({ message });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders?.();

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();
  } catch (err: any) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'An error occurred.' });
    } else {
      res.end();
    }
  }
});

if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '../dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Vertex AI proxy server listening on http://localhost:${port}`);
});
