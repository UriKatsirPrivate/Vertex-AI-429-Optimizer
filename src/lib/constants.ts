import { Artifacts } from '../types';

export const PROMPT_TIPS_MD = `# Prompt Engineering for Rate Limit Resilience

Writing token-efficient prompts is a critical, often overlooked strategy for preventing HTTP 429 (Resource Exhausted) errors. By reducing the number of input and output tokens, you decrease the load on the API and stay within your quota limits.

Here are the best practices for token-efficient prompt engineering:

## 1. Be Concise and Direct
Remove conversational filler, pleasantries, and unnecessary context. Every word consumes tokens.

**Before (Inefficient):**
> "Hello there! I was wondering if you could please help me out with a quick task. I need you to look at this text and tell me what the main points are. Thanks so much!"

**After (Efficient):**
> "Summarize the main points of the following text:"

## 2. Use Few-Shot Prompting
Instead of writing lengthy, complex instructions explaining how you want the output formatted, provide 1-3 clear examples. The model learns the pattern much faster and with fewer tokens than reading a long explanation.

**Before (Inefficient):**
> "I want you to extract the names of the companies mentioned in the text. Please format the output as a JSON array. Make sure the keys are 'company_name' and the values are strings. Do not include any other text in your response, just the JSON."

**After (Efficient):**
> "Extract company names as JSON.
> Example:
> Text: Apple and Google announced a partnership.
> Output: [{"company_name": "Apple"}, {"company_name": "Google"}]
> 
> Text: [YOUR TEXT HERE]
> Output:"

## 3. Constrain the Output
Explicitly tell the model to be brief. If you only need a yes/no answer or a specific data point, say so. This prevents the model from generating long, token-heavy explanations.

**Before (Inefficient):**
> "Analyze this customer review and tell me if they are happy or sad." (Model might respond with a 3-paragraph analysis)

**After (Efficient):**
> "Analyze this review. Respond with ONLY 'POSITIVE' or 'NEGATIVE'."

## 4. Leverage Context Caching
If you are repeatedly sending the same large block of text (like a system prompt, a large document, or a codebase) along with different user queries, use the Gemini Context Caching API. 

*   **Standard approach:** 10,000 tokens sent 5 times = 50,000 tokens consumed from your quota.
*   **Cached approach:** 10,000 tokens cached once + (50 tokens per query * 5) = 10,250 tokens consumed.

*Note: Context caching requires a minimum of 1,024 tokens to activate.*

## 5. Use Structured Data Formats (Carefully)
While asking for JSON is great for programmatic parsing, JSON syntax (brackets, quotes, commas) consumes tokens. If you are extremely tight on quota and don't need strict JSON parsing, consider simpler delimiters like CSV or pipe-separated values.

**JSON (More tokens):**
> \`{"name": "John", "age": 30}\`

**CSV (Fewer tokens):**
> \`John,30\`
`;

