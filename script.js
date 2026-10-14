/**
 * ============================================================================
 * DEV-DETECTIVE: CLIENT-SIDE GITHUB SEARCH & DEVELOPER BATTLE
 * Pure Vanilla JavaScript (ES6+) with Async/Await, Endpoint Chaining & Promise.all
 * ============================================================================
 */

'use strict';

/**
 * ----------------------------------------------------------------------------
 * 1. CONFIGURATION & AUTHENTICATION
 * ----------------------------------------------------------------------------
 * GitHub's unauthenticated REST API allows 60 requests per hour per IP.
 * You can optionally paste a Personal Access Token (PAT) here for 5,000 req/hr.
 * 
 * SECURITY WARNING: NEVER commit or expose a real Personal Access Token in 
 * a public repository or client-side production app! For client-side demos,
 * leave this empty unless testing locally.
 */
const GITHUB_TOKEN = ''; // e.g., 'ghp_xxxxxxxxxxxxxxxxxxxx'

/**
 * Helper to construct standard GitHub API request headers.
 * Attaches the Authorization Bearer token only if GITHUB_TOKEN is provided.
 * @returns {HeadersInit} Standard fetch headers
 */
function getApiHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json'
  };
  if (GITHUB_TOKEN && GITHUB_TOKEN.trim() !== '') {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN.trim()}`;
  }
  return headers;
}

/**
 * ----------------------------------------------------------------------------
 * 2. DOM ELEMENT REFERENCES
 * ----------------------------------------------------------------------------
 */
const DOM = {
  // Theme toggle
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  htmlRoot: document.documentElement,

  // Mode navigation tabs
  tabSingle: document.getElementById('tab-single'),
  tabBattle: document.getElementById('tab-battle'),
  singleSection: document.getElementById('single-mode-section'),
  battleSection: document.getElementById('battle-mode-section'),

  // Single Search elements
  searchForm: document.getElementById('search-form'),
  usernameInput: document.getElementById('username-input'),
  clearSingleBtn: document.getElementById('clear-single-btn'),
  searchSubmitBtn: document.getElementById('search-submit-btn'),
  singleStatusArea: document.getElementById('single-status-area'),
  singleResultsContainer: document.getElementById('single-results-container'),
  quickTags: document.querySelectorAll('.tag-pill'),

  // Battle Mode elements
  battleForm: document.getElementById('battle-form'),
  player1Input: document.getElementById('player1-input'),
  player2Input: document.getElementById('player2-input'),
  battleSubmitBtn: document.getElementById('battle-submit-btn'),
  battleStatusArea: document.getElementById('battle-status-area'),
  battleResultsContainer: document.getElementById('battle-results-container'),
};

/**
 * ----------------------------------------------------------------------------
 * 3. UTILITY FUNCTIONS
 * ----------------------------------------------------------------------------
 */

/**
 * Formats an ISO-8601 date string (e.g. "2023-01-25T12:00:00Z") to "25 Jan 2023".
 * Uses Intl.DateTimeFormat via toLocaleDateString with 'en-GB' locale.
 * @param {string} isoString - Date string from GitHub API (created_at)
 * @returns {string} Formatted human-readable date
 */
function formatDate(isoString) {
  if (!isoString) return 'Date unavailable';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }); // Outputs: e.g. "25 Jan 2023"
}

/**
 * Calculates total star count across a list of repositories using Array.prototype.reduce().
 * @param {Array<Object>} repos - Array of GitHub repository objects
 * @returns {number} Sum of stargazers_count
 */
function calculateTotalStars(repos) {
  if (!Array.isArray(repos)) return 0;
  return repos.reduce((accumulator, repo) => {
    const stars = typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0;
    return accumulator + stars;
  }, 0);
}

/**
 * Safely creates an element with optional class name and text content.
 * Prevents XSS vulnerabilities by assigning text via textContent instead of innerHTML.
 * @param {string} tag - HTML tag name
 * @param {string} [className] - CSS class name(s)
 * @param {string} [text] - Text content
 * @returns {HTMLElement} The created DOM element
 */
function createSafeElement(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null && text !== '') el.textContent = text;
  return el;
}

/**
 * ----------------------------------------------------------------------------
 * 4. UI STATE & FEEDBACK MANAGERS (Loading & Error Handling)
 * ----------------------------------------------------------------------------
 */

/**
 * Displays a clean loading spinner and message in the specified status container.
 * Accessible to screen readers via aria-live attribute on status containers.
 * @param {HTMLElement} container - Target container element
 * @param {string} [message="Querying GitHub API..."] - User-facing loading text
 */
function showLoading(container, message = 'Querying GitHub API...') {
  container.innerHTML = '';

  const loadingBox = createSafeElement('div', 'loading-box');
  const spinner = createSafeElement('div', 'spinner');
  spinner.setAttribute('aria-hidden', 'true');
  const text = createSafeElement('p', 'loading-text', message);

  loadingBox.appendChild(spinner);
  loadingBox.appendChild(text);
  container.appendChild(loadingBox);
}

/**
 * Clears any loading indicator or status messages from the container.
 * @param {HTMLElement} container - Target container element
 */
function hideLoading(container) {
  container.innerHTML = '';
}

/**
 * Displays user-friendly error banners (404, 403, network failure).
 * @param {HTMLElement} container - Target container element
 * @param {string} title - Error heading
 * @param {string} description - Detailed explanation or recovery tip
 * @param {string} [type='error'] - 'error' or 'warning'
 */
function showError(container, title, description, type = 'error') {
  container.innerHTML = '';

  const errorCard = createSafeElement('div', `error-card ${type}`);
  errorCard.setAttribute('role', 'alert');

  const icon = createSafeElement('span', 'error-icon');
  icon.textContent = type === 'warning' ? '⚠️' : '❌';
  icon.setAttribute('aria-hidden', 'true');

  const content = createSafeElement('div', 'error-content');
  const heading = createSafeElement('h4', '', title);
  const desc = createSafeElement('p', '', description);

  content.appendChild(heading);
  content.appendChild(desc);
  errorCard.appendChild(icon);
  errorCard.appendChild(content);

  container.appendChild(errorCard);
}

/**
 * ----------------------------------------------------------------------------
 * 5. CORE API FETCHING FUNCTIONS (Vanilla fetch with async/await)
 * ----------------------------------------------------------------------------
 */

/**
 * Fetches a GitHub user profile by username.
 * 
 * PLAIN LANGUAGE EXPLANATION:
 * We use `async/await` so asynchronous network requests read sequentially
 * like normal synchronous code. Before parsing `response.json()`, we check
 * `response.ok` (HTTP status 200-299). If `response.ok` is false, we throw
 * custom descriptive errors based on HTTP status codes (404 = Not Found,
 * 403 = Rate Limited) so callers can present exact guidance without crashing.
 * 
 * @param {string} username - GitHub username to search
 * @returns {Promise<Object>} GitHub user data object
 */
async function fetchUser(username) {
  const cleanUsername = encodeURIComponent(username.trim());
  const url = `https://api.github.com/users/${cleanUsername}`;

  let response;
  try {
    response = await fetch(url, { headers: getApiHeaders() });
  } catch (networkError) {
    // Network failure (offline, DNS failure, CORS block)
    throw new Error(`Network connection error while reaching GitHub for "${username}". Please check your internet connection.`);
  }

  // Check HTTP response status before reading JSON body
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`User "${username}" not found on GitHub. Please check the spelling.`);
    } else if (response.status === 403) {
      throw new Error('API Rate limit exceeded. GitHub permits 60 unauthenticated requests/hr. Please try again later.');
    } else {
      throw new Error(`GitHub API request failed with status code ${response.status}.`);
    }
  }

  return await response.json();
}

