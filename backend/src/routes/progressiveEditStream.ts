import { Router, Request, Response } from 'express';
import { ProgressiveEditEventEmitter } from '../services/EventEmitterService';
import { StreamEvent } from '../types/streaming-events';

/**
 * SSE Route for streaming progressive edit task events
 */
export function createProgressiveEditStreamRoutes(
  eventEmitter: ProgressiveEditEventEmitter
): Router {
  const router = Router();

  /**
   * SSE endpoint: Stream real-time events for a task
   * GET /api/progressive-edit/stream/:taskId
   */
  router.get('/stream/:taskId', async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const { lastEventId } = req.query;

    console.log(`[SSE] Client connected for task ${taskId}`);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Enable CORS for SSE
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Send initial connection event
    sendSSE(res, {
      eventId: 'connection',
      taskId,
      eventType: 'task.created' as any,
      timestamp: Date.now(),
      sequenceNumber: 0,
      data: { message: 'Connected to event stream' } as any,
    });

    // Replay missed events if client reconnected
    if (lastEventId) {
      try {
        const sinceSequence = parseInt(lastEventId as string);
        const missedEvents = await eventEmitter.getEventsSince(taskId, sinceSequence);

        console.log(`[SSE] Replaying ${missedEvents.length} missed events`);
        for (const event of missedEvents) {
          sendSSE(res, event);
        }
      } catch (error) {
        console.error('[SSE] Failed to replay events:', error);
      }
    }

    // Listen for new events
    const eventListener = (event: StreamEvent) => {
      sendSSE(res, event);
    };

    eventEmitter.on(`task:${taskId}`, eventListener);

    // Handle client disconnect
    req.on('close', () => {
      console.log(`[SSE] Client disconnected from task ${taskId}`);
      eventEmitter.off(`task:${taskId}`, eventListener);
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000); // Every 30 seconds

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  /**
   * Get all events for a task (for debugging or initial load)
   * GET /api/progressive-edit/events/:taskId
   */
  router.get('/events/:taskId', async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const events = await eventEmitter.replayEvents(taskId);

      res.json({
        success: true,
        taskId,
        eventsCount: events.length,
        events,
      });
    } catch (error: any) {
      console.error('[Events] Failed to get events:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get active streaming tasks (for monitoring)
   * GET /api/progressive-edit/active-streams
   */
  router.get('/active-streams', (req: Request, res: Response) => {
    const activeTasks = eventEmitter.getActiveTasks();
    res.json({
      success: true,
      activeTasksCount: activeTasks.length,
      activeTasks,
    });
  });

  return router;
}

/**
 * Helper function to send SSE formatted message
 */
function sendSSE(res: Response, event: StreamEvent): void {
  // SSE format:
  // id: <sequence_number>
  // event: <event_type>
  // data: <json_payload>
  // \n\n

  const sseMessage = [
    `id: ${event.sequenceNumber}`,
    `event: ${event.eventType}`,
    `data: ${JSON.stringify(event)}`,
    '',
    '',
  ].join('\n');

  res.write(sseMessage);
}
