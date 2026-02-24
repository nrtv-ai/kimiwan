/**
 * Storage interface and implementations for A2A-Coop
 * 
 * Provides pluggable persistence layer supporting:
 * - MemoryStorage: In-memory (default, ephemeral)
 * - RedisStorage: Redis-backed (persistent, distributed)
 */

import { Agent, Task, Context, Message } from './types';

/**
 * Storage interface for all persistence operations
 */
export interface Storage {
  // Agent operations
  saveAgent(agent: Agent): Promise<void>;
  getAgent(id: string): Promise<Agent | null>;
  getAllAgents(): Promise<Agent[]>;
  deleteAgent(id: string): Promise<void>;
  
  // Task operations
  saveTask(task: Task): Promise<void>;
  getTask(id: string): Promise<Task | null>;
  getAllTasks(): Promise<Task[]>;
  deleteTask(id: string): Promise<void>;
  
  // Context operations
  saveContext(context: Context): Promise<void>;
  getContext(id: string): Promise<Context | null>;
  getAllContexts(): Promise<Context[]>;
  deleteContext(id: string): Promise<void>;
  
  // Message operations (optional, may be limited)
  saveMessage(message: Message): Promise<void>;
  getMessages(options: { limit?: number; before?: Date }): Promise<Message[]>;
  
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

/**
 * In-memory storage implementation (default)
 */
export class MemoryStorage implements Storage {
  private agents = new Map<string, Agent>();
  private tasks = new Map<string, Task>();
  private contexts = new Map<string, Context>();
  private messages: Message[] = [];
  private maxMessages: number;
  private _connected = false;

  constructor(options: { maxMessages?: number } = {}) {
    this.maxMessages = options.maxMessages ?? 1000;
  }

  async connect(): Promise<void> {
    this._connected = true;
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this.agents.clear();
    this.tasks.clear();
    this.contexts.clear();
    this.messages = [];
  }

  isConnected(): boolean {
    return this._connected;
  }

  // Agent operations
  async saveAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, this.clone(agent));
  }

  async getAgent(id: string): Promise<Agent | null> {
    const agent = this.agents.get(id);
    return agent ? this.clone(agent) : null;
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values()).map(a => this.clone(a));
  }

  async deleteAgent(id: string): Promise<void> {
    this.agents.delete(id);
  }

  // Task operations
  async saveTask(task: Task): Promise<void> {
    this.tasks.set(task.id, this.clone(task));
  }

  async getTask(id: string): Promise<Task | null> {
    const task = this.tasks.get(id);
    return task ? this.clone(task) : null;
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).map(t => this.clone(t));
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  // Context operations
  async saveContext(context: Context): Promise<void> {
    this.contexts.set(context.id, this.clone(context));
  }

  async getContext(id: string): Promise<Context | null> {
    const context = this.contexts.get(id);
    return context ? this.clone(context) : null;
  }

  async getAllContexts(): Promise<Context[]> {
    return Array.from(this.contexts.values()).map(c => this.clone(c));
  }

  async deleteContext(id: string): Promise<void> {
    this.contexts.delete(id);
  }

  // Message operations
  async saveMessage(message: Message): Promise<void> {
    this.messages.push(this.clone(message));
    // Trim to max size
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  async getMessages(options: { limit?: number; before?: Date } = {}): Promise<Message[]> {
    let msgs = this.messages;
    
    if (options.before) {
      msgs = msgs.filter(m => m.timestamp < options.before!);
    }
    
    if (options.limit) {
      msgs = msgs.slice(-options.limit);
    }
    
    return msgs.map(m => this.clone(m));
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }), (key, value) => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value);
      }
      return value;
    });
  }
}

/**
 * Redis storage configuration
 */
export interface RedisStorageConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxMessages?: number;
}

/**
 * Redis storage implementation
 * Requires 'redis' package to be installed
 */
export class RedisStorage implements Storage {
  private client: any;
  private config: RedisStorageConfig;
  private _connected = false;

  constructor(config: RedisStorageConfig = {}) {
    this.config = {
      keyPrefix: 'a2a-coop:',
      maxMessages: 1000,
      ...config
    };
  }

  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid requiring redis as a hard dependency
      let createClient: any;
      try {
        // @ts-ignore - Redis is an optional dependency
        const redis = await import('redis');
        createClient = redis.createClient;
      } catch {
        throw new Error('Redis module not installed. Run: npm install redis');
      }
      