export const systemInstruction = `Role: You are an expert Google Cloud AI Architect specializing in Vertex AI and Gemini application resilience. Your primary goal is to take a user's prompt, sample code, and any uploaded context files, and optimize them to completely minimize HTTP 429 (Resource Exhausted) errors.

Task:
Review the provided inputs and rewrite the code and prompt to implement best practices for rate-limit resilience. You must aggressively apply the following strategies (unless explicitly disabled by the user in the configuration):
1. Smart Retries (Exponential Backoff with Jitter)
2. Global Model Routing (If enabled by user: Implement a "global" endpoint and a Regional Failover Loop. Your implementation should allow the user to use either option or both.)
3. Model Fallback (If enabled by user. CRITICAL: You MUST use Gemini 3 models for BOTH the primary and fallback models in your generated code. DO NOT use gemini-1.5 or gemini-2.5 models. Examples of valid models: gemini-3.1-pro-preview, gemini-3-flash-preview.)
4. Context Caching (CRITICAL: When using the google-genai SDK for Context Caching, you MUST pass 'contents' inside 'types.CreateCachedContentConfig(contents=[...])' and pass that as the 'config' argument to 'client.caches.create(model=..., config=...)'. DO NOT use 'ttl_seconds'. If you need to specify a TTL, use 'ttl="600s"', but it is often safer to omit it. Also, when making async calls, use 'client.aio.models.generate_content'. When constructing parts, use 'types.Part(text=...)' instead of 'Part.from_text()', and 'types.Content(role="user", parts=[...])'. IMPORTANT: Context caching requires a minimum of 1024 tokens. Your code MUST include a try-except block around the cache creation or a length check to gracefully fall back to standard non-cached calls if the context is too small.)
5. Prompt Hygiene
6. Traffic Shaping
7. Async Execution: If your optimized code uses asyncio, ensure it can be run in environments with an existing event loop (like Jupyter Notebooks). Provide instructions or code to handle this gracefully (e.g., using 'nest_asyncio' or checking for a running loop before calling 'asyncio.run()').

CRITICAL: You MUST use the Google Search tool when creating the suggested prompt and sample code to ensure you are using the latest, most accurate best practices. Use Google Search to verify your answers and validate any code patterns or API parameters.

Output Format:
First, provide a brief conversational response acknowledging the request and summarizing the approach.
Then, you MUST provide the artifacts using EXACTLY these headings:

## 1. Optimized Prompt
[Your optimized prompt here]

## 2. Optimized Code
[Your optimized code here]

## 3. 429 Error Reduction Report
[Your detailed report here. CRITICAL: You MUST explicitly address ALL of the following strategies in your report: Smart Retries, Regional Failover, Global Model Routing, Model Fallback, Context Caching, Traffic Shaping, and Prompt Hygiene. For EACH strategy, you MUST include at least two categories: "Implementation Detail" (which MUST include specific code snippets or line numbers demonstrating where the strategy is implemented in the optimized code) and "Granular Impact Analysis" (providing a detailed, granular analysis of its impact on 429 errors). If any strategy is deemed irrelevant or not implemented, you MUST still list it and explain why it was omitted under "Implementation Detail".]

## 4. requirements.txt
[Your requirements.txt here]

## 5. Skill Files
You must generate a SKILL.md file that encapsulates these 429-reduction best practices. Use markdown code blocks for the file (e.g., \`\`\`markdown\\n...\`\`\`).

CRITICAL SKILL.md FORMATTING RULES:
1. Must start with YAML frontmatter enclosed in \`---\`.
2. Frontmatter must include \`name\` (kebab-case only, no spaces/capitals) and \`description\` (explain what it does AND provide specific trigger phrases).
3. Do NOT use XML tags (< or >) in the frontmatter.
4. The body must include a clear role, a step-by-step Workflow, and Output Format.

Example SKILL.md structure:
\`\`\`markdown
---
name: 429-resilience-optimizer
description: Optimizes Python code and prompts to prevent HTTP 429 Resource Exhausted errors. Trigger when asked to fix rate limits, optimize Gemini API calls, or implement backoff/caching.
---

# 429 Resilience Optimizer Skill

You are an expert Google Cloud AI Architect...

## Workflow
1. **Analyze**: ...
2. **Implement Retries**: ...

## Output Format
...
\`\`\`

For subsequent messages, if the user asks for tweaks, you must output the updated artifacts using the exact same headings. If an artifact doesn't need to change, you can omit it, but it's preferred to output all five to keep the UI in sync.`;

export const PROMPT_WITH_CONTEXT = 'Optimize this Python code to prevent 429 Resource Exhausted errors.\nWe are making many concurrent calls to analyze_document with different queries but the same large context.';
export const PROMPT_WITHOUT_CONTEXT = 'Optimize this Python code to prevent 429 Resource Exhausted errors.\nWe are making many concurrent calls to analyze_document with different queries.';

export const CODE_WITH_CONTEXT = `import os
from google import genai

# Mock context: A large document or dataset
MOCK_CONTEXT = """
[START OF MOCK CONTEXT]
Company Policy Document v1.0
1. Vacation: 20 days per year.
2. Travel: Economy class only.
3. Expenses: Submit within 30 days.
... (imagine 100,000 tokens of text here) ...
[END OF MOCK CONTEXT]
"""

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def analyze_document(query: str):
    # Currently sending the large context every time, which consumes quota quickly
    prompt = f"Context: {MOCK_CONTEXT}\\n\\nQuery: {query}"
    
    response = client.models.generate_content(
        model='gemini-2.5-pro',
        contents=prompt,
    )
    return response.text

# Example usage (imagine this being called 100s of times concurrently)
print(analyze_document("What is the vacation policy?"))
print(analyze_document("How do I expense travel?"))`;

export const CODE_WITHOUT_CONTEXT = `import os
from google import genai

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def analyze_document(query: str):
    prompt = f"Query: {query}"
    
    response = client.models.generate_content(
        model='gemini-2.5-pro',
        contents=prompt,
    )
    return response.text

# Example usage (imagine this being called 100s of times concurrently)
print(analyze_document("What is the vacation policy?"))
print(analyze_document("How do I expense travel?"))`;

