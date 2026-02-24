#!/usr/bin/env node

import { A2ACoopServer } from './server';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

const server = new A2ACoopServer(port);
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
