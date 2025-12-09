/**
 * LLM Service Types
 * Unified types for multi-provider LLM support via OpenRouter
 */

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'deepseek';

/**
 * Model configuration with capabilities
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: LLMProvider;
  supportsTools: boolean;
  maxTokens: number;
  contextWindow: number;
}

/**
 * Available models registry
 */
export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  // Google Models
  'google/gemini-2.0-flash': {
    id: 'google/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    supportsTools: true,
    maxTokens: 8192,
    contextWindow: 1000000,
  },
  'google/gemini-2.5-pro-preview': {
    id: 'google/gemini-2.5-pro-preview',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    supportsTools: true,
    maxTokens: 8192,
    contextWindow: 1000000,
  },
  // OpenAI Models
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    supportsTools: true,
    maxTokens: 4096,
    contextWindow: 128000,
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    supportsTools: true,
    maxTokens: 4096,
    contextWindow: 128000,
  },
  // Anthropic Models
  'anthropic/claude-sonnet-4': {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    supportsTools: true,
    maxTokens: 8192,
    contextWindow: 200000,
  },
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    supportsTools: true,
    maxTokens: 8192,
    contextWindow: 200000,
  },
  // DeepSeek Models
  'deepseek/deepseek-chat': {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    supportsTools: true,
    maxTokens: 4096,
    contextWindow: 64000,
  },
};

/**
 * Default model ID
 */
export const DEFAULT_MODEL_ID = 'google/gemini-2.0-flash';

/**
 * Tool definition in OpenAI format
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

/**
 * Chat message in OpenAI format
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Tool call from LLM response
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * LLM completion request
 */
export interface LLMCompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: OpenAITool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
}

/**
 * LLM completion response
 */
export interface LLMCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Get model config by ID
 */
export function getModelConfig(modelId: string): ModelConfig | null {
  
  return AVAILABLE_MODELS[modelId] || null;
}

/**
 * Check if model supports tools
 */
export function modelSupportsTools(modelId: string): boolean {
  const config = getModelConfig(modelId);
  return config?.supportsTools ?? false;
}

/**
 * Get all available models as array
 */
export function getAvailableModels(): ModelConfig[] {
  return Object.values(AVAILABLE_MODELS);
}