export const generateIntegrationGuide = (artifacts: Artifacts | null) => {
  let functionName = 'analyze_document_with_resilience';
  let isAsync = true;

  if (artifacts?.code) {
    const asyncMatch = artifacts.code.match(/async def ([a-zA-Z0-9_]+)\(/);
    if (asyncMatch) {
      functionName = asyncMatch[1];
      isAsync = true;
    } else {
      const syncMatch = artifacts.code.match(/def ([a-zA-Z0-9_]+)\(/);
      if (syncMatch) {
        functionName = syncMatch[1];
        isAsync = false;
      }
    }
  }

  const requirementsText = artifacts?.requirements 
    ? artifacts.requirements.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim()
    : 'google-genai\\ntenacity\\nnest-asyncio';

  return `# Integration Guide: Productionizing Your Optimized Gemini App

This guide demonstrates how to integrate the optimized code and prompt into a larger production application, ensuring rate-limit resilience (HTTP 429 handling) at scale.

## 1. Project Setup

First, set up your environment using the generated \`requirements.txt\`.

\`\`\`bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Set your API keys and configuration
export GEMINI_API_KEY="your-primary-api-key"
export GEMINI_FALLBACK_API_KEY="your-fallback-api-key" # If using regional routing
\`\`\`

**Your generated requirements:**
\`\`\`text
${requirementsText}
\`\`\`

## 2. Execution Flow

When integrating the optimized function into a larger system (like a web API or a batch processing pipeline), the execution flow should look like this:

1. **Request Ingestion**: The system receives a request (e.g., via FastAPI or a message queue like Celery/PubSub).
2. **Context Management**: If using Context Caching, the system checks if a valid cache exists for the large document. If not, it creates one.
3. **Optimized Execution**: The system calls your optimized function (which handles its own exponential backoff, jitter, and model fallbacks).
4. **Response/Error Handling**: 
   - On success, return the result.
   - On terminal failure (e.g., all retries exhausted), log the failure and return a graceful degradation response to the user.

## 3. Example: FastAPI Integration

Here is an example of how to wrap your optimized code in a FastAPI backend.

\`\`\`python
import os
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel

# Import your optimized function from the generated code
# Assuming you saved it as \`gemini_optimizer.py\`
from gemini_optimizer import ${functionName}

app = FastAPI(title="Resilient Gemini API")
logging.basicConfig(level=logging.INFO)

class AnalyzeRequest(BaseModel):
    query: str
    document_id: str

@app.post("/api/v1/analyze")
async def analyze_endpoint(request: AnalyzeRequest):
    try:
        # The optimized function handles 429 retries and fallbacks internally
        logging.info(f"Starting analysis for document {request.document_id}")
        
        result = ${isAsync ? 'await ' : ''}${functionName}(
            query=request.query,
            # Pass any other necessary context or IDs
        )
        
        return {
            "status": "success",
            "data": result
        }
        
    except Exception as e:
        # This block is only reached if all retries and fallbacks fail
        logging.error(f"Terminal failure during analysis: {str(e)}")
        raise HTTPException(
            status_code=503, 
            detail="Service temporarily unavailable due to high load. Please try again later."
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
\`\`\`

## 4. Batch Processing (Alternative)

If you are processing thousands of documents offline, integrate the optimized function with a ThreadPoolExecutor or an async queue:

\`\`\`python
${isAsync ? `import asyncio
from gemini_optimizer import ${functionName}

queries = ["Query 1", "Query 2", "Query 3"] # Thousands of queries

async def process_batch():
    tasks = [${functionName}(q) for q in queries]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for q, r in zip(queries, results):
        print(f"{q}: {r}")

if __name__ == "__main__":
    asyncio.run(process_batch())` : `import concurrent.futures
from gemini_optimizer import ${functionName}

queries = ["Query 1", "Query 2", "Query 3"] # Thousands of queries

def process_query(query):
    try:
        return ${functionName}(query)
    except Exception as e:
        print(f"Failed to process {query}: {e}")
        return None

# The optimized function's internal backoff prevents the thread pool 
# from instantly exhausting your quota.
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(process_query, queries))` }
\`\`\`

## 5. Monitoring

To ensure your resilience strategies are working:
- **Log 429s**: Ensure your retry decorator logs a warning every time a 429 occurs.
- **Track Latency**: Exponential backoff increases response time. Monitor P95 latency to ensure it remains acceptable for your use case.
- **Alerting**: Set up alerts if the fallback model is triggered frequently, as this indicates your primary region/tier is under-provisioned.

## 6. Using the Generated Skill

The generated \`SKILL.md\` file encapsulates these rate-limiting best practices into a reusable AI agent skill.

**How to use it:**
1. Save the contents of the **Skill** tab into a file named \`SKILL.md\` within a dedicated folder (e.g., \`skills/429-optimizer/SKILL.md\`).
2. If you are using an AI agent framework (like Google AI Studio Build, LangChain, or a custom agent), register this folder as a tool or skill directory.
3. When interacting with your agent, you can now trigger this skill by asking it to "optimize my Gemini API calls for rate limits" or "fix HTTP 429 errors in this code". The agent will automatically read the \`SKILL.md\` instructions and apply the exact same resilience strategies (retries, caching, fallbacks) to any new code it writes.
`;
};
