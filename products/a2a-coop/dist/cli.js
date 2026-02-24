#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const server = new server_1.A2ACoopServer(port);
server.start();
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
});
//# sourceMappingURL=cli.js.map