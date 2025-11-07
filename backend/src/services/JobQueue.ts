import { EventEmitter } from 'events';

/**
 * Job status types
 */
export type JobStatus = 'pending' | 'in_progress' | 'complete' | 'failed';
export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'failed' | 'skipped';

/**
 * Job in the queue
 */
export interface QueuedJob {
  jobId: string;
  projectId: string;
  userId: string;
  query: string;
  createdAt: number;
}

/**
 * Job events
 */
export interface JobEvents {
  'job:added': (jobId: string) => void;
  'job:start': (jobId: string) => void;
  'job:planning': (jobId: string, message: string) => void;
  'job:plan:complete': (jobId: string, explanation: string, totalSteps: number) => void;
  'job:progress': (jobId: string, completed: number, total: number) => void;
  'job:complete': (jobId: string, summary: any) => void;
  'job:failed': (jobId: string, error: string) => void;
  'step:start': (jobId: string, stepNumber: number, title: string) => void;
  'step:complete': (jobId: string, stepNumber: number, edit: any) => void;
  'step:failed': (jobId: string, stepNumber: number, error: string) => void;
}

/**
 * In-memory job queue with event emitter
 * Singleton pattern to ensure single queue instance
 */
export class JobQueue extends EventEmitter {
  private static instance: JobQueue;
  private queue: QueuedJob[] = [];
  private processing: boolean = false;
  private currentJobId: string | null = null;

  private constructor() {
    super();
    this.setMaxListeners(100); // Allow many SSE connections
  }

  /**
   * Get singleton instance
   */
  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  /**
   * Add job to queue
   */
  addJob(job: QueuedJob): void {
    this.queue.push(job);
    console.log(`[Queue] Added job ${job.jobId} to queue (${this.queue.length} jobs)`);
    this.emit('job:added', job.jobId);

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }
  }

  /**
   * Start processing queue
   */
  private startProcessing(): void {
    if (this.processing) {
      return; // Already processing
    }

    this.processing = true;
    this.processNext();
  }

  /**
   * Process next job in queue
   */
  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      this.currentJobId = null;
      console.log('[Queue] Queue empty, stopping processing');
      return;
    }

    const job = this.queue.shift();
    if (!job) {
      this.processing = false;
      return;
    }

    this.currentJobId = job.jobId;
    console.log(`[Queue] Processing job ${job.jobId}`);

    // Emit job:start event - the worker will handle the actual processing
    this.emit('job:start', job.jobId);

    // The worker will call processNext() when done
  }

  /**
   * Mark current job as complete and process next
   */
  jobComplete(jobId: string): void {
    if (this.currentJobId === jobId) {
      console.log(`[Queue] Job ${jobId} completed`);
      this.currentJobId = null;
      // Process next job after a short delay
      setTimeout(() => this.processNext(), 100);
    }
  }

  /**
   * Mark current job as failed and process next
   */
  jobFailed(jobId: string, error: string): void {
    if (this.currentJobId === jobId) {
      console.log(`[Queue] Job ${jobId} failed: ${error}`);
      this.currentJobId = null;
      // Process next job after a short delay
      setTimeout(() => this.processNext(), 100);
    }
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queueLength: number;
    processing: boolean;
    currentJobId: string | null;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentJobId: this.currentJobId
    };
  }

  /**
   * Typed event emitters
   */
  emitJobStart(jobId: string): void {
    this.emit('job:start', jobId);
  }

  emitJobPlanning(jobId: string, message: string): void {
    this.emit('job:planning', jobId, message);
  }

  emitJobPlanComplete(jobId: string, explanation: string, totalSteps: number): void {
    this.emit('job:plan:complete', jobId, explanation, totalSteps);
  }

  emitJobProgress(jobId: string, completed: number, total: number): void {
    this.emit('job:progress', jobId, completed, total);
  }

  emitJobComplete(jobId: string, summary: any): void {
    this.emit('job:complete', jobId, summary);
    this.jobComplete(jobId);
  }

  emitJobFailed(jobId: string, error: string): void {
    this.emit('job:failed', jobId, error);
    this.jobFailed(jobId, error);
  }

  emitStepStart(jobId: string, stepNumber: number, title: string): void {
    this.emit('step:start', jobId, stepNumber, title);
  }

  emitStepComplete(jobId: string, stepNumber: number, edit: any): void {
    this.emit('step:complete', jobId, stepNumber, edit);
  }

  emitStepFailed(jobId: string, stepNumber: number, error: string): void {
    this.emit('step:failed', jobId, stepNumber, error);
  }
}