      if (this.config.url) {
        this.client = createClient({ url: this.config.url });
      } else {
        this.client = createClient({
          socket: {
            host: this.config.host ?? 'localhost',
            port: this.config.port ?? 6379,
          },
          password: this.config.password,
          database: this.config.db ?? 0,
        });
      }

      this.client.on('error', (err: Error) => {
        console.error('Redis error:', err);
      });

      await this.client.connect();
      this._connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to Redis: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this._connected = false;
    }
  }

  isConnected(): boolean {
    return this._connected;
  }

  private key(type: string, id: string): string {
    return `${this.config.keyPrefix}${type}:${id}`;
  }

  private pattern(type: string): string {
    return `${this.config.keyPrefix}${type}:*`;
  }

  // Agent operations
  async saveAgent(agent: Agent): Promise<void> {
    await this.client.set(
      this.key('agent', agent.id),
      JSON.stringify(agent)
    );
  }

  async getAgent(id: string): Promise<Agent | null> {
    const data = await this.client.get(this.key('agent', id));
    return data ? this.parse(data) : null;
  }

  async getAllAgents(): Promise<Agent[]> {
    const keys = await this.client.keys(this.pattern('agent'));
    if (keys.length === 0) return [];
    const data = await this.client.mGet(keys);
    return data.map((d: string) => this.parse(d));
  }

  async deleteAgent(id: string): Promise<void> {
    await this.client.del(this.key('agent', id));
  }

  // Task operations
  async saveTask(task: Task): Promise<void> {
    await this.client.set(
      this.key('task', task.id),
      JSON.stringify(task)
    );
  }

  async getTask(id: string): Promise<Task | null> {
    const data = await this.client.get(this.key('task', id));
    return data ? this.parse(data) : null;
  }

  async getAllTasks(): Promise<Task[]> {
    const keys = await this.client.keys(this.pattern('task'));
    if (keys.length === 0) return [];
    const data = await this.client.mGet(keys);
    return data.map((d: string) => this.parse(d));
  }

  async deleteTask(id: string): Promise<void> {
    await this.client.del(this.key('task', id));
  }

  // Context operations
  async saveContext(context: Context): Promise<void> {
    await this.client.set(
      this.key('context', context.id),
      JSON.stringify(context)
    );
  }

  async getContext(id: string): Promise<Context | null> {
    const data = await this.client.get(this.key('context', id));
    return data ? this.parse(data) : null;
  }

  async getAllContexts(): Promise<Context[]> {
    const keys = await this.client.keys(this.pattern('context'));
    if (keys.length === 0) return [];
    const data = await this.client.mGet(keys);
    return data.map((d: string) => this.parse(d));
  }

  async deleteContext(id: string): Promise<void> {
    await this.client.del(this.key('context', id));
  }

  // Message operations using Redis Stream
  async saveMessage(message: Message): Promise<void> {
    const streamKey = `${this.config.keyPrefix}messages`;
    await this.client.xAdd(streamKey, '*', {
      data: JSON.stringify(message)
    });
    
    // Trim stream to max size
    await this.client.xTrim(streamKey, 'MAXLEN', '~', this.config.maxMessages!);
  }

  async getMessages(options: { limit?: number; before?: Date } = {}): Promise<Message[]> {
    const streamKey = `${this.config.keyPrefix}messages`;
    const limit = options.limit ?? 100;
    
    // Read last N messages from stream
    const entries = await this.client.xRevRange(streamKey, '+', '-', { COUNT: limit });
    
    const messages = entries.map((entry: any) => {
      const data = entry.message.data;
      return this.parse(data);
    });

    if (options.before) {
      return messages.filter((m: Message) => m.timestamp < options.before!);
    }

    return messages.reverse(); // Oldest first
  }

  private parse(data: string): any {
    return JSON.parse(data, (key, value) => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value);
      }
      return value;
    });
  }
}

/**
 * Storage factory - creates appropriate storage based on configuration
 */
export function createStorage(config?: { type?: 'memory' | 'redis'; redis?: RedisStorageConfig }): Storage {
  const type = config?.type ?? 'memory';
  
  switch (type) {
    case 'redis':
      return new RedisStorage(config?.redis);
    case 'memory':
    default:
      return new MemoryStorage({ maxMessages: config?.redis?.maxMessages });
  }
}