/**
 * Fetches repositories for a user.
 * 
 * ENDPOINT CHAINING EXPLANATION:
 * The GitHub user object returned from `fetchUser` contains a `repos_url`
 * property (e.g. "https://api.github.com/users/octocat/repos").
 * We take that URL and chain a second fetch request to retrieve their repos,
 * passing query parameters for sorting and pagination.
 * 
 * @param {string} reposUrl - URL for repositories endpoint
 * @param {number} [perPage=5] - Number of repositories to fetch
 * @returns {Promise<Array<Object>>} List of repository objects
 */
async function fetchRepos(reposUrl, perPage = 5) {
  // Strip any trailing template placeholders like "{/sha}" from GitHub's URLs
  const cleanUrl = reposUrl.replace(/\{.*\}$/, '');
  // Request sorted by latest creation/push date
  const separator = cleanUrl.includes('?') ? '&' : '?';
  const queryUrl = `${cleanUrl}${separator}sort=created&direction=desc&per_page=${perPage}`;

  let response;
  try {
    response = await fetch(queryUrl, { headers: getApiHeaders() });
  } catch (networkError) {
    throw new Error('Failed to fetch repositories due to a network connection error.');
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub API rate limit reached while loading repositories.');
    }
    throw new Error(`Failed to load repositories (Status: ${response.status}).`);
  }

  return await response.json();
}

