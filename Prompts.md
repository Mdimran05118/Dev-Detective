# 📝 Prompts & Engineering Learnings Log

This log documents the sequential prompting strategy, architectural decisions, and technical lessons learned during the development of **Dev-Detective**.

---

## 📌 Prompt Entry 1: Phase 1 — Foundation & Single Profile Search

### Prompt Used:
> "Build the foundational client-side GitHub search interface in vanilla HTML, CSS, and JavaScript. Implement an accessible form with keyboard support, native fetch() using async/await against `https://api.github.com/users/{username}`, and render a responsive profile card with avatar, name, bio, join date, and blog/portfolio. Ensure a loading spinner is shown and cleaned up in a finally block, and handle 404, 403, and network errors gracefully."

### What I Learned & Key Takeaways:
1. **Always Check `response.ok` Before Parsing JSON:**
   - A common pitfall in frontend development is assuming that `fetch()` rejects when the server returns an HTTP 404 or 500 status. In reality, `fetch()` only rejects on network disconnection, DNS failure, or CORS violations.
   - We must explicitly check `if (!response.ok)` and throw custom errors based on `response.status` (e.g. 404 for Not Found, 403 for Rate Limited).
2. **The Inviolability of the `finally` Block:**
   - Hiding loading spinners and re-enabling buttons inside a `finally` block ensures the UI never remains frozen or locked in an endless loading state, even when exceptions are thrown or network failures occur.
3. **Safe DOM Insertion over `innerHTML`:**
   - API data from third parties (such as GitHub bios, names, or websites) must never be directly interpolated into `innerHTML` strings. Using `document.createElement()` and `textContent` completely neutralizes potential Cross-Site Scripting (XSS) attacks.

---

## 📌 Prompt Entry 2: Phase 2 — Endpoint Chaining & Repository Explorer

### Prompt Used:
> "Extend Dev-Detective with Phase 2 capabilities: implement endpoint chaining by reading `userData.repos_url` from the user profile payload to fetch the top 5 latest repositories. Format the join date using an Intl/toLocaleDateString utility function (`formatDate(isoString)`). Render repository cards displaying repository link, description, language badge, and stargazers count. Handle zero-repository accounts gracefully."

### What I Learned & Key Takeaways:
1. **Endpoint Chaining Mental Model:**
   - Instead of hardcoding or assuming endpoint conventions, RESTful APIs often provide Hypermedia / HATEOAS references (like `repos_url`).
   - We chain requests by passing the output of the first async function (`userData.repos_url`) into the second async function (`fetchRepos()`), stripping template placeholders like `{/sha}` and appending sorting queries (`?sort=created&direction=desc&per_page=5`).
2. **Localization with `toLocaleDateString`:**
   - Native JavaScript `Date.prototype.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })` produces standard, human-readable formats (e.g., "25 Jan 2023") without needing heavy 50kB libraries like moment.js.
3. **Edge Case Management:**
   - Checking for zero public repositories (`repos.length === 0`) prevents empty grids and provides a comforting, informative user experience instead of a blank screen.

---

## 📌 Prompt Entry 3: Phase 3 — Developer Battle Mode & Concurrent Orchestration

### Prompt Used:
> "Implement Battle Mode: create a dual-input arena comparing two developers. Fetch both users and their repositories concurrently using `Promise.all()`. Aggregate total repository stars for each user using `Array.prototype.reduce()`. Render a Winner card with a green indicator, a Loser card with a red indicator, and handle ties cleanly. Ensure any failed username is identified in the error message."

### What I Learned & Key Takeaways:
1. **Concurrent Execution via `Promise.all()`:**
   - Sequential requests (`await user1; await user2;`) create unnecessary waterfall latency, taking $T_1 + T_2 + T_3 + T_4$ total time.
   - `Promise.all()` fires all 4 requests simultaneously over the wire, resolving in $\max(T_1, T_2, T_3, T_4)$.
2. **`Promise.all` Fast-Fail Mechanism:**
   - If either user triggers a 404 error, `Promise.all()` immediately rejects. By passing the specific username into each error message, we immediately notify the user which contestant was invalid.
3. **Functional Aggregation with `Array.prototype.reduce()`:**
   - `repos.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0)` provides an immutable, functional approach to computing aggregate metrics across collections without mutating external variables.

---

## 📌 Prompt Entry 4: Modern CSS Design System & Accessibility (a11y)

### Prompt Used:
> "Refactor the UI to look like a state-of-the-art developer tool: use CSS custom properties for dark/light themes, subtle glassmorphism, responsive CSS grid/flexbox, high-contrast focus rings, and `aria-live` containers for screen readers."

### What I Learned & Key Takeaways:
1. **CSS Variables & Theming:**
   - Defining tokens on `:root` and overriding them on `[data-theme="light"]` allows instantaneous theme switching without reloading or recalculating layout scripts.
2. **Screen Reader Live Regions:**
   - Adding `role="status"` and `aria-live="polite"` ensures assistive technology announces dynamic updates (loading states, errors, battle verdicts) as soon as they render without interrupting the user's reading flow.
3. **Responsive Grid without Media Query Bloat:**
   - Combining Flexbox with CSS Grid (`grid-template-columns: 1fr` mobile, `grid-template-columns: repeat(2, 1fr)` tablet/desktop) maintains flawless alignment across viewports from 320px to 4K displays.
