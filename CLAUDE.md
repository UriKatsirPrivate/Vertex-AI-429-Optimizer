# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install         # install dependencies
npm run dev         # start Vite dev server (client, :3000) + Express API server (:8080) together
npm run dev:client  # just the Vite dev server
npm run dev:server  # just the Express API server (tsx watch)
npm run build       # production build of the frontend
npm run start       # NODE_ENV=production Express server: serves dist/ and /api from one process
npm run preview     # preview the production build (static only, no /api backend)
npm run lint        # type-check only (tsc --noEmit); there is no separate lint config
npm run clean       # rm -rf dist
```

There is no test suite/framework configured in this repo.

Requires a `.env` file (see `.env.example`) with `GOOGLE_CLOUD_PROJECT` (and optionally `GOOGLE_CLOUD_LOCATION`, default `global`) set. Auth is via Application Default Credentials — `gcloud auth application-default login` locally, or an attached service account (Vertex AI User role) in production. There is no API key anywhere in this app.

## Architecture

This is a React SPA with a thin Express backend that proxies chat requests to Vertex AI. The frontend never talks to Vertex AI directly and holds no credentials.

- **`src/App.tsx`** — the entire UI: a resizable two-panel layout (chat on the left, generated artifacts on the right with tabs: Optimized Prompt, Optimized Code, 429 Report, Skill, Integration Guide, Prompt Tips) plus a fullscreen modal for each tab. It owns all state (messages, artifacts, form inputs, model selection, and the `ChatContent[]` conversation `history` sent to the backend on each turn) — there is no state management library or router.
- **`src/lib/constants.ts`** — the actual "product": `systemInstruction` is the large prompt that tells Gemini how to behave (an "expert Google Cloud AI Architect" persona) and dictates the exact `## 1.`–`## 5.` markdown heading contract the model must follow in every response. Also holds the example prompt/code pairs shown in the initial form (`PROMPT_WITH_CONTEXT`/`CODE_WITH_CONTEXT` and the `_WITHOUT_CONTEXT` variants), the static `PROMPT_TIPS_MD`, and `generateIntegrationGuide()` which builds the "Integration Guide" tab client-side by regex-extracting the function name/async-ness out of the model's generated code and splicing it into a FastAPI/batch-processing template.
- **`src/lib/parser.ts`** — `parseArtifacts()` regex-splits the streamed model response on the `## 1. Optimized Prompt` / `## 2. Optimized Code` / `## 3. 429 Error Reduction Report` / `## 4. requirements.txt` / `## 5. Skill Files` headings (in that fixed order) to populate the artifact tabs and separate out the conversational preamble shown in chat.
- **`server/index.ts`** — the Express backend. Holds the only `GoogleGenAI` client (`vertexai: true`, via ADC), imports `systemInstruction` from `src/lib/constants.ts`, and exposes `POST /api/chat` (stateless: takes `{model, history, message}`, recreates the chat with that history each call, streams the raw text response back chunk-by-chunk over `res.write`). In `NODE_ENV=production` it also serves the built `dist/` as static files with an SPA catch-all.

### Data flow

1. User fills in the initial prompt/code form (or a chat follow-up) in `App.tsx`.
2. `handleSend` `fetch`es `POST /api/chat` with the accumulated `history` plus the new `message` (Vite's dev server proxies `/api` to the Express server per `vite.config.ts`'s `server.proxy`).
3. The Express handler creates a fresh `ai.chats.create({model, history, config: {systemInstruction, tools: [{googleSearch:{}}]}})` and streams `chat.sendMessageStream(...)` chunks back as plain text over a chunked HTTP response.
4. The client reads the response body via `response.body.getReader()`; each decoded chunk is re-parsed in full via `parseArtifacts()` (not incrementally diffed) to progressively fill in the chat bubble text and the five artifact fields. Once the stream ends, the turn is appended to `history` as `{role:'user',...}`/`{role:'model',...}` pairs for the next request.
5. Artifacts persist across chat turns — a later message that omits a heading keeps the previous value (`parsed.X || prev.X`), so the model is instructed to always re-emit all five sections.

### Coupling to watch when editing

- `systemInstruction`'s output-format contract (the exact `## N. <Title>` headings/order) and the regexes in `parser.ts` must stay in sync — changing one without the other breaks artifact extraction.
- The system instruction hardcodes model-naming constraints (Gemini 3 family only, e.g. `gemini-3.1-pro-preview` / `gemini-3-flash-preview`; explicitly forbids `gemini-1.5`/`gemini-2.5`) and specific `google-genai` SDK usage patterns (e.g. `types.CreateCachedContentConfig`, `client.aio.models.generate_content`, `types.Part(text=...)`) — these are deliberate pins, not stale examples.
- `generateIntegrationGuide()` derives the Python function name/sync-vs-async from the model's generated code via regex (`async def`/`def` matching), so it only works correctly if the model's output defines a single top-level function to wrap.
- The backend is stateless by design — the full conversation `history` round-trips from the client on every request rather than being kept in server-side session state, so there's no session store to worry about (and no cross-user leakage risk from shared server state).