/**
 * ----------------------------------------------------------------------------
 * 6. RENDERING FUNCTIONS (Phase 1 & Phase 2 Safe DOM Construction)
 * ----------------------------------------------------------------------------
 */

/**
 * Renders the Phase 1 GitHub Profile Card.
 * Uses safe DOM methods (createElement, textContent) to prevent XSS.
 * @param {Object} user - User profile data from GitHub API
 * @returns {HTMLElement} The populated profile card element
 */
function renderProfileCard(user) {
  const card = createSafeElement('article', 'profile-card');
  const grid = createSafeElement('div', 'profile-grid');

  // --- Avatar Column ---
  const avatarWrapper = createSafeElement('div', 'avatar-wrapper');
  const avatarImg = document.createElement('img');
  avatarImg.className = 'profile-avatar';
  avatarImg.src = user.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
  avatarImg.alt = `${user.login}'s profile avatar`;
  avatarImg.loading = 'lazy';
  avatarImg.width = 110;
  avatarImg.height = 110;

  const viewGithubLink = createSafeElement('a', 'view-github-link', 'View on GitHub ↗');
  viewGithubLink.href = user.html_url;
  viewGithubLink.target = '_blank';
  viewGithubLink.rel = 'noopener noreferrer';

  avatarWrapper.appendChild(avatarImg);
  avatarWrapper.appendChild(viewGithubLink);

  // --- Profile Details Column ---
  const details = createSafeElement('div', 'profile-details');

  // Header meta: Name & Joined Date
  const headerMeta = createSafeElement('div', 'profile-header-meta');
  const nameRow = createSafeElement('div', 'profile-name-row');
  
  // Fall back to login handle if user.name is null or empty
  const displayName = user.name && user.name.trim() !== '' ? user.name : user.login;
  const nameEl = createSafeElement('h3', 'profile-name', displayName);
  
  const joinedText = `Joined ${formatDate(user.created_at)}`;
  const joinedEl = createSafeElement('span', 'profile-joined', joinedText);

  nameRow.appendChild(nameEl);
  nameRow.appendChild(joinedEl);

  const handleEl = createSafeElement('a', 'profile-handle', `@${user.login}`);
  handleEl.href = user.html_url;
  handleEl.target = '_blank';
  handleEl.rel = 'noopener noreferrer';

  headerMeta.appendChild(nameRow);
  headerMeta.appendChild(handleEl);

  // Bio (with fallback text)
  const hasBio = Boolean(user.bio && user.bio.trim() !== '');
  const bioText = hasBio ? user.bio : 'This profile has no bio yet.';
  const bioEl = createSafeElement('p', `profile-bio ${hasBio ? '' : 'is-empty'}`, bioText);

  // Stats Grid (Repos, Followers, Following)
  const statsGrid = createSafeElement('div', 'profile-stats-grid');
  
  const stats = [
    { label: 'Repos', value: user.public_repos ?? 0 },
    { label: 'Followers', value: user.followers ?? 0 },
    { label: 'Following', value: user.following ?? 0 }
  ];

  stats.forEach(item => {
    const statItem = createSafeElement('div', 'stat-item');
    const label = createSafeElement('span', 'stat-label', item.label);
    const val = createSafeElement('span', 'stat-value', item.value.toLocaleString());
    statItem.appendChild(label);
    statItem.appendChild(val);
    statsGrid.appendChild(statItem);
  });

  // Meta Links Grid (Location, Blog/Website, Twitter, Company)
  const linksGrid = createSafeElement('div', 'profile-links-grid');

  // 1. Location
  const locItem = createSafeElement('div', `link-item ${user.location ? '' : 'not-available'}`);
  locItem.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
  const locText = createSafeElement('span', '', user.location || 'Not Available');
  locItem.appendChild(locText);
  linksGrid.appendChild(locItem);

  // 2. Blog / Portfolio URL (Fallback to html_url if blog is empty)
  const blogItem = createSafeElement('div', 'link-item');
  blogItem.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
  
  const rawBlog = user.blog && user.blog.trim() !== '' ? user.blog.trim() : null;
  const blogLink = createSafeElement('a');
  if (rawBlog) {
    const formattedUrl = rawBlog.startsWith('http://') || rawBlog.startsWith('https://') 
      ? rawBlog 
      : `https://${rawBlog}`;
    blogLink.href = formattedUrl;
    blogLink.textContent = rawBlog.replace(/^https?:\/\//, '');
  } else {
    // Fall back to GitHub profile url
    blogLink.href = user.html_url;
    blogLink.textContent = 'github.com/' + user.login;
  }
  blogLink.target = '_blank';
  blogLink.rel = 'noopener noreferrer';
  blogItem.appendChild(blogLink);
  linksGrid.appendChild(blogItem);

  // 3. Twitter / X Handle
  const twitterItem = createSafeElement('div', `link-item ${user.twitter_username ? '' : 'not-available'}`);
  twitterItem.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>`;
  if (user.twitter_username) {
    const twLink = createSafeElement('a', '', `@${user.twitter_username}`);
    twLink.href = `https://twitter.com/${user.twitter_username}`;
    twLink.target = '_blank';
    twLink.rel = 'noopener noreferrer';
    twitterItem.appendChild(twLink);
  } else {
    twitterItem.appendChild(createSafeElement('span', '', 'Not Available'));
  }
  linksGrid.appendChild(twitterItem);

  // 4. Company
  const companyItem = createSafeElement('div', `link-item ${user.company ? '' : 'not-available'}`);
  companyItem.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
  companyItem.appendChild(createSafeElement('span', '', user.company || 'Not Available'));
  linksGrid.appendChild(companyItem);

  // Assemble details
  details.appendChild(headerMeta);
  details.appendChild(bioEl);
  details.appendChild(statsGrid);
  details.appendChild(linksGrid);

  // Assemble full grid
  grid.appendChild(avatarWrapper);
  grid.appendChild(details);
  card.appendChild(grid);

  return card;
}

