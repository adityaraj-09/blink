/**
 * OpenRouter Client
 * Unified LLM client using OpenRouter's OpenAI-compatible API
 * Requires OPENROUTER_API_KEY environment variable
 */

import OpenAI from 'openai';
import {
  ChatMessage,
  OpenAITool,
  LLMCompletionRequest,
  LLMCompletionResponse,
  ToolCall,
  getModelConfig,
  DEFAULT_MODEL_ID,
} from './types';

/**
 * OpenRouter client configuration
 */
export interface OpenRouterConfig {
  apiKey: string; // OpenRouter API key
  siteUrl?: string;
  siteName?: string;
}

/**
 * OpenRouter Client Class
 * Wraps OpenAI SDK configured for OpenRouter endpoint
 */
export class OpenRouterClient {
  private client: OpenAI;
  private siteUrl: string;
  private siteName: string;

  constructor(config: OpenRouterConfig) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey,
      defaultHeaders: {
        'HTTP-Referer': config.siteUrl || 'http://localhost:3000',
        'X-Title': config.siteName || 'AI Code Editor',
      },
    });
    this.siteUrl = config.siteUrl || 'http://localhost:3000';
    this.siteName = config.siteName || 'AI Code Editor';
  }

  /**
   * Create a chat completion
   */
  async createCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const modelConfig = getModelConfig(request.model);

    if (!modelConfig) {
      console.warn(`[OpenRouter] Unknown model: ${request.model}, using default`);
    }

    const maxTokens = request.max_tokens || modelConfig?.maxTokens || 4096;

    try {
      console.log(`[OpenRouter] Calling model: ${request.model}`);
      console.log(`[OpenRouter] Messages count: ${request.messages.length}`);
      console.log(`[OpenRouter] Tools count: ${request.tools?.length || 0}`);

      const response = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages as any,
        tools: request.tools as any,
        tool_choice: request.tool_choice as any,
        temperature: request.temperature ?? 0.1,
        max_tokens: maxTokens,
      });

      console.log(`[OpenRouter] Response received, finish_reason: ${response.choices[0]?.finish_reason}`);

      return this.normalizeResponse(response);
    } catch (error: any) {
      console.error('[OpenRouter] API Error:', error.message);

      // Handle specific error types
      if (error.status === 401) {
        throw new Error('Invalid API key. Please check your Gemini API key.');
      }
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (error.status === 400 && error.message?.includes('tools')) {
        throw new Error(`Model ${request.model} does not support tool calling.`);
      }

      throw error;
    }
  }

  /**
   * Create a completion with tool execution loop
   * Handles multiple rounds of tool calls automatically
   */
  async createCompletionWithTools(
    request: LLMCompletionRequest,
    toolExecutor: (toolCall: ToolCall) => Promise<string>,
    maxIterations: number = 5
  ): Promise<{
    response: LLMCompletionResponse;
    toolResults: Array<{ toolCall: ToolCall; result: string }>;
    iterations: number;
  }> {
    let messages = [...request.messages];
    let toolResults: Array<{ toolCall: ToolCall; result: string }> = [];
    let iterations = 0;
    let response: LLMCompletionResponse;

    while (iterations < maxIterations) {
      iterations++;

      response = await this.createCompletion({
        ...request,
        messages,
      });

      const assistantMessage = response.choices[0]?.message;

      // Check if LLM wants to call tools
      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log(`[OpenRouter] Iteration ${iterations}: Processing ${assistantMessage.tool_calls.length} tool calls`);

        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls,
        });

        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          console.log(`[OpenRouter] Executing tool: ${toolCall.function.name}`);

          const result = await toolExecutor(toolCall);
          toolResults.push({ toolCall, result });

          // Add tool result message
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      } else {
        // No more tool calls, return final response
        console.log(`[OpenRouter] Final response after ${iterations} iteration(s)`);
        return { response, toolResults, iterations };
      }
    }

    console.warn(`[OpenRouter] Max iterations (${maxIterations}) reached`);
    return { response: response!, toolResults, iterations };
  }

  /**
   * Simple completion without tools
   */
  async createSimpleCompletion(
    model: string,
    systemPrompt: string,
    userMessage: string,
    temperature: number = 0.1
  ): Promise<string> {
    const response = await this.createCompletion({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Normalize OpenRouter response to our standard format
   */
  private normalizeResponse(response: any): LLMCompletionResponse {
    return {
      id: response.id,
      model: response.model,
      choices: response.choices.map((choice: any) => ({
        index: choice.index,
        message: {
          role: 'assistant',
          content: choice.message.content,
          tool_calls: choice.message.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        },
        finish_reason: this.normalizeFinishReason(choice.finish_reason),
      })),
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Normalize finish reason across providers
   */
  private normalizeFinishReason(reason: string): 'stop' | 'tool_calls' | 'length' | 'content_filter' {
    switch (reason) {
      case 'stop':
      case 'end_turn':
        return 'stop';
      case 'tool_calls':
      case 'function_call':
        return 'tool_calls';
      case 'length':
      case 'max_tokens':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}

/**
 * Create OpenRouter client instance
 */
export function createOpenRouterClient(apiKey?: string): OpenRouterClient {
  const key = apiKey || process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error('API key is required. Set OPENROUTER_API_KEY environment variable.');
  }

  return new OpenRouterClient({
    apiKey: key,
    siteUrl: process.env.SITE_URL || 'http://localhost:3000',
    siteName: process.env.SITE_NAME || 'AI Code Editor',
  });
}
