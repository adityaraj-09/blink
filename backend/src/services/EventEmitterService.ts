import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseSchema } from '../database/schema';
import { StreamEvent, EventType, EventData } from '../types/streaming-events';

/**
 * Event Emitter Service for Progressive Edit Tasks
 * Emits events in real-time and stores them in database for replay
 */
export class ProgressiveEditEventEmitter extends EventEmitter {
  private sequenceCounters: Map<string, number> = new Map();

  constructor(private db: DatabaseSchema) {
    super();
    this.setMaxListeners(100); // Support many concurrent tasks
  }

  /**
   * Emit an event for a task
   */
  async emitTaskEvent(
    taskId: string,
    eventType: EventType,
    data: EventData,
    todoId?: string
  ): Promise<StreamEvent> {
    const eventId = uuidv4();
    const now = Date.now();

    // Get or initialize sequence counter for this task
    const sequenceNumber = this.getNextSequence(taskId);

    const event: StreamEvent = {
      eventId,
      taskId,
      todoId,
      eventType,
      timestamp: now,
      sequenceNumber,
      data,
    };

    // Store event in database
    await this.storeEvent(event);

    // Emit to listeners (SSE connections)
    this.emit(`task:${taskId}`, event);
    this.emit('all', event); // For global monitoring

    console.log(`[Event] ${taskId} | ${eventType} | ${data.message}`);

    return event;
  }

  /**
   * Store event in database for replay and debugging
   */
  private async storeEvent(event: StreamEvent): Promise<void> {
    try {
      this.db.getDb().prepare(`
        INSERT INTO ai_edit_events (
          event_id, task_id, todo_id, event_type, event_data, sequence_number, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        event.eventId,
        event.taskId,
        event.todoId || null,
        event.eventType,
        JSON.stringify(event.data),
        event.sequenceNumber,
        event.timestamp
      );
    } catch (error) {
      console.error('[EventEmitter] Failed to store event:', error);
      // Don't throw - event streaming should not break task execution
    }
  }

  /**
   * Get next sequence number for a task
   */
  private getNextSequence(taskId: string): number {
    const current = this.sequenceCounters.get(taskId) || 0;
    const next = current + 1;
    this.sequenceCounters.set(taskId, next);
    return next;
  }

  /**
   * Replay all events for a task (for reconnection)
   */
  async replayEvents(taskId: string): Promise<StreamEvent[]> {
    const rows = this.db.getDb().prepare(`
      SELECT * FROM ai_edit_events
      WHERE task_id = ?
      ORDER BY sequence_number ASC
    `).all(taskId) as any[];

    return rows.map(row => ({
      eventId: row.event_id,
      taskId: row.task_id,
      todoId: row.todo_id,
      eventType: row.event_type as EventType,
      timestamp: row.created_at,
      sequenceNumber: row.sequence_number,
      data: JSON.parse(row.event_data),
    }));
  }

  /**
   * Get events since a specific sequence number (for reconnection)
   */
  async getEventsSince(taskId: string, sinceSequence: number): Promise<StreamEvent[]> {
    const rows = this.db.getDb().prepare(`
      SELECT * FROM ai_edit_events
      WHERE task_id = ? AND sequence_number > ?
      ORDER BY sequence_number ASC
    `).all(taskId, sinceSequence) as any[];

    return rows.map(row => ({
      eventId: row.event_id,
      taskId: row.task_id,
      todoId: row.todo_id,
      eventType: row.event_type as EventType,
      timestamp: row.created_at,
      sequenceNumber: row.sequence_number,
      data: JSON.parse(row.event_data),
    }));
  }

  /**
   * Clean up sequence counter when task is done
   */
  cleanupTask(taskId: string): void {
    this.sequenceCounters.delete(taskId);
    this.removeAllListeners(`task:${taskId}`);
  }

  /**
   * Get active task IDs (tasks with listeners)
   */
  getActiveTasks(): string[] {
    const taskIds: string[] = [];
    for (const eventName of this.eventNames()) {
      if (typeof eventName === 'string' && eventName.startsWith('task:')) {
        taskIds.push(eventName.substring(5));
      }
    }
    return taskIds;
  }
}

/**
 * Global singleton instance
 */
let globalEventEmitter: ProgressiveEditEventEmitter | null = null;

export function getEventEmitter(db: DatabaseSchema): ProgressiveEditEventEmitter {
  if (!globalEventEmitter) {
    globalEventEmitter = new ProgressiveEditEventEmitter(db);
  }
  return globalEventEmitter;
}