/**
 * Renders Phase 2 Repositories Section.
 * Shows top 5 latest repos, or a polite zero-repos message.
 * @param {Array<Object>} repos - List of repository objects
 * @returns {HTMLElement} Repositories section element
 */
function renderReposSection(repos) {
  const section = createSafeElement('section', 'repos-section');
  section.setAttribute('aria-label', 'Latest Repositories');

  // Header with count badge
  const header = createSafeElement('div', 'repos-header');
  const titleGroup = createSafeElement('div', 'repos-title-group');
  const title = createSafeElement('h3', 'repos-title', 'Latest Repositories');
  const badge = createSafeElement('span', 'repos-badge', `${repos.length} Repos`);
  
  titleGroup.appendChild(title);
  titleGroup.appendChild(badge);
  header.appendChild(titleGroup);
  section.appendChild(header);

  // Handle zero repositories condition
  if (!repos || repos.length === 0) {
    const emptyBox = createSafeElement('div', 'empty-repos-card', 'No public repositories yet.');
    section.appendChild(emptyBox);
    return section;
  }

  // Grid of repository cards
  const grid = createSafeElement('div', 'repos-grid');

  repos.forEach(repo => {
    const repoCard = createSafeElement('article', 'repo-card');

    const topSection = createSafeElement('div', 'repo-top');
    
    // Repository link (target="_blank" and rel="noopener noreferrer")
    const repoLink = createSafeElement('a', 'repo-link');
    repoLink.href = repo.html_url;
    repoLink.target = '_blank';
    repoLink.rel = 'noopener noreferrer';
    repoLink.textContent = repo.name;
    
    // SVG External link icon
    const linkIcon = document.createElement('span');
    linkIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
    repoLink.appendChild(linkIcon);

    const descText = repo.description && repo.description.trim() !== '' 
      ? repo.description 
      : 'No description provided for this repository.';
    const repoDesc = createSafeElement('p', 'repo-desc', descText);

    topSection.appendChild(repoLink);
    topSection.appendChild(repoDesc);

    // Meta row (Language & Stars)
    const metaRow = createSafeElement('div', 'repo-meta');

    // Language badge
    if (repo.language) {
      const langPill = createSafeElement('span', 'repo-stat-pill');
      const dot = createSafeElement('span', 'lang-dot');
      const langName = createSafeElement('span', '', repo.language);
      langPill.appendChild(dot);
      langPill.appendChild(langName);
      metaRow.appendChild(langPill);
    }

    // Stars pill
    const starsPill = createSafeElement('span', 'repo-stat-pill');
    starsPill.innerHTML = `<span aria-hidden="true">★</span> <span>${(repo.stargazers_count ?? 0).toLocaleString()}</span>`;
    metaRow.appendChild(starsPill);

    // Forks pill
    if (typeof repo.forks_count === 'number' && repo.forks_count > 0) {
      const forksPill = createSafeElement('span', 'repo-stat-pill');
      forksPill.innerHTML = `<span aria-hidden="true">⑂</span> <span>${repo.forks_count.toLocaleString()}</span>`;
      metaRow.appendChild(forksPill);
    }

    repoCard.appendChild(topSection);
    repoCard.appendChild(metaRow);
    grid.appendChild(repoCard);
  });

  section.appendChild(grid);
  return section;
}

