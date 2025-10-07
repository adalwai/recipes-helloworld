// Cloudflare Pages Function for verifying Google OAuth2 tokens
export async function onRequestPost(context) {
  const { request } = context;
  
  // Log request IP
  const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  console.log('[verify-google.js] ===== NEW REQUEST =====');
  console.log('[verify-google.js] Request IP:', clientIP);
  console.log('[verify-google.js] Request URL:', request.url);
  console.log('[verify-google.js] Request method:', request.method);
  
  try {
    const body = await request.json();
    const { token } = body;
    
    console.log('[verify-google.js] Request body received:', JSON.stringify(body));
    console.log('[verify-google.js] Token present:', !!token);
    console.log('[verify-google.js] Token length:', token ? token.length : 0);
    console.log('[verify-google.js] Token (first 50 chars):', token ? token.substring(0, 50) + '...' : 'N/A');
    
    if (!token) {
      console.error('[verify-google.js] ERROR: No token provided in request');
      return new Response(JSON.stringify({
        success: false,
        error: 'No token provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify the token with Google
    const CLIENT_ID = '184950928765-22nhslddgetmmnfl8kl728n6fv0bg7hu.apps.googleusercontent.com';
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`;
    
    console.log('[verify-google.js] Calling Google tokeninfo API...');
    console.log('[verify-google.js] Verify URL:', verifyUrl.substring(0, 100) + '...');
    
    const verifyResponse = await fetch(verifyUrl);
    console.log('[verify-google.js] Google response status:', verifyResponse.status);
    console.log('[verify-google.js] Google response statusText:', verifyResponse.statusText);
    
    const verifyData = await verifyResponse.json();
    console.log('[verify-google.js] Google response data:', JSON.stringify(verifyData, null, 2));
    
    // Check if token is valid and matches our client ID
    if (verifyData.error) {
      console.error('[verify-google.js] ERROR: Google returned error:', verifyData.error);
      console.error('[verify-google.js] Error description:', verifyData.error_description);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid token: ' + verifyData.error
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (verifyData.aud !== CLIENT_ID) {
      console.error('[verify-google.js] ERROR: Client ID mismatch');
      console.error('[verify-google.js] Expected CLIENT_ID:', CLIENT_ID);
      console.error('[verify-google.js] Received aud:', verifyData.aud);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid token: client ID mismatch'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Token is valid, return user information
    const userInfo = {
      email: verifyData.email,
      name: verifyData.name,
      picture: verifyData.picture,
      email_verified: verifyData.email_verified
    };
    
    console.log('[verify-google.js] SUCCESS: Token verified successfully');
    console.log('[verify-google.js] User info:', JSON.stringify(userInfo));
    
    return new Response(JSON.stringify({
      success: true,
      user: userInfo
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[verify-google.js] EXCEPTION: Caught error during verification');
    console.error('[verify-google.js] Error name:', error.name);
    console.error('[verify-google.js] Error message:', error.message);
    console.error('[verify-google.js] Error stack:', error.stack);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Server error during verification: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
