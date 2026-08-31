import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Case = {
  id: string;
  acceptanceCriteria: string[];
  requiredChecks: string[];
  expectedOutcome: string;
};

const root = resolve(import.meta.dirname, "..");
const cases = JSON.parse(readFileSync(resolve(root, "evaluation/cases.json"), "utf8")) as Case[];
const results = resolve(root, "results");
const generatedAt = "2026-08-31T12:00:00Z";

function observations(workflow: "baseline" | "final") {
  return cases.map((item, index) => {
    const improved = workflow === "final";
    const repair = improved && item.id === "validation-repair";
    const outcome = item.expectedOutcome;
    return {
      caseId: item.id,
      observedOutcome: outcome,
      acceptanceEvidence: item.acceptanceCriteria.map((criterion) => ({
        criterion,
        passed: true,
        evidence: `[SYNTHETIC DRY-RUN] ${criterion} satisfied in simulated ${workflow} trace.`,
      })),
      checks: item.requiredChecks.map((command) => ({
        command,
        passed: true,
        evidence: `[SYNTHETIC DRY-RUN] ${command} exited 0.`,
      })),
      repositoryChanged: item.expectedOutcome === "pull-request",
      firstAttempt: !(workflow === "baseline" && item.id === "validation-repair"),
      elapsedMinutes: Number((improved ? 3.4 + index * 0.21 : 4.8 + index * 0.31).toFixed(2)),
      humanMinutes: item.expectedOutcome === "clarification" || item.expectedOutcome === "retry" ? 1.8 : 0.4,
      costUsd: Number((improved ? 0.025 + index * 0.004 : 0.041 + index * 0.006).toFixed(3)),
      providerInvocations: repair ? 4 : improved ? 3 : 2,
      repairAttempted: repair,
      recoveredByRepair: repair,
      notes: `[SYNTHETIC DRY-RUN ONLY] Simulated ${workflow} observation; replace with live evidence before submission.`,
    };
  });
}

function manifest(workflow: "baseline" | "final") {
  return {
    synthetic: true,
    runId: `${workflow}-synthetic-dry-run-20260831`,
    workflow,
    applicationCommit: workflow === "baseline" ? "63ff730" : "fa5bce9",
    caseFileCommit: "abcdef1234567",
    provider: "gemini",
    model: "gemini-2.5-flash",
    providerTier: "synthetic-dry-run",
    runner: "local-fixture-generator",
    nodeVersion: process.version,
    startedAtUtc: generatedAt,
    timeoutMinutesPerAttempt: 60,
    maximumAttemptsPerCase: 1,
    targetRepository: "synthetic-owner/Testing-Repo",
    startingCommit: "123456789abcd",
    pricingSourceAndDate: "synthetic fixture; no provider call or charge",
    controlledDifferences: [],
    notes: "Synthetic dry-run fixture. Not measured evidence and must not be submitted as live results.",
  };
}

writeFileSync(resolve(results, "baseline-observations.json"), `${JSON.stringify(observations("baseline"), null, 2)}\n`);
writeFileSync(resolve(results, "final-observations.json"), `${JSON.stringify(observations("final"), null, 2)}\n`);
writeFileSync(resolve(results, "baseline-manifest.json"), `${JSON.stringify(manifest("baseline"), null, 2)}\n`);
writeFileSync(resolve(results, "final-manifest.json"), `${JSON.stringify(manifest("final"), null, 2)}\n`);
console.log("Generated explicitly synthetic baseline/final dry-run fixtures.");
