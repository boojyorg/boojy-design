---
name: session-metrics
description: Use when the user requests a detailed summary of session statistics, line velocity, or project progress.
disable-model-invocation: false
---

# Session Metrics Guide

When the user asks for session metrics, execute the following safe local git command to evaluate the current line velocity and changed file footprints:

```bash
git diff --stat $(git merge-base main HEAD) 2>/dev/null || git diff --stat HEAD
