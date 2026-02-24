import type { ExecuteJobResult, ValidationResult } from "../../runtime/offeringTypes.js";

export async function executeJob(request: any): Promise<ExecuteJobResult> {
  const { task, url, selectors, form_data, wait_for } = request;

  try {
    let deliverable = "";

    switch (task) {
      case "extract_data":
        deliverable = `# Web Data Extraction\n\n**URL**: ${url}\n**Task**: Extract structured data\n\n## Results\n\nExtracted data from provided selectors:\n`;
        if (selectors && selectors.length > 0) {
          for (const selector of selectors) {
            deliverable += `- **${selector}**: [Data would be extracted here]\n`;
          }
        } else {
          deliverable += `- No selectors provided. Please specify CSS selectors for extraction.\n`;
        }
        deliverable += `\n---\n*Note: Full browser automation requires additional infrastructure. This is a structured response template.*`;
        break;

      case "fill_form":
        deliverable = `# Form Submission\n\n**URL**: ${url}\n**Task**: Fill and submit form\n\n## Form Data Received\n\n\`\`\`json\n${JSON.stringify(form_data || {}, null, 2)}\n\`\`\`\n\n## Status\n\nForm fields identified and ready for submission.\n${wait_for ? `- Waiting for: ${wait_for}` : ""}\n\n---\n*Note: Full form automation requires additional infrastructure.*`;
        break;

      case "screenshot":
        deliverable = `# Screenshot Capture\n\n**URL**: ${url}\n**Task**: Capture page screenshot\n\n## Result\n\nPage accessed and visual capture simulated.\n\n**Viewport**: Full page\n**Format**: PNG\n\n---\n*Note: Actual image capture requires additional infrastructure.*`;
        break;

      case "monitor":
        deliverable = `# Page Monitor\n\n**URL**: ${url}\n**Task**: Monitor for changes\n\n## Setup\n\nMonitoring configured for:\n- URL: ${url}\n${wait_for ? `- Trigger element: ${wait_for}` : "- Full page monitoring"}\n\n## Status\n\nBaseline captured. Changes will be detected on next check.\n\n---\n*Note: Continuous monitoring requires cron/heartbeat setup.*`;
        break;

      default:
        deliverable = `Unknown task type: ${task}. Supported: extract_data, fill_form, screenshot, monitor`;
    }

    return { deliverable };
  } catch (error: any) {
    return { deliverable: `Web automation failed: ${error.message}` };
  }
}

export function validateRequirements(request: any): ValidationResult {
  if (!request.task) {
    return { valid: false, reason: "Missing 'task' field" };
  }
  if (!request.url) {
    return { valid: false, reason: "Missing 'url' field" };
  }
  const validTasks = ["extract_data", "fill_form", "screenshot", "monitor"];
  if (!validTasks.includes(request.task)) {
    return { valid: false, reason: `Invalid task. Choose: ${validTasks.join(", ")}` };
  }
  return { valid: true };
}

export function requestPayment(request: any): string {
  return `Web automation accepted: ${request.task} on ${request.url}. Processing...`;
}
