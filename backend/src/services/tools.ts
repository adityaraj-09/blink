import { ChromaService, SearchResult } from './chroma-service';
import { GeminiEmbeddingService } from './gemini-embedding-service';
import { FileEditService } from './FileEditService';
import Exa from 'exa-js';
import * as path from 'path';
import { DatabaseSchema } from '../database/schema';
import { OpenAITool, ToolCall } from './llm';

/**
 * Tool definition for Gemini function calling (legacy)
 * @deprecated Use OpenAITool instead
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Result from executing a tool
 */
export interface ToolResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  tokensUsed?: number; // Estimated tokens in result
}

/**
 * Tool execution context
 */
export interface ToolContext {
  projectId: string;
  sessionId?: string;
  chroma: ChromaService;
  embeddings: GeminiEmbeddingService;
  fileEditService: FileEditService;
  db: DatabaseSchema;
  exaApiKey?: string;
}

/**
 * All available tools for AI code editing
 */
export class AITools {
  /**
   * Get all tool definitions in OpenAI format (for OpenRouter)
   */
  static getOpenAITools(): OpenAITool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'search_codebase',
          description: 'Search the codebase using vector similarity to find relevant code, functions, classes, or implementations. Use when you need to locate specific functionality or understand how something works.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Natural language search query describing what code to find (e.g., "authentication logic", "database connection", "user validation")'
              },
              maxResults: {
                type: 'number',
                description: 'Number of code chunks to return (default 10, max 20). Use higher numbers for broader understanding.'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read the complete contents of a specific file. Use when you need to see the full implementation, understand file structure, or work with specific code.',
          parameters: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Relative path to the file from project root (e.g., "src/services/AuthService.ts")'
              }
            },
            required: ['filePath']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_project',
          description: 'Get an overview of the entire project structure including all files, directories, and a summary of the codebase. Use when you need to understand project architecture, find file locations, or get a holistic view. WARNING: This can return large amounts of data.',
          parameters: {
            type: 'object',
            properties: {
              includeContent: {
                type: 'boolean',
                description: 'If true, includes file contents (WARNING: very large). If false, only shows file tree and metadata (recommended).'
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum directory depth to traverse (default 10)'
              },
              filePattern: {
                type: 'string',
                description: 'Optional glob pattern to filter files (e.g., "**/*.ts" for TypeScript files only)'
              }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_web',
          description: 'Search the web using Exa.ai for documentation, libraries, API references, or current information not available in the codebase. ONLY use when user explicitly mentions websites, URLs, documentation, or web-related queries.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Web search query (e.g., "React hooks documentation", "TypeScript generics tutorial")'
              },
              numResults: {
                type: 'number',
                description: 'Number of results to return (default 5, max 10)'
              },
              category: {
                type: 'string',
                description: 'Search category: "documentation", "github", "research_paper". Optional field.'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_chat_history',
          description: 'Retrieve previous conversation messages from this session. ONLY use when user explicitly references past discussion (e.g., "as we discussed", "earlier you mentioned", "remember when").',
          parameters: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of recent messages to retrieve (default 5, max 20)'
              }
            },
            required: []
          }
        }
      }
    ];
  }

  /**
   * Get all tool definitions for Gemini (legacy)
   * @deprecated Use getOpenAITools() instead
   */
  static getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'search_codebase',
        description: 'Search the codebase using vector similarity to find relevant code, functions, classes, or implementations. Use when you need to locate specific functionality or understand how something works.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query describing what code to find (e.g., "authentication logic", "database connection", "user validation")'
            },
            maxResults: {
              type: 'number',
              description: 'Number of code chunks to return (default 10, max 20). Use higher numbers for broader understanding.',
              default: 10
            }
          },
          required: ['query']
        }
      },
      {
        name: 'read_file',
        description: 'Read the complete contents of a specific file. Use when you need to see the full implementation, understand file structure, or work with specific code.',
        parameters: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Relative path to the file from project root (e.g., "src/services/AuthService.ts")'
            }
          },
          required: ['filePath']
        }
      },
      {
        name: 'read_project',
        description: 'Get an overview of the entire project structure including all files, directories, and a summary of the codebase. Use when you need to understand project architecture, find file locations, or get a holistic view. WARNING: This can return large amounts of data.',
        parameters: {
          type: 'object',
          properties: {
            includeContent: {
              type: 'boolean',
              description: 'If true, includes file contents (WARNING: very large). If false, only shows file tree and metadata (recommended).',
              default: false
            },
            maxDepth: {
              type: 'number',
              description: 'Maximum directory depth to traverse (default 10)',
              default: 10
            },
            filePattern: {
              type: 'string',
              description: 'Optional glob pattern to filter files (e.g., "**/*.ts" for TypeScript files only)',
            }
          },
          required: []
        }
      },
      {
        name: 'search_web',
        description: 'Search the web using Exa.ai for documentation, libraries, API references, or current information not available in the codebase. ONLY use when user explicitly mentions websites, URLs, documentation, or web-related queries.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Web search query (e.g., "React hooks documentation", "TypeScript generics tutorial")'
            },
            numResults: {
              type: 'number',
              description: 'Number of results to return (default 5, max 10)',
              default: 5
            },
            category: {
              type: 'string',
              description: 'Search category: "documentation", "github", "research_paper". Optional field.',
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_chat_history',
        description: 'Retrieve previous conversation messages from this session. ONLY use when user explicitly references past discussion (e.g., "as we discussed", "earlier you mentioned", "remember when").',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of recent messages to retrieve (default 5, max 20)',
              default: 5
            }
          },
          required: []
        }
      }
    ];
  }

  /**
   * Execute a tool from OpenAI-format tool call
   */
  static async executeToolCall(
    toolCall: ToolCall,
    context: ToolContext
  ): Promise<ToolResult> {
    const args = JSON.parse(toolCall.function.arguments);
    return this.executeTool(toolCall.function.name, args, context);
  }

  /**
   * Execute a tool based on function call from LLM
   */
  static async executeTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      switch (toolName) {
        case 'search_codebase':
          return await this.searchCodebase(
            {
              query: args.query,
              maxResults: args.maxResults
            },
            context
          );

        case 'read_file':
          return await this.readFile(
            {
              filePath: args.filePath
            },
            context
          );

        case 'read_project':
          return await this.readProject(args, context);

        case 'search_web':
          return await this.searchWeb(
            {
              query: args.query,
              numResults: args.numResults,
              category: args.category
            },
            context
          );

        case 'get_chat_history':
          return await this.getChatHistory(
            {
              limit: args.limit
            },
            context
          );

        default:
          return {
            toolName,
            success: false,
            error: `Unknown tool: ${toolName}`
          };
      }
    } catch (error) {
      return {
        toolName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run terminal command (returns instruction for frontend execution)
   */
  private static async runTerminalCommand(
    args: { command: string; cwd?: string },
    context: ToolContext
  ): Promise<ToolResult> {
    // WebContainer runs in the frontend, so we return an instruction
    // The frontend will execute this and report back
    return {
      toolName: 'run_terminal_command',
      success: true,
      data: {
        type: 'webcontainer_action',
        action: 'run_command',
        command: args.command,
        cwd: args.cwd,
        message: `Will execute command: ${args.command}${args.cwd ? ` in ${args.cwd}` : ''}`
      },
      tokensUsed: this.estimateTokens(args.command)
    };
  }

  /**
   * Install npm packages (returns instruction for frontend execution)
   */
  private static async installNpmPackages(
    args: { packages?: string[]; dev?: boolean },
    context: ToolContext
  ): Promise<ToolResult> {
    const packages = args.packages || [];
    const isInstallAll = packages.length === 0;
    const command = isInstallAll
      ? 'npm install'
      : `npm install ${args.dev ? '--save-dev ' : ''}${packages.join(' ')}`;

    return {
      toolName: 'install_npm_packages',
      success: true,
      data: {
        type: 'webcontainer_action',
        action: 'install_packages',
        packages,
        dev: args.dev || false,
        command,
        message: isInstallAll
          ? 'Will install all dependencies from package.json'
          : `Will install packages: ${packages.join(', ')}${args.dev ? ' (as dev dependencies)' : ''}`
      },
      tokensUsed: this.estimateTokens(command)
    };
  }

  /**
   * Start dev server (returns instruction for frontend execution)
   */
  private static async startDevServer(
    args: { command?: string },
    context: ToolContext
  ): Promise<ToolResult> {
    const command = args.command || 'npm run dev';

    return {
      toolName: 'start_dev_server',
      success: true,
      data: {
        type: 'webcontainer_action',
        action: 'start_server',
        command,
        message: `Will start development server with: ${command}`
      },
      tokensUsed: this.estimateTokens(command)
    };
  }

  /**
   * Search codebase using vector similarity
   */
  private static async searchCodebase(
    args: { query: string; maxResults?: number },
    context: ToolContext
  ): Promise<ToolResult> {
    const maxResults = Math.min(args.maxResults || 10, 20);

    const embedding = await context.embeddings.embed(args.query);
    const results = await context.chroma.search(
      context.projectId,
      embedding,
      maxResults,
      0.6
    );

    // Build formatted context
    const formattedResults = results.map((result, index) => ({
      index: index + 1,
      filePath: result.payload.filePath,
      startLine: result.payload.startLine,
      endLine: result.payload.endLine,
      chunkType: result.payload.chunkType,
      chunkName: result.payload.chunkName,
      similarity: result.score,
      code: result.payload.chunkText
    }));

    const tokensUsed = this.estimateTokens(JSON.stringify(formattedResults));

    return {
      toolName: 'search_codebase',
      success: true,
      data: {
        query: args.query,
        resultsCount: results.length,
        results: formattedResults
      },
      tokensUsed
    };
  }

  /**
   * Read a single file
   */
  private static async readFile(
    args: { filePath: string },
    context: ToolContext
  ): Promise<ToolResult> {
    console.log('args', args);
    const dbConn = context.db.getDb();

    const file = dbConn.prepare(`
      SELECT file_id, file_path, file_hash, language, size_bytes, line_count, indexed_at
      FROM files
      WHERE project_id = ? AND file_path = ?
    `).get(context.projectId, args.filePath) as any;

    console.log('file', file);

    if (!file) {
      throw new Error('File not found');
    }

    // Reconstruct file content from chunks (same logic as buildFileTreeFromFiles)
    const chunks = dbConn.prepare(`
      SELECT chunk_text, start_line, end_line
      FROM chunks
      WHERE file_id = ?
      ORDER BY start_line ASC
    `).all(file.file_id) as any[];

    // Reconstruct file content from chunks
    let fileContent = '';
    if (chunks.length > 0) {
      const lineMap = new Map<number, string>();

      for (const chunk of chunks) {
        const chunkLines = chunk.chunk_text.split('\n');
        for (let i = 0; i < chunkLines.length; i++) {
          const lineNumber = chunk.start_line + i;
          if (!lineMap.has(lineNumber)) {
            lineMap.set(lineNumber, chunkLines[i]);
          }
        }
      }

      const sortedLines = Array.from(lineMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([_, line]) => line);

      fileContent = sortedLines.join('\n');
    }

    const tokensUsed = this.estimateTokens(fileContent);

    return {
      toolName: 'read_file',
      success: true,
      data: {
        filePath: args.filePath,
        content: fileContent,
        language: file.language,
        lines: fileContent.split('\n').length,
        size: fileContent.length
      },
      tokensUsed
    };
  }

  /**
   * Read entire project structure and optionally file contents from database
   */
  private static async readProject(
    args: {
      includeContent?: boolean;
      maxDepth?: number;
      filePattern?: string;
    },
    context: ToolContext
  ): Promise<ToolResult> {
    const includeContent = args.includeContent || false;

    // Get project info
    const project = context.db.getProjectById(context.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const dbConn = context.db.getDb();

    // Get all files for this project from database
    const files = dbConn.prepare(`
      SELECT file_id, file_path, file_hash, language, size_bytes, line_count, indexed_at
      FROM files
      WHERE project_id = ?
      ORDER BY file_path ASC
    `).all(context.projectId) as any[];

    // Apply file pattern filter if provided
    let filteredFiles = files;
    if (args.filePattern) {
      filteredFiles = files.filter(f => this.matchesPattern(f.file_path, args.filePattern!));
    }

    // Build file tree structure from flat file list
    const fileTree = this.buildFileTreeFromFiles(filteredFiles, includeContent, dbConn);

    const tokensUsed = this.estimateTokens(JSON.stringify(fileTree));

    return {
      toolName: 'read_project',
      success: true,
      data: {
        projectId: context.projectId,
        projectName: project.project_name,
        projectPath: project.local_path,
        includeContent,
        ...fileTree
      },
      tokensUsed
    };
  }

  /**
   * Build file tree structure from database files
   */
  private static buildFileTreeFromFiles(
    files: any[],
    includeContent: boolean,
    dbConn: any
  ): any {
    const result: any = {
      files: [],
      directories: new Map<string, any>(),
      summary: {
        totalFiles: files.length,
        totalDirectories: 0,
        totalSize: 0
      }
    };

    // Process each file
    for (const file of files) {
      const fileInfo: any = {
        name: path.basename(file.file_path),
        path: file.file_path,
        size: file.size_bytes,
        language: file.language,
        lineCount: file.line_count,
        fileHash: file.file_hash,
        indexedAt: file.indexed_at
      };

      // Optionally include content (reconstruct from chunks)
      if (includeContent) {
        const chunks = dbConn.prepare(`
          SELECT chunk_text, start_line, end_line
          FROM chunks
          WHERE file_id = ?
          ORDER BY start_line ASC
        `).all(file.file_id) as any[];

        // Reconstruct file content from chunks
        let content = '';
        if (chunks.length > 0) {
          const lineMap = new Map<number, string>();

          for (const chunk of chunks) {
            const chunkLines = chunk.chunk_text.split('\n');
            for (let i = 0; i < chunkLines.length; i++) {
              const lineNumber = chunk.start_line + i;
              if (!lineMap.has(lineNumber)) {
                lineMap.set(lineNumber, chunkLines[i]);
              }
            }
          }

          const sortedLines = Array.from(lineMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([_, line]) => line);

          content = sortedLines.join('\n');
        }

        fileInfo.content = content;
      }

      result.files.push(fileInfo);
      result.summary.totalSize += file.size_bytes;

      // Track directories
      const dirPath = path.dirname(file.file_path);
      if (dirPath !== '.') {
        const parts = dirPath.split('/');
        let currentPath = '';
        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          if (!result.directories.has(currentPath)) {
            result.directories.set(currentPath, true);
            result.summary.totalDirectories++;
          }
        }
      }
    }

    // Convert directories map to array
    const directoryList = Array.from(result.directories.keys()).map((dir) => ({
      name: path.basename(dir as string),
      path: dir as string
    }));

    return {
      files: result.files,
      directories: directoryList,
      summary: result.summary
    };
  }

  /**
   * Simple pattern matching for file filtering
   */
  private static matchesPattern(filename: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  }

  /**
   * Search web using Exa.ai
   */
  private static async searchWeb(
    args: {
      query: string;
      numResults?: number;
      category?: string;
    },
    context: ToolContext
  ): Promise<ToolResult> {
    if (!context.exaApiKey) {
      throw new Error('Exa API key not configured');
    }

    const exa = new Exa(context.exaApiKey);
    const numResults = Math.min(args.numResults || 5, 10);

    const searchOptions: any = {
      numResults,
      type: 'neural',
      useAutoprompt: true
    };

    if (args.category) {
      searchOptions.category = args.category;
    }

    const results = await exa.searchAndContents(args.query, searchOptions);

    const formattedResults = results.results.map((r: any) => ({
      title: r.title,
      url: r.url,
      text: r.text?.substring(0, 1000), // Limit text length
      score: r.score,
      publishedDate: r.publishedDate
    }));

    const tokensUsed = this.estimateTokens(JSON.stringify(formattedResults));

    return {
      toolName: 'search_web',
      success: true,
      data: {
        query: args.query,
        resultsCount: formattedResults.length,
        results: formattedResults
      },
      tokensUsed
    };
  }

  /**
   * Get chat history
   */
  private static async getChatHistory(
    args: { limit?: number },
    context: ToolContext
  ): Promise<ToolResult> {
    if (!context.sessionId) {
      return {
        toolName: 'get_chat_history',
        success: false,
        error: 'No session ID provided'
      };
    }

    const limit = Math.min(args.limit || 5, 20);

    const messages = context.db.getDb().prepare(`
      SELECT role, content, created_at
      FROM chat_messages
      WHERE session_id = ? AND role = 'user'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(context.sessionId, limit) as Array<{
      role: string;
      content: string;
      created_at: number;
    }>;

    const formattedHistory = messages.reverse().map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at).toISOString()
    }));

    const tokensUsed = this.estimateTokens(JSON.stringify(formattedHistory));

    return {
      toolName: 'get_chat_history',
      success: true,
      data: {
        messageCount: formattedHistory.length,
        messages: formattedHistory
      },
      tokensUsed
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if user message indicates web search is needed
   */
  static shouldUseWebSearch(message: string): boolean {
    const webKeywords = [
      'http://', 'https://', 'www.',
      'documentation', 'docs',
      'website', 'web page', 'online',
      'tutorial', 'guide',
      'stackoverflow', 'stack overflow',
      'github', 'npm', 'pypi',
      'search for', 'look up',
      'latest version', 'current version',
      'best practice', 'how to'
    ];

    const lowerMessage = message.toLowerCase();
    return webKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Check if user message references chat history
   */
  static shouldLoadHistory(message: string): boolean {
    const historyKeywords = [
      'earlier', 'before', 'previous', 'previously',
      'we discussed', 'we talked', 'you said', 'you mentioned',
      'last time', 'remember', 'recall',
      'as i said', 'as mentioned'
    ];

    const lowerMessage = message.toLowerCase();
    return historyKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}
