# Gemini API 429 Optimizer

A specialized tool designed to automatically optimize your Python code and prompts to reduce HTTP 429 (Resource Exhausted) errors when using the Google Gemini API.

## Overview

When scaling generative AI applications, hitting rate limits (HTTP 429) is a common challenge. This application acts as an expert Google Cloud AI Architect, taking your initial prompt and sample code, and rewriting them to implement enterprise-grade rate-limit resilience best practices.

## Key Resilience Strategies Implemented

The optimizer aggressively applies the following strategies to your code:

1. **Smart Retries**: Implements exponential backoff with jitter using libraries like `tenacity` to gracefully handle transient errors without overwhelming the API.
2. **Global Model Routing**: Sets up regional failover loops to route traffic to alternative geographic regions when the primary region is exhausted.
3. **Model Fallback**: Automatically degrades to a faster, higher-capacity model (e.g., from `gemini-3.1-pro-preview` to `gemini-3-flash-preview`) during severe rate limiting.
4. **Context Caching**: Optimizes large document processing by implementing the Gemini Context Caching API (for payloads > 1024 tokens), significantly reducing token consumption and processing time.
5. **Traffic Shaping**: Adds concurrency controls and rate limiters to smooth out traffic spikes.
6. **Prompt Hygiene**: Refines prompts to be more token-efficient.

## Generated Artifacts

Upon submitting your code and prompt, the tool generates several artifacts, accessible via tabs:

* **Optimized Prompt**: Your original prompt, refined for efficiency and clarity.
* **Optimized Code**: Production-ready Python code implementing all selected resilience strategies.
* **429 Report**: A detailed breakdown of how each strategy was implemented and its expected impact on reducing 429 errors.
* **requirements.txt**: The necessary Python dependencies (e.g., `google-genai`, `tenacity`) to run the optimized code.
* **Skill Files**: A reusable `SKILL.md` file that encapsulates these rate-limiting best practices into an AI agent skill (compatible with frameworks like LangChain or Google AI Studio Build).
* **Integration Guide**: A dynamic, step-by-step guide on how to integrate the generated code into a production system (like FastAPI or a batch processing pipeline).

## Getting Started

### Prerequisites

* Node.js (v18 or higher)
* A Gemini API Key

### Installation

1. Clone the repository.
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Create a \`.env\` file in the root directory and add your Gemini API key:
   \`\`\`env
   GEMINI_API_KEY=your_api_key_here
   \`\`\`

### Running the Development Server

Start the Vite development server:

\`\`\`bash
npm run dev
\`\`\`

The application will be available at \`http://localhost:3000\`.

## Usage

1. **Provide Inputs**: Paste your initial user prompt and current Python implementation into the left panel.
2. **Configure Strategies**: Toggle "Model Fallback" and "Regional Routing" based on your requirements.
3. **Generate**: Click the "Optimize for 429 Resilience" button.
4. **Review & Iterate**: Explore the generated artifacts in the right panel. You can use the chat interface at the bottom of the left panel to ask for further refinements (e.g., "Make the backoff more aggressive" or "Add async support").
5. **Export**: Use the "Copy to Clipboard" buttons or the Fullscreen view to easily extract the optimized code and guides for your project.

## Tech Stack

* **Frontend**: React 18, TypeScript, Vite
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
* **AI Integration**: `@google/genai` SDK
* **Markdown Rendering**: `react-markdown`, `remark-gfm`
