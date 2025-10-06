// Cloudflare Pages Function for verifying Google OAuth2 tokens
export async function onRequestPost(context) {
  try {
    const { request } = context;
    const { token } = await request.json();

    if (!token) {
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
    
    const verifyResponse = await fetch(verifyUrl);
    const verifyData = await verifyResponse.json();

    // Check if token is valid and matches our client ID
    if (verifyData.error || verifyData.aud !== CLIENT_ID) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid token'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Token is valid, return user information
    return new Response(JSON.stringify({
      success: true,
      user: {
        email: verifyData.email,
        name: verifyData.name,
        picture: verifyData.picture,
        email_verified: verifyData.email_verified
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Server error during verification'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
