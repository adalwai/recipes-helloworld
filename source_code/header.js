/**
 * Unified Header Authentication Status Controller
 * 
 * This module provides a consistent authentication status display across all pages.
 * Features:
 * - Shows "Checking..." state immediately while verification is in progress
 * - Attempts Bearer token authentication first (from localStorage/sessionStorage)
 * - Falls back to cookie-based session authentication
 * - Uses single /api/auth/me endpoint for all authentication modes
 * - Robust logging and error handling
 */

const AUTH_ME_ENDPOINT = '/api/auth/me';

/**
 * Initialize header authentication status display
 * Call this function on DOMContentLoaded from your page
 */
async function initHeaderAuth() {
  console.log('[header.js] Initializing header auth status...');
  
  // Show "Checking..." state immediately
  showCheckingState();
  
  try {
    // Attempt to get user profile
    const userData = await verifyAuth();
    
    if (userData) {
      console.log('[header.js] Auth verified, user:', userData);
      showUserInfo(userData);
    } else {
      console.log('[header.js] Not authenticated');
      showUnauthenticatedState();
    }
  } catch (error) {
    console.error('[header.js] Error during auth initialization:', error);
    showUnauthenticatedState();
  }
}

/**
 * Verify authentication using Bearer token or cookie-based session
 * Returns user profile {name, email, picture} or null if unauthenticated
 */
async function verifyAuth() {
  console.log('[header.js] Starting auth verification...');
  
  // First, try Bearer token from storage
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  if (token) {
    console.log('[header.js] Found auth token in storage, attempting Bearer auth...');
    try {
      const response = await fetch(AUTH_ME_ENDPOINT, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('[header.js] Bearer auth successful:', userData);
        return userData;
      } else {
        console.warn('[header.js] Bearer auth failed with status:', response.status);
      }
    } catch (error) {
      console.error('[header.js] Bearer auth request error:', error);
    }
  } else {
    console.log('[header.js] No token in storage');
  }
  
  // Fallback to cookie-based session authentication
  console.log('[header.js] Attempting cookie-based auth...');
  try {
    const response = await fetch(AUTH_ME_ENDPOINT, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('[header.js] Cookie auth successful:', userData);
      return userData;
    } else {
      console.warn('[header.js] Cookie auth failed with status:', response.status);
    }
  } catch (error) {
    console.error('[header.js] Cookie auth request error:', error);
  }
  
  return null;
}

/**
 * Show "Checking..." state in the header
 */
function showCheckingState() {
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  
  if (userInfo && userName) {
    userName.textContent = 'Checking…';
    userInfo.classList.add('visible');
    userInfo.style.opacity = '0.7';
    console.log('[header.js] Showing checking state');
  } else {
    console.warn('[header.js] Could not find #userInfo or #userName elements');
  }
}

/**
 * Show authenticated user information in the header
 */
function showUserInfo(userData) {
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  
  if (!userInfo || !userName) {
    console.warn('[header.js] Could not find #userInfo or #userName elements');
    return;
  }
  
  // Extract display name from user data
  const displayName = userData.name || userData.fullName || userData.displayName || userData.email || 'User';
  
  console.log('[header.js] Setting user display name:', displayName);
  userName.textContent = displayName;
  
  // Add avatar if available
  if (userData.picture) {
    const avatar = document.createElement('img');
    avatar.src = userData.picture;
    avatar.alt = 'User avatar';
    avatar.className = 'user-avatar';
    avatar.style.width = '24px';
    avatar.style.height = '24px';
    avatar.style.borderRadius = '50%';
    avatar.style.marginRight = '8px';
    userName.insertBefore(avatar, userName.firstChild);
  }
  
  // Make fully visible
  userInfo.classList.add('visible');
  userInfo.style.opacity = '1';
}

/**
 * Show unauthenticated state (hide user info or show login prompt)
 */
function showUnauthenticatedState() {
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  
  if (userInfo && userName) {
    // Option 1: Hide the user info pill entirely
    userInfo.classList.remove('visible');
    userInfo.style.display = 'none';
    console.log('[header.js] Hiding user info (unauthenticated)');
    
    // Option 2: Show "Log In" link (uncomment if preferred)
    // userName.innerHTML = '<a href="/index.html" style="color: inherit; text-decoration: none;">Log In</a>';
    // userInfo.classList.add('visible');
    // userInfo.style.opacity = '1';
  } else {
    console.warn('[header.js] Could not find #userInfo or #userName elements');
  }
}

// Export for use in pages
if (typeof window !== 'undefined') {
  window.initHeaderAuth = initHeaderAuth;
}