/**
 * ----------------------------------------------------------------------------
 * 7. SINGLE PROFILE ORCHESTRATION (Phase 1 & Phase 2 Flow)
 * ----------------------------------------------------------------------------
 */

/**
 * Executes the complete Phase 1 + Phase 2 search pipeline:
 * 1. Validates and trims input.
 * 2. Shows loading indicator.
 * 3. Fetches user data via `fetchUser()`.
 * 4. Chaining: Fetches top 5 repos via `fetchRepos(user.repos_url)`.
 * 5. Safely renders Profile Card and Repositories.
 * 6. Guarantees hiding loading indicator inside a `finally` block.
 * 
 * @param {string} username - GitHub username to search
 */
async function handleSingleSearch(username) {
  const cleanUsername = username.trim();
  if (!cleanUsername) return; // Ignore empty submissions

  // Reset existing view
  hideLoading(DOM.singleStatusArea);
  DOM.singleResultsContainer.innerHTML = '';
  DOM.searchSubmitBtn.disabled = true;

  // Step 1: Display loading state
  showLoading(DOM.singleStatusArea, `Searching GitHub for "@${cleanUsername}"...`);

  try {
    // Step 2: Fetch primary user profile (Phase 1)
    const userData = await fetchUser(cleanUsername);

    // Step 3: Endpoint chaining - use repos_url for second fetch (Phase 2)
    const reposData = await fetchRepos(userData.repos_url, 5);

    // Clear loading state on success
    hideLoading(DOM.singleStatusArea);

    // Step 4: Render Profile Card & Repositories Section
    const profileCard = renderProfileCard(userData);
    const reposSection = renderReposSection(reposData);

    DOM.singleResultsContainer.appendChild(profileCard);
    DOM.singleResultsContainer.appendChild(reposSection);

  } catch (err) {
    // Graceful error handling (404, 403, or network failure)
    const isRateLimit = err.message.includes('rate limit');
    showError(
      DOM.singleStatusArea,
      isRateLimit ? 'Rate Limit Exceeded' : 'Search Error',
      err.message,
      isRateLimit ? 'warning' : 'error'
    );
  } finally {
    /**
     * CRITICAL REQUIREMENT:
     * The `finally` block ALWAYS runs, whether the request succeeded or failed.
     * We re-enable the submit button here to prevent permanent UI lockouts.
     */
    DOM.searchSubmitBtn.disabled = false;
  }
}

