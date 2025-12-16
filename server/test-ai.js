const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

async function testModels() {
  console.log("🔍 Diagnosing AI Connection...\n");
  
  // List of common model names to try
  const candidates = [
      "gemini-1.5-flash", 
      "gemini-pro", 
      "gemini-1.0-pro", 
      "gemini-1.5-pro",
      "gemini-1.5-flash-latest"
  ];

  for (const modelName of candidates) {
    try {
      process.stdout.write(`Testing model: '${modelName}' ... `);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'AI Connected'");
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ SUCCESS!`);
      console.log(`\n🎉 YOUR WORKING MODEL IS: "${modelName}"`);
      console.log(`Response from Google: ${text}`);
      return; // Stop after finding a working one
    } catch (error) {
      console.log(`❌ Failed (404 or Error)`);
    }
  }

  console.log("\n⚠️ All models failed. This usually means:");
  console.log("1. The API Key in .env is incorrect.");
  console.log("2. The 'Generative Language API' is not enabled in Google Cloud Console.");
  console.log("3. Your region (Bangladesh) might need a specific proxy or VPN for the API.");
}

testModels();