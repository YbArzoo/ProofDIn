const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Load your .env variables
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY is missing from .env");
    return;
  }

  console.log("------------------------------------------------");
  console.log("🔍 Checking available Gemini models...");
  console.log("------------------------------------------------");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We need to use the model manager to list models, but the JS SDK 
    // simplifies this. We will try to fetch the list via a raw request if needed,
    // but first let's try a standard model generation to see the specific error
    // or just assume we need to find the name.
    
    // Actually, the JS SDK doesn't have a simple "listModels" method exposed 
    // in the high-level helpers in older versions, but we can hit the REST API directly
    // to be 100% sure.
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("❌ API Error:", data.error.message);
      return;
    }

    if (!data.models) {
      console.log("⚠️ No models found.");
      return;
    }

    console.log("✅ AVAILABLE MODELS (Use one of these 'name' values):");
    console.log("");

    const validModels = data.models.filter(m => 
      m.supportedGenerationMethods.includes("generateContent")
    );

    validModels.forEach(model => {
      // The name comes like "models/gemini-pro", we usually just need "gemini-pro"
      const shortName = model.name.replace("models/", "");
      console.log(`🔹 NAME: ${shortName}`);
      console.log(`   Full ID: ${model.name}`);
      console.log(`   Description: ${model.displayName}`);
      console.log("------------------------------------------------");
    });

    if (validModels.length === 0) {
        console.log("❌ No text generation models found for this API Key.");
    }

  } catch (error) {
    console.error("❌ Script Error:", error.message);
  }
}

listAvailableModels();