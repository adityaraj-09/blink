/**
 * useProgressiveEdit Hook
 * Manages progressive AI edits with real-time progress tracking
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  initiateProgressiveEdit,
  getTaskStatus,
  cancelTask,
  ProgressiveEditRequest,
  TaskStatusResponse,
  TodoItem,
} from '../api/progressiveEdit';

export interface UseProgressiveEditOptions {
  projectId: string;
  pollInterval?: number; // milliseconds
  onTaskComplete?: (taskId: string, result: TaskStatusResponse) => void;
}

export interface UseProgressiveEditReturn {
  startTask: (message: string, sessionId?: string) => Promise<string | null>;
  cancelCurrentTask: () => Promise<void>;
  taskStatus: TaskStatusResponse | null;
  isRunning: boolean;
  error: Error | null;
  currentTodo: TodoItem | null;
}

export function useProgressiveEdit(
  options: UseProgressiveEditOptions
): UseProgressiveEditReturn {
  const { projectId, pollInterval = 2000, onTaskComplete } = options;

  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Start a new progressive edit task
   */
  const startTask = useCallback(
    async (message: string, sessionId?: string): Promise<string | null> => {
      setError(null);
      setTaskStatus(null);

      try {
        const request: ProgressiveEditRequest = {
          projectId,
          message,
          sessionId,
        };

        const response = await initiateProgressiveEdit(request);
        const taskId = response.taskId;

        setCurrentTaskId(taskId);
        setIsRunning(true);

        // Start polling for status
        startPolling(taskId);

        return taskId;
      } catch (err) {
        const error = err as Error;
        console.error('Failed to start task:', error);
        setError(error);
        setIsRunning(false);
        return null;
      }
    },
    [projectId]
  );

  /**
   * Start polling for task status
   */
  const startPolling = useCallback((taskId: string) => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll immediately
    pollTaskStatus(taskId);

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      pollTaskStatus(taskId);
    }, pollInterval);
  }, [pollInterval]);

  /**
   * Poll for task status
   */
  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const status = await getTaskStatus(taskId);

      if (!isMountedRef.current) return;

      setTaskStatus(status);

      // Check if task is complete
      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        setIsRunning(false);

        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        // Callback
        if (status.status === 'completed' && onTaskComplete) {
          onTaskComplete(taskId, status);
        }
      }
    } catch (err) {
      const error = err as Error;
      console.error('Failed to poll task status:', error);
      setError(error);
      setIsRunning(false);

      // Stop polling on error
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [onTaskComplete]);

  /**
   * Cancel current task
   */
  const cancelCurrentTask = useCallback(async () => {
    if (!currentTaskId) return;

    try {
      await cancelTask(currentTaskId);
      setIsRunning(false);
      setCurrentTaskId(null);

      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } catch (err) {
      const error = err as Error;
      console.error('Failed to cancel task:', error);
      setError(error);
    }
  }, [currentTaskId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Get current TODO
  const currentTodo =
    taskStatus?.todos.find((todo) => todo.status === 'processing') ||
    taskStatus?.todos.find((todo) => todo.status === 'pending') ||
    null;

  return {
    startTask,
    cancelCurrentTask,
    taskStatus,
    isRunning,
    error,
    currentTodo,
  };
}
