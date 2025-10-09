// /api/recipe - Get a single recipe by ID
// Always returns valid JSON (never HTML)

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  // Helper to return JSON response
  const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  };

  // Check if ID is provided
  if (!id) {
    return jsonResponse({ error: 'Recipe ID is required' }, 400);
  }

  try {
    // Verify authentication
    const sessionCookie = request.headers.get('Cookie')?.match(/session=([^;]+)/);
    if (!sessionCookie) {
      return jsonResponse({ error: 'not authorized' }, 401);
    }

    const sessionId = sessionCookie[1];
    const sessionData = await env.RECIPES_KV.get(`session:${sessionId}`, 'json');
    
    if (!sessionData || !sessionData.userId) {
      return jsonResponse({ error: 'not authorized' }, 401);
    }

    // Fetch recipe from database
    const recipe = await env.RECIPES_DB.prepare(
      'SELECT * FROM recipes WHERE id = ? AND user_id = ?'
    ).bind(id, sessionData.userId).first();

    if (!recipe) {
      return jsonResponse({ error: 'not found' }, 404);
    }

    // Return the recipe
    return jsonResponse({
      id: recipe.id,
      title: recipe.title,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      created_at: recipe.created_at
    });

  } catch (error) {
    console.error('Error fetching recipe:', error);
    return jsonResponse({ error: 'internal server error' }, 500);
  }
}
