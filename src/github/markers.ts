export const markers = {
  started: '<!-- agent-started -->',
  planned: '<!-- agent-plan -->',
  repairing: '<!-- agent-repair -->',
  verified: '<!-- agent-verification -->',
  question: '<!-- agent-question -->',
  completed: '<!-- agent-completed -->',
  failed: '<!-- agent-failed -->',
} as const;

export function parseAgentMarker(body: string):
  | {
      type:
        | 'started'
        | 'planned'
        | 'approvalRequired'
        | 'repairing'
        | 'verified'
        | 'question'
        | 'completed'
        | 'failed';
      content: string;
    }
  | undefined {
  const approval = body.match(/<!--\s*agent-approval-required\s+plan-sha256="[a-f0-9]{64}"\s*-->/i);
  if (approval?.index !== undefined) {
    return {
      type: 'approvalRequired',
      content: body.slice(approval.index + approval[0].length).trim(),
    };
  }
  for (const [type, marker] of Object.entries(markers) as [keyof typeof markers, string][]) {
    const index = body.indexOf(marker);
    if (index >= 0) return { type, content: body.slice(index + marker.length).trim() };
  }
  return undefined;
}

export function parseApprovalFingerprint(body: string): string | undefined {
  return body
    .match(/<!--\s*agent-(?:approval-required|approved)\s+plan-sha256="([a-f0-9]{64})"\s*-->/i)?.[1]
    ?.toLowerCase();
}

export function parsePrTaskMarker(
  body: string,
): { taskId: string; issueNumber: number } | undefined {
  const match = body.match(/<!--\s*agent-pr\s+task-id="([^"]+)"\s+issue="(\d+)"\s*-->/);
  if (!match) return undefined;
  return { taskId: match[1]!, issueNumber: Number(match[2]) };
}
