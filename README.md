# 🕵️‍♂️ Dev-Detective

> A client-side GitHub profile search engine and developer battle arena engineered with **100% pure vanilla HTML5, CSS3, and modern JavaScript (ES6+)**. No frameworks, no bundlers, zero dependencies.

🚀 **Live App:** [https://dev-detective-azure-tau.vercel.app](https://dev-detective-azure-tau.vercel.app)

---

## 🌟 Live Demo & Preview Placeholders

🔗 **Live Demo URL:** [https://dev-detective-azure-tau.vercel.app](https://dev-detective-azure-tau.vercel.app)

| Single Search & Profile Card | Latest Repositories Grid |
| :---: | :---: |
| ![Single Search Profile Card Placeholder](https://via.placeholder.com/600x380/161b22/58a6ff?text=Dev-Detective+Profile+Card) | ![Latest Repositories Placeholder](https://via.placeholder.com/600x380/161b22/58a6ff?text=Top+5+Latest+Repositories) |

| 404 Not Found & Error States | Battle Mode Arena |
| :---: | :---: |
| ![404 User Not Found Placeholder](https://via.placeholder.com/600x380/161b22/f85149?text=Clean+404+Error+State) | ![Battle Mode Placeholder](https://via.placeholder.com/600x380/161b22/3fb950?text=Developer+Battle+Arena+(Winner+vs+Loser)) |

---

## 🚀 Features Per Phase

### 🔹 Phase 1: Core Profile Search (P0)
- **Instant Search:** Search input with button and keyboard <kbd>Enter</kbd> trigger. Includes quick suggestion pills (`octocat`, `torvalds`, etc.).
- **Native Async API Fetch:** Asynchronous `GET https://api.github.com/users/{username}` using `fetch()` and `async/await`.
- **Pre-Validation of Responses:** Strictly verifies `response.ok` before parsing JSON payload.
- **Rich Responsive Profile Card:**
  - Avatar image with rounded border and lazy-loading.
  - Full Name (falls back gracefully to `login` if missing).
  - Bio with stylized quote styling (with fallback text if empty).
  - Formatted Join Date using British date formatting (`formatDate()`).
  - Portfolio/Blog URL (auto-normalizes `https://` protocol or falls back to GitHub profile URL).
  - Follower, Following, and Public Repo statistics.
  - Location, Twitter handle, and Company meta information.
- **Robust Loading & Error States:**
  - Animated spinner and pulsing feedback while pending.
  - Guaranteed clearance of pending states in a `finally` block.
  - **404:** Friendly "User Not Found" alert with guidance.
  - **403:** "Rate limit exceeded" alert (60 unauthenticated reqs/hr).
  - **Network Failures:** Catches offline and connection interruptions gracefully without crashing.

### 🔹 Phase 2: Endpoint Chaining & Repository Explorer (Priority 1)
- **Endpoint Chaining:** Dynamically feeds `userData.repos_url` into a secondary asynchronous request to retrieve latest repositories (`?sort=created&direction=desc&per_page=5`).
- **Repository Cards:**
  - Clickable repository title with external link icon, `target="_blank"`, and `rel="noopener noreferrer"`.
  - Repository description (with fallback if empty).
  - Language badge with colored accent dot.
  - Stargazer count (`★`) and fork count (`⑂`).
- **Date Utility:** `formatDate(isoString)` utility converting ISO timestamps (e.g. `2023-01-25T12:00:00Z`) to `25 Jan 2023`.
- **Zero-Repo Handling:** Clear, friendly banner when a user has no public repositories.

### 🔹 Phase 3: Developer Battle Mode (Priority 2)
- **Battle Mode Arena Switcher:** Toggle button seamlessly transitions between single search and dual-input Challenger vs Defender arena.
- **Concurrent Requests with `Promise.all()`:** Concurrently fetches both user profiles and both repo endpoints (with `per_page=100`) simultaneously in a single promise batch.
- **Star Aggregation via `Array.prototype.reduce()`:** Loops through each contestant's repositories and computes the total stars acquired across all repositories.
- **Dynamic Outcome Rendering:**
  - **Winner Card:** Emerald green border, glowing aura, and `👑 Winner` trophy badge.
  - **Loser / Runner-Up Card:** Crimson red border and `Runner-Up` badge.
  - **Tie State:** Neutral amber style and `🤝 Tied` handshake badge if star counts match.
- **Granular Error Reporting:** Pinpoints the exact username that failed if either user is not found.

---

## 🛠️ Architecture & Engineering Quality

- **Separation of Concerns:** Modular, focused functions:
  - `fetchUser(username)`
  - `fetchRepos(reposUrl, perPage)`
  - `renderProfileCard(userData)`
  - `renderReposSection(reposData)`
  - `showLoading(container, message)`
  - `hideLoading(container)`
  - `showError(container, title, desc, type)`
  - `formatDate(isoString)`
  - `calculateTotalStars(repos)`
  - `handleSingleSearch(username)`
  - `handleBattleSearch(user1, user2)`
- **XSS Immunity:** Untrusted data returned from third-party APIs is inserted strictly using `textContent` and native DOM element nodes (`document.createElement()`), preventing script injection attacks.
- **Accessibility (a11y):**
  - Semantic HTML (`<header>`, `<main>`, `<section>`, `<article>`, `<form>`).
  - Screen-reader accessible status announcements via `role="status"` and `aria-live="polite"`.
  - Proper form labels and input attributes.
  - Visible keyboard focus rings (`:focus-visible`).
- **Design & Theming:**
  - CSS custom properties (variables) powering dark and light mode.
  - LocalStorage persistence for user theme preference.
  - Glassmorphic card backdrops and ambient light gradients.

---

## ⚙️ Quick Start & Running Locally

Because this project uses pure vanilla web technologies, **no build step, bundler, or package installation is required**.

### Option A: Direct Browser Launch
Simply double-click `index.html` or drag it into any modern web browser (Chrome, Edge, Firefox, Safari).

### Option B: Local HTTP Server (Recommended)
Running through a local HTTP server ensures full compatibility with browser fetch security policies:

```bash
# Using Node.js (v18+) with the included zero-dependency server:
node serve.js
# Then open: http://localhost:4173

# Or using npx:
npx serve .
# Or using Python (if installed):
python -m http.server 3000
```

---

## 🔑 GitHub API Authentication (Optional PAT)

GitHub's public unauthenticated REST API enforces a rate limit of **60 requests per hour per IP address**.

If you need a higher quota (5,000 requests/hour) during extensive local testing:
1. Generate a fine-grained or classic token on GitHub (no scopes needed for public profile reads).
2. Open [script.js](file:///c:/Users/NEW%20USER/Desktop/Projects_Collections/Prodesk%20III/script.js) and update the constant at the top:
   ```javascript
   const GITHUB_TOKEN = 'your_personal_access_token_here';
   ```
3. ⚠️ **Security Reminder:** Never commit or publish a real personal access token to a public Git repository.
