import type { ExecuteJobResult, ValidationResult } from "../../runtime/offeringTypes.js";

// Required: implement your service logic here
export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const { code, language, focus = "all" } = request;
  
  try {
    // Basic security patterns to check
    const securityIssues: string[] = [];
    const codeStr = typeof code === 'string' ? code : JSON.stringify(code);
    
    // Language-specific checks
    if (language === 'solidity') {
      if (codeStr.includes('selfdestruct')) securityIssues.push('🔴 CRITICAL: selfdestruct detected');
      if (codeStr.includes('tx.origin')) securityIssues.push('🔴 HIGH: tx.origin usage (vulnerable to phishing)');
      if (!codeStr.includes('ReentrancyGuard') && codeStr.includes('call{value:')) {
        securityIssues.push('🟡 MEDIUM: External call without reentrancy protection');
      }
      if (codeStr.includes('block.timestamp') || codeStr.includes('now')) {
        securityIssues.push('🟡 MEDIUM: Timestamp dependence');
      }
    }
    
    if (language === 'python' || language === 'javascript' || language === 'typescript') {
      if (codeStr.includes('eval(')) securityIssues.push('🔴 CRITICAL: eval() usage detected');
      if (codeStr.includes('exec(')) securityIssues.push('🔴 HIGH: exec() usage detected');
      if (codeStr.includes('innerHTML')) securityIssues.push('🟡 MEDIUM: innerHTML (XSS risk)');
      if (codeStr.includes('Math.random()')) securityIssues.push('🟡 LOW: Math.random() not cryptographically secure');
    }
    
    const issuesText = securityIssues.length > 0 
      ? securityIssues.join('\n') 
      : '✅ No obvious security issues detected';
    
    const deliverable = `# Code Review: ${language.toUpperCase()}

**Focus**: ${focus}

## Security Analysis

${issuesText}

## Code Metrics
- **Length**: ${codeStr.length} characters
- **Lines**: ${codeStr.split('\n').length}

## Recommendations
${focus === 'all' || focus === 'security' ? '- Review all external calls and input validation\n' : ''}${focus === 'all' || focus === 'performance' ? '- Consider gas/memory optimizations for hot paths\n' : ''}${focus === 'all' || focus === 'readability' ? '- Add inline comments for complex logic\n' : ''}
---
*Review completed by Kimiwan via ACP*`,

    return { deliverable };
  } catch (error: any) {
    return { 
      deliverable: `Code review failed: ${error.message}` 
    };
  }
}

// Optional: validate incoming requests
export function validateRequirements(request: any): ValidationResult {
  if (!request.code) {
    return { valid: false, reason: "Missing 'code' field" };
  }
  if (!request.language) {
    return { valid: false, reason: "Missing 'language' field" };
  }
  const validLangs = ['solidity', 'python', 'javascript', 'typescript'];
  if (!validLangs.includes(request.language)) {
    return { valid: false, reason: `Invalid language. Choose: ${validLangs.join(', ')}` };
  }
  return { valid: true };
}

// Optional: provide custom payment request message
export function requestPayment(request: any): string {
  return `Code review accepted: ${request.language.toUpperCase()} (${request.focus} focus). Analyzing now.`;
}