/**
 * ----------------------------------------------------------------------------
 * 8. BATTLE MODE ORCHESTRATION (Phase 3 Flow)
 * ----------------------------------------------------------------------------
 */

/**
 * Creates an individual battle summary card for a contestant.
 * @param {Object} contestant - { user, repos, totalStars, outcome }
 * @returns {HTMLElement} The styled battle card element
 */
function createBattleCard(contestant) {
  const { user, repos, totalStars, outcome } = contestant;
  
  const card = createSafeElement('article', `battle-result-card is-${outcome}`);

  // Outcome badge (Winner, Runner-Up, or Tie)
  const pill = createSafeElement('div', `outcome-pill ${outcome}`);
  if (outcome === 'winner') {
    pill.textContent = '👑 Winner';
  } else if (outcome === 'loser') {
    pill.textContent = 'Runner-Up';
  } else {
    pill.textContent = '🤝 Tied';
  }
  card.appendChild(pill);

  // Avatar + Header
  const avatarWrapper = createSafeElement('div', 'avatar-wrapper');
  const avatar = document.createElement('img');
  avatar.className = 'profile-avatar';
  avatar.src = user.avatar_url;
  avatar.alt = `${user.login}'s avatar`;
  avatar.width = 90;
  avatar.height = 90;
  avatarWrapper.appendChild(avatar);

  const nameEl = createSafeElement('h3', 'profile-name', user.name || user.login);
  const handleEl = createSafeElement('a', 'profile-handle', `@${user.login}`);
  handleEl.href = user.html_url;
  handleEl.target = '_blank';
  handleEl.rel = 'noopener noreferrer';

  card.appendChild(avatarWrapper);
  card.appendChild(nameEl);
  card.appendChild(handleEl);

  // Total Stars Showcase (Calculated using Array.prototype.reduce)
  const starsBox = createSafeElement('div', 'battle-stars-box');
  const starsLabel = createSafeElement('span', 'battle-stars-label', 'Total Stars Acquired');
  const starsVal = createSafeElement('span', 'battle-stars-value');
  starsVal.innerHTML = `<span aria-hidden="true">★</span> <span>${totalStars.toLocaleString()}</span>`;
  starsBox.appendChild(starsLabel);
  starsBox.appendChild(starsVal);
  card.appendChild(starsBox);

  // Profile Stats
  const statsGrid = createSafeElement('div', 'profile-stats-grid');
  const stats = [
    { label: 'Public Repos', value: user.public_repos ?? repos.length },
    { label: 'Followers', value: user.followers ?? 0 },
    { label: 'Following', value: user.following ?? 0 }
  ];
  stats.forEach(item => {
    const statItem = createSafeElement('div', 'stat-item');
    statItem.appendChild(createSafeElement('span', 'stat-label', item.label));
    statItem.appendChild(createSafeElement('span', 'stat-value', item.value.toLocaleString()));
    statsGrid.appendChild(statItem);
  });
  card.appendChild(statsGrid);

  return card;
}

