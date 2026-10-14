# 🎬 2-Minute Video QA Demo Checklist

Use this time-stamped script and checklist to record your 2-minute presentation or walkthrough demo of **Dev-Detective**.

---

## ⏱️ Video Timeline & Step-by-Step Script

| Timestamp | Section | Action to Perform | What to Highlight to the Evaluator |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:25** | **Introduction & Tech Stack** | • Open `http://localhost:4173`<br>• Show initial loaded profile (`octocat`)<br>• Toggle Dark / Light mode | • "Built 100% with pure vanilla HTML, CSS, and modern JavaScript."<br>• "Zero frameworks, zero bundlers, semantic and fully accessible." |
| **0:25 - 0:45** | **Phase 1: Profile Search** | • Click a quick tag (e.g. `torvalds`) or type a username and press <kbd>Enter</kbd> | • Avatar, Name fallback, Bio quote, and formatted British join date (`25 Jan 2023`).<br>• Location, Blog URL with automatic `https://` normalization, and Twitter links. |
| **0:45 - 1:05** | **Network Throttling & Loading State** | • Open Chrome DevTools (<kbd>F12</kbd>) &rarr; **Network** tab.<br>• Set Throttling dropdown to **Slow 3G**.<br>• Submit search for `gaearon`. | • Point out the animated spinner and pulsing status text.<br>• Explain how the `finally` block guarantees cleanup when the request completes. |
| **1:05 - 1:20** | **Error Handling & 404 State** | • Turn Throttling back to **No Throttling**.<br>• Type a nonsense username: `nonexistent-dev-xyz-9988`<br>• Press <kbd>Enter</kbd>. | • "Check `response.ok` before parsing JSON to catch HTTP 404."<br>• Clean, non-crashing alert card with guidance for the user. |
| **1:20 - 1:40** | **Phase 2: Endpoint Chaining & Repos** | • Search for a user with public repositories (e.g., `octocat` or `sindresorhus`).<br>• Scroll down to the **Latest Repositories** section. | • "Endpoint chaining: We take `userData.repos_url` from the first response and chain a second fetch request sorted by creation date."<br>• Show external link (`target="_blank"` with `rel="noopener noreferrer"`), description, language badge, and star count. |
| **1:40 - 2:00** | **Phase 3: Developer Battle Mode** | • Click the **Battle Mode** tab in the header.<br>• Enter Player 1: `octocat` and Player 2: `torvalds`.<br>• Click **Commence Battle**. | • "Uses `Promise.all()` to fire all 4 requests concurrently."<br>• "Uses `Array.prototype.reduce()` over `stargazers_count` to calculate total stars."<br>• Show the **Winner** card with green indicator and **Runner-Up** card with red indicator. |

---

## ✅ Pre-Recording Verification Checklist

Before hitting record:
- [ ] Ensure local preview server is running (`node serve.js` or double-click `index.html`).
- [ ] Browser zoom is at a comfortable 100% or 110%.
- [ ] DevTools window is prepared (Docked to right or bottom for smooth demonstration of network throttling).
- [ ] Microphone is tested and screen resolution is set to 1080p (1920x1080).
- [ ] Both single mode and battle mode test accounts are memorized (`octocat`, `torvalds`, `nonexistent-user-12345`).
