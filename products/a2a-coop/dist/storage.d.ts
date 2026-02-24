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
    saveAgent(agent: Agent): Promise<void>;
    getAgent(id: string): Promise<Agent | null>;
    getAllAgents(): Promise<Agent[]>;
    deleteAgent(id: string): Promise<void>;
    saveTask(task: Task): Promise<void>;
    getTask(id: string): Promise<Task | null>;
    getAllTasks(): Promise<Task[]>;
    deleteTask(id: string): Promise<void>;
    saveContext(context: Context): Promise<void>;
    getContext(id: string): Promise<Context | null>;
    getAllContexts(): Promise<Context[]>;
    deleteContext(id: string): Promise<void>;
    saveMessage(message: Message): Promise<void>;
    getMessages(options: {
        limit?: number;
        before?: Date;
    }): Promise<Message[]>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}
/**
 * In-memory storage implementation (default)
 */
export declare class MemoryStorage implements Storage {
    private agents;
    private tasks;
    private contexts;
    private messages;
    private maxMessages;
    private _connected;
    constructor(options?: {
        maxMessages?: number;
    });
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    saveAgent(agent: Agent): Promise<void>;
    getAgent(id: string): Promise<Agent | null>;
    getAllAgents(): Promise<Agent[]>;
    deleteAgent(id: string): Promise<void>;
    saveTask(task: Task): Promise<void>;
    getTask(id: string): Promise<Task | null>;
    getAllTasks(): Promise<Task[]>;
    deleteTask(id: string): Promise<void>;
    saveContext(context: Context): Promise<void>;
    getContext(id: string): Promise<Context | null>;
    getAllContexts(): Promise<Context[]>;
    deleteContext(id: string): Promise<void>;
    saveMessage(message: Message): Promise<void>;
    getMessages(options?: {
        limit?: number;
        before?: Date;
    }): Promise<Message[]>;
    private clone;
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
export declare class RedisStorage implements Storage {
    private client;
    private config;
    private _connected;
    constructor(config?: RedisStorageConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    private key;
    private pattern;
    saveAgent(agent: Agent): Promise<void>;
    getAgent(id: string): Promise<Agent | null>;
    getAllAgents(): Promise<Agent[]>;
    deleteAgent(id: string): Promise<void>;
    saveTask(task: Task): Promise<void>;
    getTask(id: string): Promise<Task | null>;
    getAllTasks(): Promise<Task[]>;
    deleteTask(id: string): Promise<void>;
    saveContext(context: Context): Promise<void>;
    getContext(id: string): Promise<Context | null>;
    getAllContexts(): Promise<Context[]>;
    deleteContext(id: string): Promise<void>;
    saveMessage(message: Message): Promise<void>;
    getMessages(options?: {
        limit?: number;
        before?: Date;
    }): Promise<Message[]>;
    private parse;
}
/**
 * Storage factory - creates appropriate storage based on configuration
 */
export declare function createStorage(config?: {
    type?: 'memory' | 'redis';
    redis?: RedisStorageConfig;
}): Storage;
//# sourceMappingURL=storage.d.ts.map