/**
 * useAIEdit Hook
 * Manages AI-powered code editing
 */

import { useState, useCallback } from 'react';
import {
  getAIEdits,
  validateEdit,
  previewEdit,
  applyEdit,
  applyBatchEdits,
  AIEditRequest,
  AIEditResponse,
  CodeEdit,
  EditValidation,
  DiffPreview,
  AppliedEdit,
} from '../api/aiEdit';

export interface UseAIEditOptions {
  projectId: string;
}

export interface UseAIEditReturn {
  suggestEdits: (
    message: string,
    fileContext?: AIEditRequest['fileContext']
  ) => Promise<AIEditResponse | null>;
  validateSingleEdit: (edit: CodeEdit) => Promise<EditValidation | null>;
  previewSingleEdit: (edit: CodeEdit) => Promise<DiffPreview | null>;
  applySingleEdit: (edit: CodeEdit) => Promise<AppliedEdit | null>;
  applyMultipleEdits: (
    edits: CodeEdit[],
    commitMessage?: string
  ) => Promise<{
    appliedEdits: AppliedEdit[];
    failedEdits: Array<{ edit: CodeEdit; error: string }>;
  } | null>;
  isLoading: boolean;
  error: Error | null;
  lastResponse: AIEditResponse | null;
}

export function useAIEdit(options: UseAIEditOptions): UseAIEditReturn {
  const { projectId } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResponse, setLastResponse] = useState<AIEditResponse | null>(null);

  /**
   * Suggest code edits from AI
   */
  const suggestEdits = useCallback(
    async (
      message: string,
      fileContext?: AIEditRequest['fileContext']
    ): Promise<AIEditResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const request: AIEditRequest = {
          projectId,
          message,
          fileContext,
        };

        const response = await getAIEdits(request);
        setLastResponse(response);
        return response;
      } catch (err) {
        const error = err as Error;
        console.error('AI edit suggestion failed:', error);
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  /**
   * Validate a single edit
   */
  const validateSingleEdit = useCallback(
    async (edit: CodeEdit): Promise<EditValidation | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await validateEdit(projectId, edit);
        return response.validation;
      } catch (err) {
        const error = err as Error;
        console.error('Edit validation failed:', error);
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  /**
   * Preview a single edit
   */
  const previewSingleEdit = useCallback(
    async (edit: CodeEdit): Promise<DiffPreview | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await previewEdit(projectId, edit);
        return response.preview;
      } catch (err) {
        const error = err as Error;
        console.error('Edit preview failed:', error);
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  /**
   * Apply a single edit
   */
  const applySingleEdit = useCallback(
    async (edit: CodeEdit): Promise<AppliedEdit | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await applyEdit(projectId, edit);
        return response.result;
      } catch (err) {
        const error = err as Error;
        console.error('Edit application failed:', error);
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  /**
   * Apply multiple edits in batch
   */
  const applyMultipleEdits = useCallback(
    async (
      edits: CodeEdit[],
      commitMessage?: string
    ): Promise<{
      appliedEdits: AppliedEdit[];
      failedEdits: Array<{ edit: CodeEdit; error: string }>;
    } | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await applyBatchEdits(projectId, edits, commitMessage);
        return {
          appliedEdits: response.appliedEdits,
          failedEdits: response.failedEdits,
        };
      } catch (err) {
        const error = err as Error;
        console.error('Batch edit application failed:', error);
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  return {
    suggestEdits,
    validateSingleEdit,
    previewSingleEdit,
    applySingleEdit,
    applyMultipleEdits,
    isLoading,
    error,
    lastResponse,
  };
}
