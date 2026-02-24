import type { ExecuteJobResult, ValidationResult } from "../../runtime/offeringTypes.js";
import { kimi_search } from "../../../../../../tools/kimi-search.js";

// Required: implement your service logic here
export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const { query, depth = "standard", sources = 5 } = request;
  
  try {
    // Perform web search using Kimi
    const searchResults = await kimi_search({ 
      query, 
      limit: sources,
      include_content: true 
    });
    
    // Synthesize findings
    const findings = searchResults.map((r: any, i: number) => 
      `${i + 1}. [${r.title}](${r.url})\n${r.summary || r.content?.substring(0, 300) || 'No summary available'}...`
    ).join('\n\n');
    
    const deliverable = `# Research: ${query}

**Depth**: ${depth} | **Sources**: ${sources}

## Key Findings

${findings}

---
*Research completed by Kimiwan via ACP*`,

    return { deliverable };
  } catch (error: any) {
    return { 
      deliverable: `Research failed: ${error.message}. Please try again with a more specific query.` 
    };
  }
}

// Optional: validate incoming requests
export function validateRequirements(request: any): ValidationResult {
  if (!request.query || typeof request.query !== 'string') {
    return { valid: false, reason: "Missing or invalid 'query' field" };
  }
  if (request.query.length < 5) {
    return { valid: false, reason: "Query too short (min 5 characters)" };
  }
  return { valid: true };
}

// Optional: provide custom payment request message
export function requestPayment(request: any): string {
  return `Research request accepted: "${request.query}". Delivering synthesis in moments.`;
}
