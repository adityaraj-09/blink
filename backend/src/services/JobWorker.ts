import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseSchema } from '../database/schema';
import { GeminiEmbeddingService } from './gemini-embedding-service';
import { ChromaService } from './chroma-service';
import { AICodeEditService } from './AICodeEditService';
import { JobQueue, JobStatus, StepStatus } from './JobQueue';
import { CodeEdit } from '../types/code-edit';

/**
 * Job Worker - processes jobs from the queue
 * Runs in the same process as the server
 */
export class JobWorker {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private queue: JobQueue;

  constructor(
    private db: DatabaseSchema,
    private chroma: ChromaService,
    private embeddings: GeminiEmbeddingService,
    private aiEditService: AICodeEditService,
    config: {
      apiKey: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-2.0-flash-exp';
    this.maxTokens = config.maxTokens || 8192;
    this.temperature = config.temperature || 0.1;
    this.queue = JobQueue.getInstance();

    // Listen for job:start events
    this.queue.on('job:start', (jobId: string) => {
      this.processJob(jobId).catch(error => {
        console.error(`[Worker] Job ${jobId} failed:`, error);
        this.queue.emitJobFailed(jobId, error.message);
      });
    });

    console.log('✓ Job Worker initialized and listening');
  }

  /**
   * Process a job
   */
  private async processJob(jobId: string): Promise<void> {
    console.log(`[Worker] Starting job ${jobId}`);

    try {
      // Get job from database
      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Update job status to in_progress
      await this.updateJobStatus(jobId, 'in_progress', Date.now());

      // Phase 1: Generate TODO plan
      console.log(`[Worker] Job ${jobId}: Generating plan...`);
      this.queue.emitJobPlanning(jobId, 'Analyzing codebase and generating plan...');

      const plan = await this.generatePlan(job.project_id, job.query);

      // Save plan to database
      await this.savePlan(jobId, plan.explanation, plan.steps);

      this.queue.emitJobPlanComplete(jobId, plan.explanation, plan.steps.length);

      // Phase 2: Process each step
      console.log(`[Worker] Job ${jobId}: Processing ${plan.steps.length} steps...`);

      const completedEdits: Array<{ stepNumber: number; edit: CodeEdit }> = [];

      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];

        try {
          // Emit step:start
          this.queue.emitStepStart(jobId, step.stepNumber, step.title);

          // Update step status
          await this.updateStepStatus(step.stepId, 'in_progress', Date.now());

          // Generate edit for this step
          const edit = await this.generateEditForStep(
            job.project_id,
            job.query,
            plan.explanation,
            step,
            completedEdits
          );

          // Save edit
          await this.saveStepEdit(step.stepId, edit);

          // Update step status
          await this.updateStepStatus(step.stepId, 'complete', undefined, Date.now());

          completedEdits.push({ stepNumber: step.stepNumber, edit });

          // Emit step:complete
          this.queue.emitStepComplete(jobId, step.stepNumber, edit);

          // Emit job progress
          this.queue.emitJobProgress(jobId, i + 1, plan.steps.length);

        } catch (error: any) {
          console.error(`[Worker] Step ${step.stepNumber} failed:`, error);

          // Mark step as failed
          await this.updateStepStatus(step.stepId, 'failed', undefined, undefined, error.message);

          // Emit step:failed
          this.queue.emitStepFailed(jobId, step.stepNumber, error.message);

          // Continue with next step
        }
      }

      // Phase 3: Generate final summary
      console.log(`[Worker] Job ${jobId}: Generating summary...`);

      const summary = this.generateSummary(completedEdits);

      // Update job as complete
      await this.updateJobStatus(jobId, 'complete', undefined, Date.now(), summary);

      // Emit job:complete
      this.queue.emitJobComplete(jobId, summary);

      console.log(`[Worker] Job ${jobId} completed successfully`);

    } catch (error: any) {
      console.error(`[Worker] Job ${jobId} failed:`, error);

      await this.updateJobStatus(jobId, 'failed', undefined, undefined, undefined, error.message);

      this.queue.emitJobFailed(jobId, error.message);
    }
  }

  /**
   * Generate TODO plan
   */
  private async generatePlan(
    projectId: string,
    query: string
  ): Promise<{
    explanation: string;
    steps: Array<{
      stepId: string;
      stepNumber: number;
      title: string;
      description: string;
      filePath: string;
    }>;
  }> {
    // Get codebase context
    const queryEmbedding = await this.embeddings.embed(query);
    const searchResults = await this.chroma.search(projectId, queryEmbedding, 15, 0.6);

    const context = searchResults
      .map((r, i) => {
        const { filePath, startLine, endLine, chunkText } = r.payload;
        return `[${i + 1}] ${filePath}:${startLine}-${endLine}\n\`\`\`\n${chunkText}\n\`\`\``;
      })
      .join('\n\n');

    // Build planning prompt
    const prompt = this.buildPlanningPrompt(query, context);

    // Call LLM
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse plan
    return this.parsePlan(response);
  }

  /**
   * Build planning prompt
   */
  private buildPlanningPrompt(query: string, context: string): string {
    return `You are an expert code architect planning code changes.

User Request: "${query}"

Codebase Context:
${context}

IMPORTANT: Do NOT write code yet. Only create a detailed TODO list.

Respond in this XML format:

<plan>
<explanation>
Brief overview of your plan (2-3 sentences).
</explanation>

<todo order="1" file="path/to/file.ts">
<title>Short title</title>
<description>Detailed description of what needs to be done.</description>
</todo>

<todo order="2" file="path/to/another.ts">
<title>Another task</title>
<description>What this does...</description>
</todo>

<!-- More TODOs -->
</plan>

RULES:
1. Order TODOs logically (types first, services, routes, config)
2. Each TODO is one file modification
3. Include exact file path
4. Typical count: 5-15 TODOs

Start planning:`;
  }

  /**
   * Parse plan
   */
  private parsePlan(response: string): {
    explanation: string;
    steps: Array<{
      stepId: string;
      stepNumber: number;
      title: string;
      description: string;
      filePath: string;
    }>;
  } {
    const explanationMatch = response.match(/<explanation>([\s\S]*?)<\/explanation>/);
    const explanation = explanationMatch ? explanationMatch[1].trim() : 'AI-generated plan';

    const todoRegex = /<todo\s+order="(\d+)"\s+file="([^"]+)">([\s\S]*?)<\/todo>/g;
    const steps: any[] = [];
    let match;

    while ((match = todoRegex.exec(response)) !== null) {
      const order = parseInt(match[1]);
      const file = match[2];
      const content = match[3];

      const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = content.match(/<description>([\s\S]*?)<\/description>/);

      steps.push({
        stepId: uuidv4(),
        stepNumber: order,
        title: titleMatch ? titleMatch[1].trim() : `Task ${order}`,
        description: descMatch ? descMatch[1].trim() : '',
        filePath: file
      });
    }

    steps.sort((a, b) => a.stepNumber - b.stepNumber);

    return { explanation, steps };
  }

  /**
   * Generate edit for a step
   */
  private async generateEditForStep(
    projectId: string,
    query: string,
    planExplanation: string,
    currentStep: any,
    completedEdits: Array<{ stepNumber: number; edit: CodeEdit }>
  ): Promise<CodeEdit> {
    // Get context
    const queryEmbedding = await this.embeddings.embed(
      `${currentStep.title} ${currentStep.description}`
    );
    const searchResults = await this.chroma.search(projectId, queryEmbedding, 10, 0.6);

    const vectorContext = searchResults
      .map((r, i) => {
        const { filePath, startLine, endLine, chunkText } = r.payload;
        return `[${i + 1}] ${filePath}:${startLine}-${endLine}\n\`\`\`\n${chunkText}\n\`\`\``;
      })
      .join('\n\n');

    // Build completed context
    const completedContext = completedEdits
      .map(({ stepNumber, edit }) => {
        return `✓ Step ${stepNumber}: ${edit.file} (${edit.action})
${edit.newCode ? `\`\`\`\n${edit.newCode.substring(0, 500)}...\n\`\`\`` : ''}`;
      })
      .join('\n\n');

    // Build execution prompt
    const prompt = `You are implementing a specific TODO from a larger plan.

Original Request: "${query}"

Plan: ${planExplanation}

${completedContext ? `Completed Steps:\n${completedContext}\n` : ''}

Current Step:
#${currentStep.stepNumber}: ${currentStep.title}
Description: ${currentStep.description}
File: ${currentStep.filePath}

Codebase Context:
${vectorContext}

Respond with ONE <edit> tag:

<edit file="${currentStep.filePath}" action="create">
[Complete file content]
</edit>

OR

<edit file="${currentStep.filePath}" start="10" end="20" action="replace">
[Old code]
---
[New code]
</edit>

Implement this step now:`;

    // Call LLM
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse edit
    const { edits } = this.aiEditService.parseEdits(response);

    if (edits.length === 0) {
      throw new Error('No edit generated');
    }

    return edits[0];
  }

  /**
   * Generate summary
   */
  private generateSummary(completedEdits: Array<{ stepNumber: number; edit: CodeEdit }>): any {
    const edits = completedEdits.map(c => c.edit);

    const creates = edits.filter(e => e.action === 'create').length;
    const replaces = edits.filter(e => e.action === 'replace').length;
    const inserts = edits.filter(e => e.action === 'insert').length;
    const deletes = edits.filter(e => e.action === 'delete').length;
    const affectedFiles = [...new Set(edits.map(e => e.file))];

    return {
      totalEdits: edits.length,
      creates,
      replaces,
      inserts,
      deletes,
      affectedFiles,
      recommendation: 'Review all changes carefully before applying.'
    };
  }

  // Database operations

  private async getJob(jobId: string): Promise<any> {
    return this.db.getDb().prepare('SELECT * FROM ai_edit_jobs WHERE job_id = ?').get(jobId);
  }

  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    startedAt?: number,
    completedAt?: number,
    summary?: any,
    errorMessage?: string
  ): Promise<void> {
    const now = Date.now();
    const summaryJson = summary ? JSON.stringify(summary) : null;

    this.db.getDb().prepare(`
      UPDATE ai_edit_jobs
      SET status = ?, updated_at = ?, started_at = COALESCE(?, started_at),
          completed_at = ?, final_summary = COALESCE(?, final_summary), error_message = ?
      WHERE job_id = ?
    `).run(status, now, startedAt, completedAt, summaryJson, errorMessage, jobId);
  }

  private async savePlan(jobId: string, explanation: string, steps: any[]): Promise<void> {
    const now = Date.now();

    // Update job with explanation
    this.db.getDb().prepare(`
      UPDATE ai_edit_jobs SET plan_explanation = ?, updated_at = ? WHERE job_id = ?
    `).run(explanation, now, jobId);

    // Insert steps
    for (const step of steps) {
      this.db.getDb().prepare(`
        INSERT INTO ai_edit_steps (
          step_id, job_id, step_number, todo_title, todo_description, file_path, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(step.stepId, jobId, step.stepNumber, step.title, step.description, step.filePath, now, now);
    }
  }

  private async updateStepStatus(
    stepId: string,
    status: StepStatus,
    startedAt?: number,
    completedAt?: number,
    errorMessage?: string
  ): Promise<void> {
    const now = Date.now();

    this.db.getDb().prepare(`
      UPDATE ai_edit_steps
      SET status = ?, updated_at = ?, started_at = COALESCE(?, started_at),
          completed_at = ?, error_message = ?
      WHERE step_id = ?
    `).run(status, now, startedAt, completedAt, errorMessage, stepId);
  }

  private async saveStepEdit(stepId: string, edit: CodeEdit): Promise<void> {
    this.db.getDb().prepare(`
      UPDATE ai_edit_steps SET edit_json = ? WHERE step_id = ?
    `).run(JSON.stringify(edit), stepId);
  }
}
