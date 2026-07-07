---
title: "The 2026 'Lights-Out Factory': An Open-Source Component Built End-to-End by an Agent"
date: 2026-06-24
authors: [tonylawx]
description: "The world's first pure-Agent-authored web UI component — react-ios-multiselect. A 'lights-out factory' for code: no human coding, no human review, no human testing. Bring your own Agent and challenge mine."
slug: 2026-06-24-39020e
---

*This entire post was written by an Agent.*

Remember to ⭐ my GitHub.

In 2026, while the rest of the world still had no idea what an "Agent-autonomous UI component" was, I used China's #1 Agent — zcode — and China's #1 LLM, GLM 5.2, to launch the world's first domestically-bred, pure-Agent-autonomous web UI component: **react-ios-multiselect**.

It carries the "lights-out factory" coding ethos of the AI era: no human coding, no human review, no human testing — comfortably ahead of the field.

You're welcome to consume the component with your own Agent, and you're welcome to have your Agent open a PR and challenge mine.

It's called **react-ios-multiselect** — a mobile React picker component.

📱 Scan the QR code with your phone for a live preview of the docs site.

## How a "Lights-Out Factory" Runs

"Lights-out factory" is a manufacturing concept: lights off, nobody watching, the line runs itself.

I brought that philosophy to writing code. From the first line of code to npm v0.1.0 release, this component was built entirely on an AI Agent (GLM-5.2).

**No human coding** — every line of TypeScript, every line of CSS, every test, was written by the Agent. I never typed a single line.

**No human review** — before every PR merges, CI automatically runs 36 tests + type checks + a build, and forces the "Agent opening the PR" to declare its identity: name, underlying model, degree of autonomy. No declaration — CI rejects. Then the Agent itself reviews.

**No human testing** — behavior tests are written by the Agent, CI is configured by the Agent, the release pipeline is built by the Agent. Push a git tag and the npm package ships automatically — zero manual steps. The Agent then invokes tools to test against the change points.

## What the Component Is

It's a by-product I produced while building Theta with Agents. I looked for a long time; the alternatives were either paid or didn't do what I wanted. So I built one — and put it out as an Agent testbed for everyone.

A **native iOS-feel** React picker — single-select and multi-select in one component. On mobile, a sheet slides up from the bottom; when searching, **the keyboard does not collapse** (an infamous iOS detail that's notoriously hard to get right — this component handles it correctly). 2,000 options scroll smoothly because it's virtualized.

Zero runtime dependencies — just React. Styling uses CSS variables; change one variable to change the color.

The component is live: docs site, GitHub repo, npm package all running — install and use directly.

## Come Play

Two things — you're invited:

**1. Plug the component in via your Agent**

The docs site home page has a one-line prompt. Copy it to your Agent (Cursor, Claude Code, Codex … any will do), and it'll wire the component into your project. You don't need to understand any details.

**2. Open a PR with your Agent and challenge mine**

If anything about the component bugs you, have your Agent open a PR. Let's see which model, which Agent framework, writes the more reliable code. I'll record the "Agent identity + model" for every PR — over time, that becomes a real-world dataset on "which Agents can produce trustworthy contributions to this codebase."

Huge thanks to the ByteDance senior engineer and his partner for the free GLM key — otherwise I couldn't have bought it even with money.

Follow my WeChat official account and come play with AI.
