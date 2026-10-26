import { defineConfig, loadEnv } from 'vite';

// GitHub Pages serves the site from /aushadhi-drishti/.
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH || '/aushadhi-drishti/',
  build: { chunkSizeWarningLimit: 6000 },
  plugins: [askHelper(loadEnv(mode, process.cwd(), ''))],
}));

// Optional AI for the "Ask the map" box, only while running `npm run dev`
// on your own computer. The key is read from .env here, on your computer,
// and never sent to the browser. The live site does not use this.
//   ASK_AI_PROVIDER=ollama   free, runs on your Mac (https://ollama.com), no key
//   ASK_AI_PROVIDER=gemini   Google AI Studio free tier, needs ASK_AI_API_KEY
function askHelper(env) {
  return {
    name: 'ask-helper',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ask', async (req, res) => {
        const provider = (env.ASK_AI_PROVIDER || '').toLowerCase();
        if (req.method !== 'POST' || !provider) {
          res.statusCode = 404;
          return res.end('{}');
        }
        let body = '';
        for await (const chunk of req) body += chunk;
        const { question = '', table = '' } = JSON.parse(body || '{}');
        const prompt = `You answer questions about medicine access in Indian districts using ONLY this table.
Columns: district, population 2011, Jan Aushadhi Kendras, Kendras per 1 lakh people, pharmacies mapped in OpenStreetMap, government health centres, gap score (0 to 100, higher means a new generic store is more needed).
If the table cannot answer, say so. Answer in two or three plain sentences.

${table}

Question: ${String(question).slice(0, 300)}`;
        try {
          let answer = '';
          if (provider === 'ollama') {
            const r = await fetch('http://localhost:11434/api/generate', {
              method: 'POST',
              body: JSON.stringify({ model: env.ASK_AI_MODEL || 'llama3.2', prompt, stream: false }),
            });
            answer = (await r.json()).response;
          } else if (provider === 'gemini' && env.ASK_AI_API_KEY) {
            const model = env.ASK_AI_MODEL || 'gemini-2.0-flash';
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.ASK_AI_API_KEY },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });
            answer = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ answer: String(answer || '').trim().slice(0, 1200) }));
        } catch {
          res.statusCode = 502;
          res.end('{}');
        }
      });
    },
  };
}
