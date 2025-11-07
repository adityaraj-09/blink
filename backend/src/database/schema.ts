import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Multi-project database schema
 * Tracks projects, files, chunks, and their relationships
 */
export class DatabaseSchema {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('foreign_keys = ON');

    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Users table (synced from Clerk)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        full_name TEXT,
        image_url TEXT,
        created_at INTEGER NOT NULL,
        last_login_at INTEGER,
        metadata TEXT
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        project_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        description TEXT,
        repository_url TEXT,
        is_github_repo INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_indexed_at INTEGER,
        total_files INTEGER DEFAULT 0,
        total_chunks INTEGER DEFAULT 0,
        metadata TEXT,
        merkle_json TEXT,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    `);

    // Files table (per project)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        file_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        language TEXT,
        size_bytes INTEGER NOT NULL,
        line_count INTEGER,
        indexed_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
        UNIQUE(project_id, file_path)
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
      CREATE INDEX IF NOT EXISTS idx_files_hash ON files(file_hash);
    `);

    // Chunks table (per file)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        chunk_id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        chunk_hash TEXT NOT NULL,
        chunk_text TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        chunk_type TEXT NOT NULL,
        chunk_name TEXT,
        language TEXT NOT NULL,
        indexed_at INTEGER NOT NULL,
        qdrant_id TEXT,
        FOREIGN KEY (file_id) REFERENCES files(file_id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chunks_project_id ON chunks(project_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_hash ON chunks(chunk_hash);
      CREATE INDEX IF NOT EXISTS idx_chunks_qdrant_id ON chunks(qdrant_id);
    `);

    // Embedding cache metadata (hash -> Qdrant ID mapping)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embedding_cache (
        chunk_hash TEXT PRIMARY KEY,
        qdrant_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        dimension INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        last_accessed_at INTEGER NOT NULL
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_embedding_cache_qdrant ON embedding_cache(qdrant_id);
    `);

    // Chat history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        message_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        context_chunks TEXT,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
    `);

    // GitHub integrations (OAuth tokens)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS github_integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE,
        github_user_id TEXT NOT NULL,
        github_username TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at INTEGER,
        scopes TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_github_integrations_user ON github_integrations(user_id);
    `);

    // Git repositories (imported from GitHub)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS git_repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        github_repo_id TEXT NOT NULL,
        owner TEXT NOT NULL,
        repo_name TEXT NOT NULL,
        clone_url TEXT NOT NULL,
        default_branch TEXT NOT NULL,
        current_branch TEXT NOT NULL,
        local_path TEXT NOT NULL,
        last_synced_at INTEGER,
        last_commit_sha TEXT,
        sync_status TEXT NOT NULL DEFAULT 'idle',
        sync_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_git_repositories_project ON git_repositories(project_id);
      CREATE INDEX IF NOT EXISTS idx_git_repositories_user ON git_repositories(user_id);
    `);

    // File changes (pending edits before commit)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        change_type TEXT NOT NULL,
        original_content TEXT,
        new_content TEXT,
        original_hash TEXT,
        new_hash TEXT,
        staged INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (repo_id) REFERENCES git_repositories(id) ON DELETE CASCADE,
        UNIQUE(repo_id, file_path)
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_file_changes_repo ON file_changes(repo_id);
      CREATE INDEX IF NOT EXISTS idx_file_changes_staged ON file_changes(staged);
    `);

    // Commit history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS commit_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_id INTEGER NOT NULL,
        commit_sha TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_email TEXT NOT NULL,
        message TEXT NOT NULL,
        committed_at INTEGER NOT NULL,
        pushed INTEGER DEFAULT 0,
        pushed_at INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (repo_id) REFERENCES git_repositories(id) ON DELETE CASCADE
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_commit_history_repo ON commit_history(repo_id);
      CREATE INDEX IF NOT EXISTS idx_commit_history_pushed ON commit_history(pushed);
    `);

    // AI Edit Jobs (main job record)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_edit_jobs (
        job_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        query TEXT NOT NULL,
        status TEXT NOT NULL,
        plan_explanation TEXT,
        final_summary TEXT,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        FOREIGN KEY (project_id) REFERENCES projects(project_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_edit_jobs_project ON ai_edit_jobs(project_id);
      CREATE INDEX IF NOT EXISTS idx_ai_edit_jobs_user ON ai_edit_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_edit_jobs_status ON ai_edit_jobs(status);
    `);

    // AI Edit Steps (individual TODO steps)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_edit_steps (
        step_id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        todo_title TEXT NOT NULL,
        todo_description TEXT,
        file_path TEXT,
        status TEXT NOT NULL,
        edit_json TEXT,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        FOREIGN KEY (job_id) REFERENCES ai_edit_jobs(job_id) ON DELETE CASCADE
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_edit_steps_job ON ai_edit_steps(job_id);
      CREATE INDEX IF NOT EXISTS idx_ai_edit_steps_status ON ai_edit_steps(status);
      CREATE INDEX IF NOT EXISTS idx_ai_edit_steps_number ON ai_edit_steps(job_id, step_number);
    `);

    // User preferences
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        theme TEXT DEFAULT 'dark',
        language TEXT DEFAULT 'en-US',
        date_format TEXT DEFAULT 'MM/DD/YYYY',
        email_notifications INTEGER DEFAULT 1,
        push_notifications INTEGER DEFAULT 1,
        project_updates INTEGER DEFAULT 1,
        security_alerts INTEGER DEFAULT 1,
        weekly_digest INTEGER DEFAULT 0,
        profile_visibility TEXT DEFAULT 'public',
        show_email INTEGER DEFAULT 0,
        show_activity INTEGER DEFAULT 1,
        bio TEXT,
        location TEXT,
        website TEXT,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) STRICT;
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
    `);

    // Metadata
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;
    `);

    // Migration: Add merkle_json column to projects table if it doesn't exist
    try {
      // Check if merkle_json column exists
      const columns = this.db.pragma(`table_info(projects)`);
      const hasMerkleJson = columns.some((col: any) => col.name === 'merkle_json');

      if (!hasMerkleJson) {
        console.log('Running migration: Adding merkle_json column to projects table');
        this.db.exec(`ALTER TABLE projects ADD COLUMN merkle_json TEXT;`);
        console.log('✓ Migration completed');
      }
    } catch (err) {
      console.error('Migration error:', err);
    }

    // Migration: Add title column to chat_sessions table if it doesn't exist
    try {
      const sessionColumns = this.db.pragma(`table_info(chat_sessions)`);
      const hasTitle = sessionColumns.some((col: any) => col.name === 'title');

      if (!hasTitle) {
        console.log('Running migration: Adding title column to chat_sessions table');
        this.db.exec(`ALTER TABLE chat_sessions ADD COLUMN title TEXT;`);
        console.log('✓ Migration completed');
      }
    } catch (err) {
      console.error('Migration error:', err);
    }

    // Set schema version
    this.setMetadata('schema_version', '5.3.0');
  }

  getDb(): Database.Database {
    return this.db;
  }

  /**
   * Sync user from Clerk to local database
   */
  syncUser(userInfo: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    imageUrl: string;
    createdAt: number;
    metadata?: any;
  }): void {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO users (
        user_id, email, first_name, last_name, full_name,
        image_url, created_at, last_login_at, metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        full_name = excluded.full_name,
        image_url = excluded.image_url,
        last_login_at = excluded.last_login_at,
        metadata = excluded.metadata
    `);

    stmt.run(
      userInfo.id,
      userInfo.email,
      userInfo.firstName,
      userInfo.lastName,
      userInfo.fullName,
      userInfo.imageUrl,
      userInfo.createdAt,
      now,
      userInfo.metadata ? JSON.stringify(userInfo.metadata) : null
    );
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE user_id = ?');
    return stmt.get(userId) || null;
  }

  /**
   * Get project by ID
   */
  getProjectById(projectId: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE project_id = ?');
    const row = stmt.get(projectId);
    return row || null;
  }

  /**
   * Get project owner ID
   */
  getProjectOwnerId(projectId: string): string | null {
    const stmt = this.db.prepare('SELECT user_id FROM projects WHERE project_id = ?');
    const row = stmt.get(projectId) as { user_id: string } | undefined;
    return row ? row.user_id : null;
  }

  /**
   * Check if user owns project
   */
  userOwnsProject(userId: string, projectId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM projects WHERE project_id = ? AND user_id = ?
    `);
    return !!stmt.get(projectId, userId);
  }

  /**
   * Check if user owns chat session
   */
  userOwnsSession(userId: string, sessionId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM chat_sessions WHERE session_id = ? AND user_id = ?
    `);
    return !!stmt.get(sessionId, userId);
  }

  setMetadata(key: string, value: string): void {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO metadata (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(key, value, now);
  }

  getMetadata(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM metadata WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  transaction<T>(fn: () => T): T {
    const txn = this.db.transaction(fn);
    return txn();
  }

  close(): void {
    this.db.close();
  }
}
