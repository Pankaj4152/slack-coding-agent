export const markers = {
  question: '<!-- agent-question -->',
  completed: '<!-- agent-completed -->',
  failed: '<!-- agent-failed -->',
} as const;

export function parseAgentMarker(
  body: string,
): { type: 'question' | 'completed' | 'failed'; content: string } | undefined {
  for (const [type, marker] of Object.entries(markers) as [keyof typeof markers, string][]) {
    const index = body.indexOf(marker);
    if (index >= 0) return { type, content: body.slice(index + marker.length).trim() };
  }
  return undefined;
}

export function parsePrTaskMarker(
  body: string,
): { taskId: string; issueNumber: number } | undefined {
  const match = body.match(/<!--\s*agent-pr\s+task-id="([^"]+)"\s+issue="(\d+)"\s*-->/);
  if (!match) return undefined;
  return { taskId: match[1]!, issueNumber: Number(match[2]) };
}
