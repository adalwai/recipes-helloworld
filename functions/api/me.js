/**
 * Cloudflare Pages Function: /api/auth/me
 * 
 * Unified authentication endpoint that returns the current authenticated user.
 * Supports both:
 * - Bearer token authentication (from Authorization header)
 * - Cookie-based session authentication (from Cloudflare Access or session cookies)
 * 
 * Returns: {name, email, picture} on success
 * Returns: 401 if unauthenticated
 */

const CLIENT_ID = '184950928765-22nhslddgetmmnfl8kl728n6fv0bg7hu.apps.googleusercontent.com';

/**
 * Handle GET requests to /api/auth/me
 */
export async function onRequestGet(context) {
  const { request } = context;
  
  console.log('[/api/auth/me] Processing authentication request');
  
  // First, try Bearer token authentication
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('[/api/auth/me] Found Bearer token, attempting verification');
    
    try {
      const user = await verifyGoogleToken(token);
      if (user) {
        console.log('[/api/auth/me] Bearer token verified successfully');
        return createSuccessResponse(user);
      }
    } catch (error) {
      console.error('[/api/auth/me] Bearer token verification failed:', error);
    }
  }
  
  // Fallback: Try Cloudflare Access JWT from cookies
  console.log('[/api/auth/me] Attempting cookie-based authentication');
  const cookieHeader = request.headers.get('Cookie');
  
  if (cookieHeader) {
    // Try to extract Cloudflare Access JWT cookie (CF_Authorization)
    const cfAccessJWT = extractCookie(cookieHeader, 'CF_Authorization');
    
    if (cfAccessJWT) {
      console.log('[/api/auth/me] Found Cloudflare Access JWT cookie');
      try {
        const user = await parseCloudflareAccessJWT(cfAccessJWT);
        if (user) {
          console.log('[/api/auth/me] Cloudflare Access JWT parsed successfully');
          return createSuccessResponse(user);
        }
      } catch (error) {
        console.error('[/api/auth/me] Cloudflare Access JWT parsing failed:', error);
      }
    }
    
    // Try to extract Google OAuth token from cookies
    const googleToken = extractCookie(cookieHeader, 'google_token') || extractCookie(cookieHeader, 'authToken');
    if (googleToken) {
      console.log('[/api/auth/me] Found Google token in cookies');
      try {
        const user = await verifyGoogleToken(googleToken);
        if (user) {
          console.log('[/api/auth/me] Cookie-based Google token verified successfully');
          return createSuccessResponse(user);
        }
      } catch (error) {
        console.error('[/api/auth/me] Cookie-based Google token verification failed:', error);
      }
    }
  }
  
  // No valid authentication found
  console.log('[/api/auth/me] No valid authentication found');
  return createErrorResponse();
}

/**
 * Verify Google OAuth2 token
 */
async function verifyGoogleToken(token) {
  try {
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`;
    const response = await fetch(verifyUrl);
    
    if (!response.ok) {
      console.error('[verifyGoogleToken] Verification failed with status:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    // Check if token is valid and matches our client ID
    if (data.error || data.aud !== CLIENT_ID) {
      console.error('[verifyGoogleToken] Invalid token or client ID mismatch');
      return null;
    }
    
    return {
      email: data.email,
      name: data.name || data.email,
      picture: data.picture,
      email_verified: data.email_verified
    };
  } catch (error) {
    console.error('[verifyGoogleToken] Error:', error);
    return null;
  }
}

/**
 * Parse Cloudflare Access JWT (simple decoding without full verification)
 * In production, you should verify the JWT signature
 */
async function parseCloudflareAccessJWT(jwt) {
  try {
    // JWT format: header.payload.signature
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      console.error('[parseCloudflareAccessJWT] Invalid JWT format');
      return null;
    }
    
    // Decode the payload (base64url)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    return {
      email: payload.email || payload.sub || 'unknown@user',
      name: payload.name || payload.given_name || payload.family_name || payload.email || 'User',
      picture: payload.picture || null,
      email_verified: true
    };
  } catch (error) {
    console.error('[parseCloudflareAccessJWT] Error:', error);
    return null;
  }
}

/**
 * Extract cookie value by name
 */
function extractCookie(cookieHeader, name) {
  const match = cookieHeader.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
  return match ? match[2] : null;
}

/**
 * Create success response
 */
function createSuccessResponse(user) {
  return new Response(JSON.stringify(user), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private'
    }
  });
}

/**
 * Create error response
 */
function createErrorResponse() {
  return new Response(JSON.stringify({
    error: 'Unauthenticated',
    message: 'No valid authentication credentials found'
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private'
    }
  });
}
