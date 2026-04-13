import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Send, RefreshCw, Bot, User, FileCode, Terminal, FileText, Zap, Maximize2, X, List, BookOpen, Layers, Info, Copy, Check, Lightbulb, Github } from 'lucide-react';

import { Message, Artifacts } from './types';
import { parseArtifacts } from './lib/parser';
import { 
  systemInstruction, 
  PROMPT_WITH_CONTEXT, 
  PROMPT_WITHOUT_CONTEXT, 
  CODE_WITH_CONTEXT, 
  CODE_WITHOUT_CONTEXT,
  generateIntegrationGuide,
  PROMPT_TIPS_MD
} from './lib/constants';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const codeMatch = text.match(/```[\w]*\n([\s\S]*?)```/);
    const textToCopy = codeMatch ? codeMatch[1].trim() : text.trim();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-md transition-colors text-sm font-medium"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy to Clipboard'}
    </button>
  );
};

const MarkdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={vscDarkPlus as any}
        language={match[1]}
        PreTag="div"
        showLineNumbers={true}
        lineNumberStyle={{ minWidth: '3em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
        customStyle={{
          margin: 0,
          background: 'transparent',
          padding: '1rem',
          fontSize: '0.875rem',
        }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  // Initial form state
  const [includeMockContext, setIncludeMockContext] = useState(true);
  const [initialPrompt, setInitialPrompt] = useState(PROMPT_WITH_CONTEXT);
  const [initialCode, setInitialCode] = useState(CODE_WITH_CONTEXT);

  const [chatSession, setChatSession] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [activeTab, setActiveTab] = useState<'prompt' | 'code' | 'report' | 'skill' | 'integration' | 'tips'>('prompt');
  const [fullscreenTab, setFullscreenTab] = useState<'prompt' | 'code' | 'report' | 'skill' | 'integration' | 'tips' | null>(null);
  const [artifacts, setArtifacts] = useState({ prompt: '', code: '', report: '', requirements: '', skill: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [enableModelFallback, setEnableModelFallback] = useState(true);
  const [enableRegionalRouting, setEnableRegionalRouting] = useState(true);

  const [leftPanelWidth, setLeftPanelWidth] = useState(400);
  const isResizing = useRef(false);

  const startResizing = React.useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = React.useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const resize = React.useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        setLeftPanelWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleToggleContext = () => {
    const newValue = !includeMockContext;
    setIncludeMockContext(newValue);
    setInitialPrompt(newValue ? PROMPT_WITH_CONTEXT : PROMPT_WITHOUT_CONTEXT);
    setInitialCode(newValue ? CODE_WITH_CONTEXT : CODE_WITHOUT_CONTEXT);
  };

  const resetChat = () => {
    setMessages([]);
    setArtifacts({ prompt: '', code: '', report: '', requirements: '', skill: '' });
    setChatSession(null);
    setInput('');
    setInitialPrompt(includeMockContext ? PROMPT_WITH_CONTEXT : PROMPT_WITHOUT_CONTEXT);
    setInitialCode(includeMockContext ? CODE_WITH_CONTEXT : CODE_WITHOUT_CONTEXT);
    setEnableModelFallback(true);
    setEnableRegionalRouting(true);
  };

  const handleInitialSubmit = async () => {
    if (!initialPrompt && !initialCode) return;

    const textToSend = `Inputs Provided by User:

User Prompt:
${initialPrompt || 'None provided.'}

Sample Code:
${initialCode || 'None provided.'}

Configuration Preferences:
- Model Fallback: ${enableModelFallback ? 'ENABLED' : 'DISABLED'}
- Regional Routing: ${enableRegionalRouting ? 'ENABLED' : 'DISABLED'}

Please ensure the generated code and report strictly follow these configuration preferences. If a feature is DISABLED, do NOT include it in the optimized code.`;

    const textToDisplay = `**Initial Request Submitted**\n\n**Prompt:** ${initialPrompt ? 'Provided' : 'None'}\n**Code:** ${initialCode ? 'Provided' : 'None'}\n**Model Fallback:** ${enableModelFallback ? 'Enabled' : 'Disabled'}\n**Regional Routing:** ${enableRegionalRouting ? 'Enabled' : 'Disabled'}`;

    await handleSend(textToSend, textToDisplay);
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const userText = input;
    setInput('');
    await handleSend(userText);
  };

  const handleSend = async (textToSend: string, textToDisplay?: string) => {
    if (isGenerating) return;

    setMessages(prev => [...prev, { role: 'user', text: textToSend, displayText: textToDisplay || textToSend }]);
    setIsGenerating(true);

    try {
      let currentChat = chatSession;
      if (!currentChat) {
        currentChat = ai.chats.create({
          model: selectedModel,
          config: {
            systemInstruction,
            temperature: 0.2,
            tools: [{ googleSearch: {} }],
          }
        });
        setChatSession(currentChat);
      }

      const responseStream = await currentChat.sendMessageStream({ message: textToSend });
      let fullText = '';

      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          const parsed = parseArtifacts(fullText);
          
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].text = parsed.conversational || fullText;
            return newMsgs;
          });

          setArtifacts(prev => ({
            prompt: parsed.prompt || prev.prompt,
            code: parsed.code || prev.code,
            report: parsed.report || prev.report,
            requirements: parsed.requirements || prev.requirements,
            skill: parsed.skill || prev.skill
          }));
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: `**Error:** ${err.message || 'An error occurred.'}` }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0e0e0e] text-gray-100 font-sans overflow-hidden">
      {/* Left Panel - Chat */}
      <div style={{ width: leftPanelWidth }} className="flex flex-col bg-[#171717] shrink-0">
        {/* Header */}
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h1 className="font-semibold text-sm">429 Optimizer</h1>
          </div>
          <div className="flex items-center gap-4 pr-1">
            <a href="https://github.com/UriKatsirPrivate/Vertex-AI-429-Optimizer" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#171717] border-2 border-blue-600 ring-2 ring-white transition-transform hover:scale-105" title="GitHub Repository">
              <Github className="w-4 h-4 text-gray-400" />
            </a>
            <button onClick={resetChat} className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 transition-colors" title="Reset Chat">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Model Selector */}
        <div className="p-3 border-b border-gray-800 shrink-0">
          <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={messages.length > 0}
            className="w-full bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
          >
            <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
            <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
          </select>
          {messages.length > 0 && (
            <p className="text-[10px] text-gray-500 mt-1">Reset chat to change model.</p>
          )}
        </div>

        {/* Chat Messages or Initial Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="text-center text-gray-500 text-sm mt-2 mb-6">
                <Bot className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                <p>Provide your inputs below to generate rate-limit resilient artifacts.</p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold">User Prompt</label>
                  <button onClick={() => setInitialPrompt('')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear</button>
                </div>
                <textarea
                  value={initialPrompt}
                  onChange={(e) => setInitialPrompt(e.target.value)}
                  placeholder="Enter the core instruction..."
                  className="w-full bg-gray-800 text-gray-200 text-sm rounded-xl px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 resize-y h-24"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-400 uppercase tracking-wider font-semibold">Sample Code</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-gray-400">Include MOCK_CONTEXT</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${includeMockContext ? 'bg-blue-600' : 'bg-gray-600'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${includeMockContext ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={includeMockContext} onChange={handleToggleContext} />
                    </label>
                    <button onClick={() => setInitialCode('')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear</button>
                  </div>
                </div>
                <textarea
                  value={initialCode}
                  onChange={(e) => setInitialCode(e.target.value)}
                  placeholder="Paste your current implementation..."
                  className="w-full bg-gray-800 text-gray-200 text-sm rounded-xl px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 resize-y h-32 font-mono"
                />
              </div>

              <div className="flex flex-col gap-3 mt-4 mb-2 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1 group relative">
                  <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Resilience Strategies</h3>
                  <Info className="w-3 h-3 text-gray-500 cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-72 p-3 bg-gray-900 border border-gray-700 rounded-md text-xs text-gray-300 shadow-xl z-10 space-y-2">
                    <p><strong className="text-gray-200">Model Fallback:</strong> Switches to a different model tier (e.g., Pro to Flash) when the primary model is rate-limited.</p>
                    <p><strong className="text-gray-200">Regional Routing:</strong> Switches to the same model in a different geographic region when the primary region is rate-limited.</p>
                  </div>
                </div>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Model Fallback</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${enableModelFallback ? 'bg-blue-600' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${enableModelFallback ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <input type="checkbox" className="hidden" checked={enableModelFallback} onChange={() => setEnableModelFallback(!enableModelFallback)} />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Regional Routing</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${enableRegionalRouting ? 'bg-blue-600' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${enableRegionalRouting ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <input type="checkbox" className="hidden" checked={enableRegionalRouting} onChange={() => setEnableRegionalRouting(!enableRegionalRouting)} />
                </label>
              </div>

              <button
                onClick={handleInitialSubmit}
                disabled={(!initialPrompt && !initialCode) || isGenerating}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 mt-4"
              >
                <Send className="w-4 h-4" />
                Generate Artifacts
              </button>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {msg.displayText || msg.text}
                      </Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area (Only show if chat has started) */}
        {messages.length > 0 && (
          <div className="p-4 bg-[#171717] border-t border-gray-800 shrink-0">
            <form onSubmit={handleChatSubmit} className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit();
                  }
                }}
                placeholder="Ask for tweaks or refinements..."
                className="w-full bg-gray-800 text-gray-200 text-sm rounded-xl pl-4 pr-12 py-3 border border-gray-700 focus:outline-none focus:border-blue-500 resize-none h-20"
              />
              <button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Resizer */}
      <div 
        onMouseDown={startResizing}
        className="w-1 cursor-col-resize bg-gray-800 hover:bg-blue-500 transition-colors shrink-0 z-10"
      />

      {/* Right Panel - Artifacts */}
      <div className="flex-1 flex flex-col bg-[#0e0e0e] min-w-0">
        {/* Tabs */}
        <div className="h-14 border-b border-gray-800 flex items-center px-4 gap-2 shrink-0 bg-[#121212]">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'prompt' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
          >
            <Terminal className="w-4 h-4" />
            Optimized Prompt
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'code' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
          >
            <FileCode className="w-4 h-4" />
            Optimized Code
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'report' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
          >
            <FileText className="w-4 h-4" />
            429 Report
          </button>
          <button
            onClick={() => setActiveTab('skill')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'skill' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
          >
            <BookOpen className="w-4 h-4" />
            Skill
          </button>
          <button
            onClick={() => setActiveTab('integration')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'integration' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
          >
            <Layers className="w-4 h-4" />
            Integration Guide
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'tips' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
          >
            <Lightbulb className="w-4 h-4" />
            Prompt Tips
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'prompt' && (
              artifacts.prompt ? (
                <div className="animate-in fade-in duration-300 relative">
                  <button onClick={() => setFullscreenTab('prompt')} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white bg-gray-800 rounded-md transition-colors z-10" title="Fullscreen">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <div className="prose prose-invert max-w-none prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-gray-800 pt-10">
                    <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                      {artifacts.prompt}
                    </Markdown>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center mt-32 flex flex-col items-center gap-4">
                  <Terminal className="w-12 h-12 text-gray-700" />
                  <p>No optimized prompt generated yet.</p>
                </div>
              )
            )}
            {activeTab === 'code' && (
              (artifacts.code || artifacts.requirements) ? (
                <div className="animate-in fade-in duration-300 relative">
                  <button onClick={() => setFullscreenTab('code')} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white bg-gray-800 rounded-md transition-colors z-10" title="Fullscreen">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <div className="prose prose-invert max-w-none prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-gray-800 pt-10">
                    {artifacts.requirements && (
                      <>
                        <h3 className="text-xl font-semibold mt-0 mb-4">requirements.txt</h3>
                        <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                          {artifacts.requirements}
                        </Markdown>
                      </>
                    )}
                    {artifacts.code && (
                      <>
                        {artifacts.requirements && <h3 className="text-xl font-semibold mt-8 mb-4">Optimized Code</h3>}
                        <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                          {artifacts.code}
                        </Markdown>
                        <div className="mt-4 flex justify-end">
                          <CopyButton text={artifacts.code} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center mt-32 flex flex-col items-center gap-4">
                  <FileCode className="w-12 h-12 text-gray-700" />
                  <p>No optimized code generated yet.</p>
                </div>
              )
            )}
            {activeTab === 'report' && (
              artifacts.report ? (
                <div className="animate-in fade-in duration-300 relative">
                  <button onClick={() => setFullscreenTab('report')} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white bg-gray-800 rounded-md transition-colors z-10" title="Fullscreen">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <div className="prose prose-invert max-w-none prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-gray-800 pt-10">
                    <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                      {artifacts.report}
                    </Markdown>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center mt-32 flex flex-col items-center gap-4">
                  <FileText className="w-12 h-12 text-gray-700" />
                  <p>No report generated yet.</p>
                </div>
              )
            )}
            {activeTab === 'skill' && (
              artifacts.skill ? (
                <div className="animate-in fade-in duration-300 relative">
                  <button onClick={() => setFullscreenTab('skill')} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white bg-gray-800 rounded-md transition-colors z-10" title="Fullscreen">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <div className="prose prose-invert max-w-none prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-gray-800 pt-10">
                    <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                      {artifacts.skill}
                    </Markdown>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center mt-32 flex flex-col items-center gap-4">
                  <BookOpen className="w-12 h-12 text-gray-700" />
                  <p>No skill files generated yet.</p>
                </div>
              )
            )}
            {activeTab === 'integration' && (
              (artifacts.code || artifacts.prompt) ? (
                <div className="animate-in fade-in duration-300 relative">
                  <button onClick={() => setFullscreenTab('integration')} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white bg-gray-800 rounded-md transition-colors z-10" title="Fullscreen">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <div className="prose prose-invert max-w-none prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-gray-800 pt-10">
                    <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                      {generateIntegrationGuide(artifacts)}
                    </Markdown>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center mt-32 flex flex-col items-center gap-4">
                  <Layers className="w-12 h-12 text-gray-700" />
                  <p>No integration guide generated yet.</p>
                </div>
              )
            )}
            {activeTab === 'tips' && (
              <div className="animate-in fade-in duration-300 relative">
                <button onClick={() => setFullscreenTab('tips')} className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white bg-gray-800 rounded-md transition-colors z-10" title="Fullscreen">
                  <Maximize2 className="w-4 h-4" />
                </button>
                <div className="prose prose-invert max-w-none prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-gray-800 pt-10">
                  <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {PROMPT_TIPS_MD}
                  </Markdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenTab && (
        <div className="fixed inset-0 z-50 bg-[#0e0e0e] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 bg-[#121212]">
            <div className="flex items-center gap-2 text-gray-200 font-medium">
              {fullscreenTab === 'prompt' && <><Terminal className="w-5 h-5" /> Optimized Prompt</>}
              {fullscreenTab === 'code' && <><FileCode className="w-5 h-5" /> Optimized Code</>}
              {fullscreenTab === 'report' && <><FileText className="w-5 h-5" /> 429 Report</>}
              {fullscreenTab === 'skill' && <><BookOpen className="w-5 h-5" /> Skill Files</>}
              {fullscreenTab === 'integration' && <><Layers className="w-5 h-5" /> Integration Guide</>}
              {fullscreenTab === 'tips' && <><Lightbulb className="w-5 h-5" /> Prompt Tips</>}
            </div>
            <button onClick={() => setFullscreenTab(null)} className="p-2 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors" title="Close Fullscreen">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto">
              <div className="prose prose-invert max-w-none prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-gray-800">
                {fullscreenTab === 'code' ? (
                  <>
                    {artifacts.requirements && (
                      <>
                        <h3 className="text-xl font-semibold mt-0 mb-4">requirements.txt</h3>
                        <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                          {artifacts.requirements}
                        </Markdown>
                      </>
                    )}
                    {artifacts.code && (
                      <>
                        {artifacts.requirements && <h3 className="text-xl font-semibold mt-8 mb-4">Optimized Code</h3>}
                        <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                          {artifacts.code}
                        </Markdown>
                        <div className="mt-4 flex justify-end">
                          <CopyButton text={artifacts.code} />
                        </div>
                      </>
                    )}
                  </>
                ) : fullscreenTab === 'integration' ? (
                  <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {generateIntegrationGuide(artifacts)}
                  </Markdown>
                ) : fullscreenTab === 'tips' ? (
                  <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {PROMPT_TIPS_MD}
                  </Markdown>
                ) : (
                  <Markdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {fullscreenTab && (fullscreenTab as string) !== 'integration' && (fullscreenTab as string) !== 'tips' ? artifacts[fullscreenTab as keyof Artifacts] : ''}
                  </Markdown>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

