/**
 * TypeScript interfaces for the sidebar React components.
 */

/** Message attachment (page content) */
export interface PageAttachment {
  title: string;
  url: string;
  content: string;
  tokenCount: number;
  truncated: boolean;
}

/** Chat message */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  attachment?: PageAttachment;
  pageUrl?: string | null;
}

/** Background download info */
export interface BackgroundDownload {
  modelName: string;
  displayName: string;
  progress: number;
  text: string;
  isFromCache: boolean | null;
}

/** LLM state from llm-interface */
export interface LLMState {
  status: 'idle' | 'detecting' | 'initializing' | 'downloading' | 'ready' | 'error' | 'gemini-unavailable' | 'awaiting-selection';
  modelName: string | null;
  displayName: string | null;
  error: string | null;
  downloadProgress: number;
  downloadText: string;
  isFromCache: boolean | null;
  summarizerAvailable: boolean;
  geminiNanoAvailable: boolean;
  geminiNanoReason?: string;
  backgroundDownloads: BackgroundDownload[];
}

/** Model information for display */
export interface ModelInfo {
  name: string;
  tagline: string;
  description: string;
  icon: string;
  benefits: string[];
}

/** Model configuration map */
export type ModelInfoMap = Record<string, ModelInfo>;

/** Chat context state */
export interface ChatState {
  messages: Message[];
  isGenerating: boolean;
  currentResponse: string;
  attachment: PageAttachment | null;
}

/** Chat context actions */
export interface ChatActions {
  sendMessage: (message: string) => Promise<void>;
  requestPageSummary: () => Promise<void>;
  clearHistory: () => void;
  setAttachment: (attachment: PageAttachment | null) => void;
}

/** Combined chat context */
export interface ChatContextValue extends ChatState, ChatActions {}
