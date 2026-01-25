# Copilot Instructions for Placemark

This project prioritizes clarity, safety, and explicit user control over automation or hidden behavior.

When generating code or suggestions, follow these principles:

## General Principles

- Prefer simple, readable solutions over clever abstractions.
- Avoid introducing backend services or server-side state.
- Assume all derived data is stored locally unless explicitly stated otherwise.
- Treat file operations (copy/move/delete) as safety-critical.

## Architecture

- Core logic should be written in TypeScript and remain platform-agnostic.
- UI code should be separated from data processing and file operations.
- Platform-specific code (desktop/mobile) should be thin wrappers around shared logic.

## Privacy & Safety

- Never assume permission; require explicit user actions.
- Avoid background scanning or automatic reprocessing.
- Make destructive operations reversible where possible.
- Prefer dry-run previews before executing file operations.

## Mapping & Time

- Geographic selection and date-window filtering are equal, independent constraints.
- Do not infer missing locations unless explicitly requested.
- Always expose counts and selection summaries to the user.

## Style

- Favor explicit naming over abbreviations.
- Avoid magic values and hidden defaults.
- Write code that is easy to reason about and audit.

Placemark should feel trustworthy, predictable, and calm.
