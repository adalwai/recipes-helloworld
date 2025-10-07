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
  
  // Log request IP and details
  const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  console.log('[/api/auth/me] ===== NEW REQUEST =====');
  console.log('[/api/auth/me] Request IP:', clientIP);
  console.log('[/api/auth/me] Request URL:', request.url);
  console.log('[/api/auth/me] Request method:', request.method);
  
  // First, try Bearer token authentication
  const authHeader = request.headers.get('Authorization');
  console.log('[/api/auth/me] Authorization header present:', !!authHeader);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('[/api/auth/me] Found Bearer token, attempting verification');
    console.log('[/api/auth/me] Token length:', token.length);
    console.log('[/api/auth/me] Token (first 50 chars):', token.substring(0, 50) + '...');
    
    try {
      const user = await verifyGoogleToken(token);
      if (user) {
        console.log('[/api/auth/me] Bearer token verified successfully');
        console.log('[/api/auth/me] User:', JSON.stringify(user));
        return createSuccessResponse(user);
      } else {
        console.log('[/api/auth/me] Bearer token verification returned null');
      }
    } catch (error) {
      console.error('[/api/auth/me] Bearer token verification failed:', error.message);
      console.error('[/api/auth/me] Error stack:', error.stack);
    }
  }
  
  // Fallback: Try Cloudflare Access JWT from cookies
  console.log('[/api/auth/me] Attempting cookie-based authentication');
  const cookieHeader = request.headers.get('Cookie');
  console.log('[/api/auth/me] Cookie header present:', !!cookieHeader);
  
  if (cookieHeader) {
    // Try to extract Cloudflare Access JWT cookie (CF_Authorization)
    const cfAccessJWT = extractCookie(cookieHeader, 'CF_Authorization');
    
    if (cfAccessJWT) {
      console.log('[/api/auth/me] Found Cloudflare Access JWT cookie');
      console.log('[/api/auth/me] CF JWT length:', cfAccessJWT.length);
      try {
        const user = await parseCloudflareAccessJWT(cfAccessJWT);
        if (user) {
          console.log('[/api/auth/me] Cloudflare Access JWT parsed successfully');
          console.log('[/api/auth/me] User:', JSON.stringify(user));
          return createSuccessResponse(user);
        }
      } catch (error) {
        console.error('[/api/auth/me] Cloudflare Access JWT parsing failed:', error.message);
        console.error('[/api/auth/me] Error stack:', error.stack);
      }
    }
    
    // Try to extract Google OAuth token from cookies
    const googleToken = extractCookie(cookieHeader, 'google_token') || extractCookie(cookieHeader, 'authToken');
    if (googleToken) {
      console.log('[/api/auth/me] Found Google token in cookies');
      console.log('[/api/auth/me] Google token length:', googleToken.length);
      try {
        const user = await verifyGoogleToken(googleToken);
        if (user) {
          console.log('[/api/auth/me] Cookie-based Google token verified successfully');
          console.log('[/api/auth/me] User:', JSON.stringify(user));
          return createSuccessResponse(user);
        }
      } catch (error) {
        console.error('[/api/auth/me] Cookie-based Google token verification failed:', error.message);
        console.error('[/api/auth/me] Error stack:', error.stack);
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
  console.log('[verifyGoogleToken] Starting token verification');
  console.log('[verifyGoogleToken] Token length:', token ? token.length : 0);
  
  try {
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`;
    console.log('[verifyGoogleToken] Calling Google API...');
    
    const response = await fetch(verifyUrl);
    console.log('[verifyGoogleToken] Google response status:', response.status);
    console.log('[verifyGoogleToken] Google response statusText:', response.statusText);
    
    if (!response.ok) {
      console.error('[verifyGoogleToken] Verification failed with status:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('[verifyGoogleToken] Google response data:', JSON.stringify(data, null, 2));
    
    // Check if token is valid and matches our client ID
    if (data.error) {
      console.error('[verifyGoogleToken] Google returned error:', data.error);
      console.error('[verifyGoogleToken] Error description:', data.error_description);
      return null;
    }
    
    if (data.aud !== CLIENT_ID) {
      console.error('[verifyGoogleToken] Invalid token or client ID mismatch');
      console.error('[verifyGoogleToken] Expected CLIENT_ID:', CLIENT_ID);
      console.error('[verifyGoogleToken] Received aud:', data.aud);
      return null;
    }
    
    const userInfo = {
      email: data.email,
      name: data.name || data.email,
      picture: data.picture,
      email_verified: data.email_verified
    };
    
    console.log('[verifyGoogleToken] Token verified successfully');
    return userInfo;
  } catch (error) {
    console.error('[verifyGoogleToken] EXCEPTION:', error.name);
    console.error('[verifyGoogleToken] Error message:', error.message);
    console.error('[verifyGoogleToken] Error stack:', error.stack);
    return null;
  }
}

/**
 * Parse Cloudflare Access JWT (simple decoding without full verification)
 * In production, you should verify the JWT signature
 */
async function parseCloudflareAccessJWT(jwt) {
  console.log('[parseCloudflareAccessJWT] Starting JWT parsing');
  try {
    // JWT format: header.payload.signature
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      console.error('[parseCloudflareAccessJWT] Invalid JWT format, parts:', parts.length);
      return null;
    }
    
    // Decode the payload (base64url)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    console.log('[parseCloudflareAccessJWT] Decoded payload:', JSON.stringify(payload, null, 2));
    
    return {
      email: payload.email || payload.sub || 'unknown@user',
      name: payload.name || payload.given_name || payload.family_name || payload.email || 'User',
      picture: payload.picture || null,
      email_verified: true
    };
  } catch (error) {
    console.error('[parseCloudflareAccessJWT] EXCEPTION:', error.name);
    console.error('[parseCloudflareAccessJWT] Error message:', error.message);
    console.error('[parseCloudflareAccessJWT] Error stack:', error.stack);
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
