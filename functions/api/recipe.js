// /api/recipe - Get a single recipe by ID
// Always returns valid JSON (never HTML)
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  // Helper to convert snake_case to camelCase
  const toCamelCase = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase);
    
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {});
  };

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
    // Fetch recipe from database (matching recipes.js schema)
    const result = await env.DB.prepare(
      'SELECT id, title, category, details, created_at FROM recipes WHERE id = ?'
    )
    .bind(id)
    .first();

    if (!result) {
      return jsonResponse({ error: 'not found' }, 404);
    }

    // Parse details JSON and merge with base fields (same as recipes.js)
    const details = JSON.parse(result.details);
    
    // Convert all snake_case fields to camelCase
    const camelDetails = toCamelCase(details);
    
    const recipe = {
      id: result.id,
      name: result.title,  // Frontend expects 'name'
      title: result.title,
      recipeName: result.title,
      category: result.category,
      createdAt: result.created_at,  // Convert to camelCase
      ...camelDetails  // Spread all other fields from details JSON (now in camelCase)
    };

    return jsonResponse(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return jsonResponse({ error: 'internal server error' }, 500);
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