/**
 * Conducts the Developer Battle between two users:
 * 
 * PROMISE.ALL EXPLANATION:
 * We need to fetch both users and both users' full repos simultaneously.
 * Instead of waiting for User 1 then User 2 sequentially (which takes 2x time),
 * we launch all requests concurrently with `Promise.all()`.
 * `Promise.all()` returns a single Promise that fulfills only when ALL
 * sub-promises fulfill. If any single promise rejects (e.g., user not found),
 * `Promise.all()` immediately rejects with that specific error.
 * 
 * TOTAL STARS EXPLANATION:
 * We use `Array.prototype.reduce()` over `stargazers_count` from each user's
 * repos (requesting per_page=100) to compute their total stars.
 * 
 * @param {string} user1Name - Username of Player 1
 * @param {string} user2Name - Username of Player 2
 */
async function handleBattleSearch(user1Name, user2Name) {
  const p1 = user1Name.trim();
  const p2 = user2Name.trim();

  if (!p1 || !p2) {
    showError(DOM.battleStatusArea, 'Missing Usernames', 'Please enter GitHub usernames for both Player 1 and Player 2.', 'warning');
    return;
  }

  // Clear previous battle state
  hideLoading(DOM.battleStatusArea);
  DOM.battleResultsContainer.innerHTML = '';
  DOM.battleSubmitBtn.disabled = true;

  showLoading(DOM.battleStatusArea, `Summoning "@${p1}" and "@${p2}" to the arena via Promise.all()...`);

  try {
    /**
     * SIMULTANEOUS CONCURRENT FETCHING WITH PROMISE.ALL:
     * We execute all 4 requests concurrently:
     * 1. Player 1 profile
     * 2. Player 1 repos (per_page=100 for star aggregation)
     * 3. Player 2 profile
     * 4. Player 2 repos (per_page=100 for star aggregation)
     */
    const [p1User, p1Repos, p2User, p2Repos] = await Promise.all([
      fetchUser(p1),
      fetchRepos(`https://api.github.com/users/${encodeURIComponent(p1)}/repos`, 100),
      fetchUser(p2),
      fetchRepos(`https://api.github.com/users/${encodeURIComponent(p2)}/repos`, 100)
    ]);

    // Calculate Total Stars using Array.prototype.reduce()
    const p1Stars = calculateTotalStars(p1Repos);
    const p2Stars = calculateTotalStars(p2Repos);

    // Determine Battle Outcome
    let p1Outcome = 'tie';
    let p2Outcome = 'tie';
    let verdictText = `It's a dead heat! Both developers tied with ${p1Stars.toLocaleString()} stars!`;

    if (p1Stars > p2Stars) {
      p1Outcome = 'winner';
      p2Outcome = 'loser';
      verdictText = `@${p1User.login} triumphs with ${p1Stars.toLocaleString()} total stars versus @${p2User.login}'s ${p2Stars.toLocaleString()} stars!`;
    } else if (p2Stars > p1Stars) {
      p1Outcome = 'loser';
      p2Outcome = 'winner';
      verdictText = `@${p2User.login} triumphs with ${p2Stars.toLocaleString()} total stars versus @${p1User.login}'s ${p1Stars.toLocaleString()} stars!`;
    }

    // Clear loading state
    hideLoading(DOM.battleStatusArea);

    // Build Verdict Banner
    const banner = createSafeElement('div', 'battle-verdict-banner');
    const verdictTitle = createSafeElement('h3', 'verdict-title', p1Outcome === 'tie' ? '🤝 Legendary Tie!' : '🏆 Victory Decided!');
    const verdictSub = createSafeElement('p', 'verdict-subtitle', verdictText);
    banner.appendChild(verdictTitle);
    banner.appendChild(verdictSub);
    DOM.battleResultsContainer.appendChild(banner);

    // Build Contestant Cards Grid
    const cardsGrid = createSafeElement('div', 'battle-cards-grid');
    
    const card1 = createBattleCard({
      user: p1User,
      repos: p1Repos,
      totalStars: p1Stars,
      outcome: p1Outcome
    });

    const card2 = createBattleCard({
      user: p2User,
      repos: p2Repos,
      totalStars: p2Stars,
      outcome: p2Outcome
    });

    cardsGrid.appendChild(card1);
    cardsGrid.appendChild(card2);
    DOM.battleResultsContainer.appendChild(cardsGrid);

  } catch (err) {
    // Handles 404, 403 or network errors, clearly identifying which user failed
    const isRateLimit = err.message.includes('rate limit');
    showError(
      DOM.battleStatusArea,
      isRateLimit ? 'Rate Limit Exceeded' : 'Battle Encountered An Error',
      err.message,
      isRateLimit ? 'warning' : 'error'
    );
  } finally {
    // Guarantee submit button is re-enabled
    DOM.battleSubmitBtn.disabled = false;
  }
}

