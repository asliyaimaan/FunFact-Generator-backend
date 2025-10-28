//Loading the dependencies
require('dotenv').config(); //Load API key from .env
const express=require('express');
const axios=require('axios');
const path=require('path');
const app=express();
const PORT=3000;

//Serve static frontend files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

//Defining a route using express
app.get('/funfact', async (req, res) => {
  try {
    //Read theme from query string, default to "random" if not provided
    let theme=(req.query.theme || 'random').toLowerCase();

    //Load API key from .env
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY not found in .env file.");
    }

    //Correct Gemini API endpoint for generateContent
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Send the request to gemini
    const response = await axios.post(
      endpoint,
      {
        contents: [
          {
            parts: [
              { text: `Give me 5 short ${theme} fun facts, numbered.` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7, //Control randomness
          maxOutputTokens: 500 //Limit the response length
        }
      },
      {
         headers: {
           'Content-Type': 'application/json'
         }
      }
    );

    //Extract the actual text content from the complex JSON response
    const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || ''; 
    console.log("Raw text from API:", rawText);

    //Split by numbered items. The first item will be the intro
    let facts = rawText
      .split(/(?:\r?\n|^)\s*\d+\.\s*/) //Split by newline/start of string, followed by a number and a dot.
      .map(f => f.trim()); //Trim whitespace from all resulting elements

    //Remove the first element which is the intro
    facts.shift(); 
    
    //Ensure we only keep valid, non-empty facts, up to 5.
    facts = facts
      .filter(f => f.length > 5) //Keep facts longer than 5 characters
      .slice(0, 5); //Ensure we only send a maximum of 5 facts.

    console.log("Processed facts (after shift):", facts);

    //If fewer than 5 facts were parsed, provide fallback
    if (facts.length === 0) {
      facts.push(`No facts found for ${theme}. Please try again.`);
    }

    //Send JSON back to frontend
    res.json({ theme, facts });
  } catch (error) {
    console.error('Error fetching fun fact:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch fun facts' });
  }
});

//Server Listener
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});