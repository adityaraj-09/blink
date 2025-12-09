/**
 * LLM Service Module
 * Exports all LLM-related types and clients
 */

// Types
export {
  LLMProvider,
  ModelConfig,
  AVAILABLE_MODELS,
  DEFAULT_MODEL_ID,
  OpenAITool,
  ChatMessage,
  ToolCall,
  LLMCompletionRequest,
  LLMCompletionResponse,
  getModelConfig,
  modelSupportsTools,
  getAvailableModels,
} from './types';

// Client
export {
  OpenRouterClient,
  OpenRouterConfig,
  createOpenRouterClient,
} from './openrouter-client';