/**
 * ----------------------------------------------------------------------------
 * 9. EVENT LISTENERS & INITIALIZATION
 * ----------------------------------------------------------------------------
 */

// Theme Management (with localStorage persistence)
function initTheme() {
  const savedTheme = localStorage.getItem('dev_detective_theme') || 'dark';
  DOM.htmlRoot.setAttribute('data-theme', savedTheme);
  updateThemeButtonLabel(savedTheme);

  DOM.themeToggleBtn.addEventListener('click', () => {
    const currentTheme = DOM.htmlRoot.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    DOM.htmlRoot.setAttribute('data-theme', nextTheme);
    localStorage.setItem('dev_detective_theme', nextTheme);
    updateThemeButtonLabel(nextTheme);
  });
}

function updateThemeButtonLabel(theme) {
  DOM.themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
}

// Mode Switcher (Single Search vs Battle Mode)
function initModeSwitch() {
  DOM.tabSingle.addEventListener('click', () => {
    DOM.tabSingle.classList.add('active');
    DOM.tabSingle.setAttribute('aria-pressed', 'true');
    DOM.tabBattle.classList.remove('active');
    DOM.tabBattle.setAttribute('aria-pressed', 'false');

    DOM.singleSection.classList.remove('hidden-panel');
    DOM.singleSection.classList.add('active-panel');
    DOM.battleSection.classList.add('hidden-panel');
    DOM.battleSection.classList.remove('active-panel');
    DOM.usernameInput.focus();
  });

  DOM.tabBattle.addEventListener('click', () => {
    DOM.tabBattle.classList.add('active');
    DOM.tabBattle.setAttribute('aria-pressed', 'true');
    DOM.tabSingle.classList.remove('active');
    DOM.tabSingle.setAttribute('aria-pressed', 'false');

    DOM.battleSection.classList.remove('hidden-panel');
    DOM.battleSection.classList.add('active-panel');
    DOM.singleSection.classList.add('hidden-panel');
    DOM.singleSection.classList.remove('active-panel');
    DOM.player1Input.focus();
  });
}

// Single Search Form Handlers
function initSingleSearch() {
  // Input clear button toggle
  DOM.usernameInput.addEventListener('input', () => {
    if (DOM.usernameInput.value.trim().length > 0) {
      DOM.clearSingleBtn.classList.remove('hidden');
    } else {
      DOM.clearSingleBtn.classList.add('hidden');
    }
  });

  DOM.clearSingleBtn.addEventListener('click', () => {
    DOM.usernameInput.value = '';
    DOM.clearSingleBtn.classList.add('hidden');
    DOM.usernameInput.focus();
  });

  // Submit on Form Submit (also triggered when Enter key is pressed)
  DOM.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSingleSearch(DOM.usernameInput.value);
  });

  // Quick Suggestion Tag Pills
  DOM.quickTags.forEach(pill => {
    pill.addEventListener('click', () => {
      const suggestedUser = pill.getAttribute('data-user');
      if (suggestedUser) {
        DOM.usernameInput.value = suggestedUser;
        DOM.clearSingleBtn.classList.remove('hidden');
        handleSingleSearch(suggestedUser);
      }
    });
  });
}

// Battle Mode Form Handlers
function initBattleSearch() {
  DOM.battleForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleBattleSearch(DOM.player1Input.value, DOM.player2Input.value);
  });
}

// Bootstrap Application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initModeSwitch();
  initSingleSearch();
  initBattleSearch();

  // Load default showcase user 'octocat' for an instant WOW experience
  handleSingleSearch('octocat');
});
