-- Cloudflare D1 Database Schema for Recipe Application
-- This schema uses JSON storage in the 'details' column for flexibility

-- Drop table if exists (for fresh setup)
DROP TABLE IF EXISTS recipes;

-- Create recipes table
CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  author TEXT DEFAULT 'Anonymous',
  details TEXT NOT NULL,  -- JSON column storing all dynamic recipe data
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create index on name for faster searching
CREATE INDEX idx_recipes_name ON recipes(name);

-- Create index on created_at for sorting
CREATE INDEX idx_recipes_created ON recipes(created_at DESC);

-- Sample data structure for 'details' JSON column:
-- {
--   "name": "Pasta Carbonara",
--   "author": "Chef Mario",
--   "cuisine": "Italian",
--   "difficulty": "Medium",
--   "prepTime": "15 minutes",
--   "cookTime": "20 minutes",
--   "servings": 4,
--   "description": "A classic Italian pasta dish...",
--   "ingredients": [
--     "400g spaghetti",
--     "200g pancetta",
--     "4 eggs",
--     "100g parmesan cheese",
--     "Black pepper",
--     "Salt"
--   ],
--   "instructions": [
--     "Boil pasta in salted water",
--     "Fry pancetta until crispy",
--     "Beat eggs with parmesan",
--     "Mix hot pasta with pancetta",
--     "Add egg mixture off heat",
--     "Season with black pepper"
--   ],
--   "tags": ["pasta", "italian", "comfort-food"],
--   "imageUrl": "https://example.com/carbonara.jpg",
--   "notes": "Best served immediately"
-- }

-- Example INSERT query:
-- INSERT INTO recipes (name, author, details) 
-- VALUES (
--   'Pasta Carbonara',
--   'Chef Mario',
--   json('{"cuisine":"Italian","difficulty":"Medium","prepTime":"15 minutes",...}')
-- );

-- Example SELECT query to extract JSON data:
-- SELECT 
--   id, 
--   name, 
--   author,
--   json_extract(details, '$.cuisine') as cuisine,
--   json_extract(details, '$.difficulty') as difficulty,
--   json_extract(details, '$.prepTime') as prepTime,
--   json_extract(details, '$.cookTime') as cookTime,
--   json_extract(details, '$.servings') as servings,
--   created_at
-- FROM recipes
-- ORDER BY created_at DESC;
