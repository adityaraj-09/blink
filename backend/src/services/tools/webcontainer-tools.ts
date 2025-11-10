/**
 * WebContainer Tools for AI Chat
 * Tools for executing commands, installing packages, and managing the in-browser runtime
 */

export interface WebContainerToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Tool definitions for WebContainer operations
 */
export const webContainerTools: WebContainerToolDefinition[] = [
  {
    name: 'run_terminal_command',
    description:
      'Execute a terminal command in the WebContainer. Use this for running builds, tests, linting, or any shell command. Returns command output and exit code.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description:
            'The command to execute (e.g., "npm run build", "ls -la", "cat package.json")',
        },
        cwd: {
          type: 'string',
          description:
            'Working directory for command execution (optional, defaults to project root)',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'install_npm_packages',
    description:
      'Install npm packages in the WebContainer. Use this when the user wants to add dependencies or when you detect missing packages.',
    parameters: {
      type: 'object',
      properties: {
        packages: {
          type: 'array',
          items: {
            type: 'string',
          },
          description:
            'Array of package names to install (e.g., ["react", "typescript"]). Leave empty to run "npm install" for all dependencies.',
        },
        dev: {
          type: 'boolean',
          description:
            'Install as dev dependencies (--save-dev flag). Default: false',
        },
      },
      required: [],
    },
  },
  {
    name: 'start_dev_server',
    description:
      'Start the development server in WebContainer. Use this when the user wants to preview their application. Returns server URL when ready.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description:
            'Command to start the dev server (e.g., "npm run dev", "npm start"). Defaults to "npm run dev"',
        },
      },
      required: [],
    },
  },
  {
    name: 'read_terminal_output',
    description:
      'Read the output from a running terminal command or server. Use this to check build logs, error messages, or server status.',
    parameters: {
      type: 'object',
      properties: {
        processId: {
          type: 'string',
          description:
            'ID of the process to read output from (returned by previous commands)',
        },
      },
      required: ['processId'],
    },
  },
];

/**
 * Response format for WebContainer tool execution
 */
export interface WebContainerToolResult {
  success: boolean;
  data?: any;
  error?: string;
  tokensUsed?: number;
}

/**
 * Format tool definitions for AI model consumption
 */
export function formatWebContainerToolsForAI(): string {
  return webContainerTools
    .map(
      (tool) =>
        `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(
          tool.parameters,
          null,
          2
        )}`
    )
    .join('\n\n');
}
