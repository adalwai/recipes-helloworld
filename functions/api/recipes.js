// Cloudflare Pages Function - Recipe API
// Path: /api/recipes
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const contentType = request.headers.get('content-type');
    
    // Parse incoming data
    let recipeData;
    if (contentType && contentType.includes('application/json')) {
      recipeData = await request.json();
    } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      recipeData = Object.fromEntries(formData);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate that recipe has at least a name, title, or recipeName
    if (!recipeData.name && !recipeData.title && !recipeData.recipeName) {
      return new Response(JSON.stringify({ error: 'Recipe name, title, or recipeName is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extract title for dedicated column - support recipeName, name, or title
    const title = recipeData.recipeName || recipeData.name || recipeData.title || 'Untitled Recipe';
    
    // Store all dynamic fields as JSON in details column
    const details = JSON.stringify(recipeData);
    
    // Insert into D1 database - use title, details, and created_at columns
    const result = await env.DB.prepare(
      'INSERT INTO recipes (title, details, created_at) VALUES (?, ?, datetime("now"))'
    )
    .bind(title, details)
    .run();
    
    if (!result.success) {
      throw new Error('Failed to insert recipe');
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Recipe saved successfully' 
    }), {
      status: 201,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Error saving recipe:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to save recipe',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // If ID provided, get single recipe
    if (id) {
      const result = await env.DB.prepare(
        'SELECT id, title, details, created_at FROM recipes WHERE id = ?'
      )
      .bind(id)
      .first();
      
      if (!result) {
        return new Response(JSON.stringify({ error: 'Recipe not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Parse details JSON and merge with base fields
      const details = JSON.parse(result.details);
      const recipe = {
        id: result.id,
        title: result.title,
        recipeName: result.title,  // Add recipeName for compatibility
        created_at: result.created_at,
        ...details
      };
      
      return new Response(JSON.stringify(recipe), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Otherwise, list all recipes with summary data
    const { results } = await env.DB.prepare(
      'SELECT id, title, details, created_at FROM recipes ORDER BY created_at DESC'
    )
    .all();
    
    // Extract summary data using title column directly
    const recipes = results.map(row => {
      const details = JSON.parse(row.details);
      return {
        id: row.id,
        name: row.title || 'Untitled Recipe',
        title: row.title || 'Untitled Recipe',  // Add title for compatibility
        recipeName: row.title || 'Untitled Recipe',  // Add recipeName for compatibility
        author: details.author || 'Anonymous',
        created_at: row.created_at,
        summary: {
          cuisine: details.cuisine || null,
          difficulty: details.difficulty || null,
          prepTime: details.prepTime || details.prep_time || null,
          cookTime: details.cookTime || details.cook_time || null,
          servings: details.servings || null,
          description: details.description ? details.description.substring(0, 100) : null
        }
      };
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      count: recipes.length,
      recipes 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch recipes',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
