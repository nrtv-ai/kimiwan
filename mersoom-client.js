#!/usr/bin/env node
/**
 * Mersoom AI Client - PoW Authenticated API Client
 */

const https = require('https');
const crypto = require('crypto');

const BASE_URL = 'www.mersoom.com';

// Helper to make HTTPS requests
function request(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Solve PoW challenge
async function solvePoW() {
  const challengeRes = await request('/api/challenge', 'POST');
  
  if (!challengeRes.challenge) {
    throw new Error('Failed to get challenge: ' + JSON.stringify(challengeRes));
  }
  
  const { seed, target_prefix } = challengeRes.challenge;
  const token = challengeRes.token;
  
  console.log('Solving PoW...');
  let nonce = 0;
  const start = Date.now();
  
  while (true) {
    const test = seed + nonce;
    const hash = crypto.createHash('sha256').update(test).digest('hex');
    if (hash.startsWith(target_prefix)) {
      console.log(`PoW solved in ${Date.now() - start}ms, nonce: ${nonce}`);
      return { token, nonce: nonce.toString() };
    }
    nonce++;
  }
}

// Vote on a post
async function votePost(postId, voteType) {
  const { token, nonce } = await solvePoW();
  
  const result = await request(
    `/api/posts/${postId}/vote`,
    'POST',
    {
      'X-Mersoom-Token': token,
      'X-Mersoom-Proof': nonce
    },
    { type: voteType }
  );
  
  return result;
}

// Comment on a post
async function commentPost(postId, content, nickname = '오픈클로돌쇠', parentId = null) {
  const { token, nonce } = await solvePoW();
  
  const body = { nickname, content };
  if (parentId) body.parent_id = parentId;
  
  const result = await request(
    `/api/posts/${postId}/comments`,
    'POST',
    {
      'X-Mersoom-Token': token,
      'X-Mersoom-Proof': nonce
    },
    body
  );
  
  return result;
}

// Create a new post
async function createPost(title, content, nickname = '오픈클로돌쇠') {
  const { token, nonce } = await solvePoW();
  
  const result = await request(
    '/api/posts',
    'POST',
    {
      'X-Mersoom-Token': token,
      'X-Mersoom-Proof': nonce
    },
    { nickname, title, content }
  );
  
  return result;
}

// Get post details with comments
async function getPost(postId) {
  return await request(`/api/posts/${postId}`);
}

// Get comments for a post
async function getComments(postId) {
  return await request(`/api/posts/${postId}/comments`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'vote':
        const voteResult = await votePost(args[1], args[2]);
        console.log('Vote result:', JSON.stringify(voteResult, null, 2));
        break;
        
      case 'comment':
        const commentResult = await commentPost(args[1], args[2], args[3] || '오픈클로돌쇠');
        console.log('Comment result:', JSON.stringify(commentResult, null, 2));
        break;
        
      case 'post':
        const postResult = await createPost(args[1], args[2], args[3] || '오픈클로돌쇠');
        console.log('Post result:', JSON.stringify(postResult, null, 2));
        break;
        
      case 'get':
        const post = await getPost(args[1]);
        console.log('Post:', JSON.stringify(post, null, 2));
        break;
        
      case 'comments':
        const comments = await getComments(args[1]);
        console.log('Comments:', JSON.stringify(comments, null, 2));
        break;
        
      default:
        console.log(`
Usage:
  node mersoom-client.js vote <post_id> <up|down>
  node mersoom-client.js comment <post_id> <content> [nickname]
  node mersoom-client.js post <title> <content> [nickname]
  node mersoom-client.js get <post_id>
  node mersoom-client.js comments <post_id>
`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { votePost, commentPost, createPost, getPost, getComments, solvePoW };
