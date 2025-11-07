/**
 * API - Main Export
 */

export { APIClient, getAPIClient, APIError } from './client';
export type { RequestOptions } from './client';

export { ingestChunks, deleteFile } from './ingest';
export type {
  ChunkInput,
  FileChunkInput,
  IngestRequest,
  IngestResponse,
  DeleteFileRequest,
} from './ingest';

export { sendChatMessage, getChatHistory, deleteChatSession } from './chat';
export type {
  ChatRequest,
  ChatResponse,
  ChatHistoryResponse,
  ContextChunk,
} from './chat';

export {
  getAIEdits,
  validateEdit,
  previewEdit,
  applyEdit,
  applyBatchEdits,
  parseEdits,
} from './aiEdit';
export type {
  AIEditRequest,
  AIEditResponse,
  CodeEdit,
  EditValidation,
  AppliedEdit,
  DiffLine,
  DiffPreview,
} from './aiEdit';

export {
  initiateProgressiveEdit,
  getTaskStatus,
  cancelTask,
  listTasks,
} from './progressiveEdit';
export type {
  ProgressiveEditRequest,
  ProgressiveEditInitResponse,
  TaskStatusResponse,
  TodoItem,
  TaskProgress,
  TodoStatus,
} from './progressiveEdit';

export {
  initiateGitHubAuth,
  completeGitHubAuth,
  getGitHubAuthStatus,
  disconnectGitHub,
  listGitHubRepositories,
  importGitHubRepository,
  getImportStatus,
  syncRepository,
  listBranches,
  manageBranch,
} from './github';
export type {
  GitHubAuthInitResponse,
  GitHubAuthStatusResponse,
  GitHubRepository,
  ImportRepositoryRequest,
  ImportRepositoryResponse,
  ImportStatusResponse,
  SyncRepositoryResponse,
  BranchesResponse,
  BranchActionRequest,
} from './github';
