"use strict";
/**
 * Storage interface and implementations for A2A-Coop
 *
 * Provides pluggable persistence layer supporting:
 * - MemoryStorage: In-memory (default, ephemeral)
 * - RedisStorage: Redis-backed (persistent, distributed)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStorage = exports.MemoryStorage = void 0;
exports.createStorage = createStorage;
/**
 * In-memory storage implementation (default)
 */
class MemoryStorage {
    agents = new Map();
    tasks = new Map();
    contexts = new Map();
    messages = [];
    maxMessages;
    _connected = false;
    constructor(options = {}) {
        this.maxMessages = options.maxMessages ?? 1000;
    }
    async connect() {
        this._connected = true;
    }
    async disconnect() {
        this._connected = false;
        this.agents.clear();
        this.tasks.clear();
        this.contexts.clear();
        this.messages = [];
    }
    isConnected() {
        return this._connected;
    }
    // Agent operations
    async saveAgent(agent) {
        this.agents.set(agent.id, this.clone(agent));
    }
    async getAgent(id) {
        const agent = this.agents.get(id);
        return agent ? this.clone(agent) : null;
    }
    async getAllAgents() {
        return Array.from(this.agents.values()).map(a => this.clone(a));
    }
    async deleteAgent(id) {
        this.agents.delete(id);
    }
    // Task operations
    async saveTask(task) {
        this.tasks.set(task.id, this.clone(task));
    }
    async getTask(id) {
        const task = this.tasks.get(id);
        return task ? this.clone(task) : null;
    }
    async getAllTasks() {
        return Array.from(this.tasks.values()).map(t => this.clone(t));
    }
    async deleteTask(id) {
        this.tasks.delete(id);
    }
    // Context operations
    async saveContext(context) {
        this.contexts.set(context.id, this.clone(context));
    }
    async getContext(id) {
        const context = this.contexts.get(id);
        return context ? this.clone(context) : null;
    }
    async getAllContexts() {
        return Array.from(this.contexts.values()).map(c => this.clone(c));
    }
    async deleteContext(id) {
        this.contexts.delete(id);
    }
    // Message operations
    async saveMessage(message) {
        this.messages.push(this.clone(message));
        // Trim to max size
        if (this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(-this.maxMessages);
        }
    }
    async getMessages(options = {}) {
        let msgs = this.messages;
        if (options.before) {
            msgs = msgs.filter(m => m.timestamp < options.before);
        }
        if (options.limit) {
            msgs = msgs.slice(-options.limit);
        }
        return msgs.map(m => this.clone(m));
    }
    clone(obj) {
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
exports.MemoryStorage = MemoryStorage;
/**
 * Redis storage implementation
 * Requires 'redis' package to be installed
 */
class RedisStorage {
    client;
    config;
    _connected = false;
    constructor(config = {}) {
        this.config = {
            keyPrefix: 'a2a-coop:',
            maxMessages: 1000,
            ...config
        };
    }
    async connect() {
        try {
            // Dynamic import to avoid requiring redis as a hard dependency
            let createClient;
            try {
                // @ts-ignore - Redis is an optional dependency
                const redis = await Promise.resolve().then(() => __importStar(require('redis')));
                createClient = redis.createClient;
            }
            catch {
                throw new Error('Redis module not installed. Run: npm install redis');
            }
            if (this.config.url) {
                this.client = createClient({ url: this.config.url });
            }
            else {
                this.client = createClient({
                    socket: {
                        host: this.config.host ?? 'localhost',
                        port: this.config.port ?? 6379,
                    },
                    password: this.config.password,
                    database: this.config.db ?? 0,
                });
            }
            this.client.on('error', (err) => {
                console.error('Redis error:', err);
            });
            await this.client.connect();
            this._connected = true;
        }
        catch (error) {
            throw new Error(`Failed to connect to Redis: ${error}`);
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this._connected = false;
        }
    }
    isConnected() {
        return this._connected;
    }
    key(type, id) {
        return `${this.config.keyPrefix}${type}:${id}`;
    }
    pattern(type) {
        return `${this.config.keyPrefix}${type}:*`;
    }
    // Agent operations
    async saveAgent(agent) {
        await this.client.set(this.key('agent', agent.id), JSON.stringify(agent));
    }
    async getAgent(id) {
        const data = await this.client.get(this.key('agent', id));
        return data ? this.parse(data) : null;
    }
    async getAllAgents() {
        const keys = await this.client.keys(this.pattern('agent'));
        if (keys.length === 0)
            return [];
        const data = await this.client.mGet(keys);
        return data.map((d) => this.parse(d));
    }
    async deleteAgent(id) {
        await this.client.del(this.key('agent', id));
    }
    // Task operations
    async saveTask(task) {
        await this.client.set(this.key('task', task.id), JSON.stringify(task));
    }
    async getTask(id) {
        const data = await this.client.get(this.key('task', id));
        return data ? this.parse(data) : null;
    }
    async getAllTasks() {
        const keys = await this.client.keys(this.pattern('task'));
        if (keys.length === 0)
            return [];
        const data = await this.client.mGet(keys);
        return data.map((d) => this.parse(d));
    }
    async deleteTask(id) {
        await this.client.del(this.key('task', id));
    }
    // Context operations
    async saveContext(context) {
        await this.client.set(this.key('context', context.id), JSON.stringify(context));
    }
    async getContext(id) {
        const data = await this.client.get(this.key('context', id));
        return data ? this.parse(data) : null;
    }
    async getAllContexts() {
        const keys = await this.client.keys(this.pattern('context'));
        if (keys.length === 0)
            return [];
        const data = await this.client.mGet(keys);
        return data.map((d) => this.parse(d));
    }
    async deleteContext(id) {
        await this.client.del(this.key('context', id));
    }
    // Message operations using Redis Stream
    async saveMessage(message) {
        const streamKey = `${this.config.keyPrefix}messages`;
        await this.client.xAdd(streamKey, '*', {
            data: JSON.stringify(message)
        });
        // Trim stream to max size
        await this.client.xTrim(streamKey, 'MAXLEN', '~', this.config.maxMessages);
    }
    async getMessages(options = {}) {
        const streamKey = `${this.config.keyPrefix}messages`;
        const limit = options.limit ?? 100;
        // Read last N messages from stream
        const entries = await this.client.xRevRange(streamKey, '+', '-', { COUNT: limit });
        const messages = entries.map((entry) => {
            const data = entry.message.data;
            return this.parse(data);
        });
        if (options.before) {
            return messages.filter((m) => m.timestamp < options.before);
        }
        return messages.reverse(); // Oldest first
    }
    parse(data) {
        return JSON.parse(data, (key, value) => {
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
                return new Date(value);
            }
            return value;
        });
    }
}
exports.RedisStorage = RedisStorage;
/**
 * Storage factory - creates appropriate storage based on configuration
 */
function createStorage(config) {
    const type = config?.type ?? 'memory';
    switch (type) {
        case 'redis':
            return new RedisStorage(config?.redis);
        case 'memory':
        default:
            return new MemoryStorage({ maxMessages: config?.redis?.maxMessages });
    }
}
//# sourceMappingURL=storage.js.map