# Repository instructions for coding agents

## Repository overview

Describe the product, primary languages, and important directories.

## Setup commands

List exact commands for installing dependencies and preparing a development environment.

## Validation commands

List formatting, linting, typechecking, unit, and integration test commands.

## Architecture rules

- Follow existing architecture and code patterns.
- Keep changes scoped to the GitHub issue.
- Do not modify infrastructure or CI unless explicitly requested.

## Coding conventions

- Match nearby style, naming, error handling, and test conventions.
- Add tests for behavior changes.
- Do not add dependencies without a clear reason.
- Do not modify generated files manually.

## Files the agent should not modify

List secrets, vendored files, generated output, lockfiles (unless necessary), and sensitive configuration.

## When clarification is required

Ask before making a material product decision, public API change, database-schema change, destructive migration, or security-policy change. Do not guess when requirements conflict.

## Pull request expectations

Summarize the change and validation honestly. Call out risks and follow-up work. Never merge automatically.
