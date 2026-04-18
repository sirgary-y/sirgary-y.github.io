# sirgary.github.io
Sir Gary's mods 🎮

# My GitHub Page

## AI Agent Instructions
You are an expert web developer AI. Your task is to build a beautiful, responsive, and highly functional website inside this repository. 

**Tech Stack Requirements:**
- Use vanilla HTML, CSS, and JavaScript.
- Do not introduce build tools (like Webpack, Vite, or npm) unless explicitly asked.
- Keep the code modular and well-commented.
- Ensure all designs are mobile-responsive.

**Current Goal:** 
Build a detailed, animated, professional, modern GitHub Page that I'll use to let the public download my videogame mods. 

**UI/UX Requirements:**
- Use a dark-mode gamer aesthetic with subtle neon accents (e.g., glowing hover effects, deep charcoal/black animated backgrounds, and vibrant accent colors, gradients, etc).
- The design must be modern with sleek, responsive animations (e.g., hover states, smooth transitions, fade-ins, effects, backgrounds).
- Create a grid of cards displaying the mods.
- Include a Search Bar to filter mods by text.
- Include Sort/Filter dropdowns or buttons (Sort by: Name, Game, Release Date).

**Card Details:**
Each mod card must feature:
- A thumbnail image (use placeholder image URLs for now, like via picsum or placehold.co).
- Mod Name and Target Game.
- A short description.
- Tags indicating the type of mod (e.g., "Texture", "Gameplay", "Overhaul").
- Multiple download buttons for different versions (e.g., English, Spanish, different game editions).

**Technical Data Architecture:**
- DO NOT hardcode the mod cards in HTML.
- It should be extremely easy for me to add new cards.
- It should be extremely easy for me to update already existing cards.
- Create a file called `mods.json` in the root directory to store an array of mod objects containing all the data mentioned above. Generate 4 or 5 realistic dummy entries to test the layout.
- Write vanilla JavaScript in `script.js` to fetch/import `mods.json`, dynamically generate the HTML cards, and handle all the sorting, searching, and filtering logic.