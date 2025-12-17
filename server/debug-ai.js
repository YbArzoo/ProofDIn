// server/debug-ai.js
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function checkConnection() {
    console.log("---------------------------------------------------");
    console.log("📡 DIAGNOSTIC: Testing Direct Connection to Google...");
    console.log("---------------------------------------------------");

    if (!API_KEY) {
        console.error("❌ ERROR: GEMINI_API_KEY is missing from .env");
        return;
    }

    try {
        const response = await fetch(URL);
        const data = await response.json();

        if (response.ok) {
            console.log("✅ SUCCESS! Connected to Google.");
            console.log("Available Models for your Key:");
            console.log(data.models.map(m => m.name).join("\n"));
            console.log("---------------------------------------------------");
            console.log("👉 USE THIS MODEL NAME IN YOUR CODE:", data.models[0].name.replace('models/', ''));
        } else {
            console.error("❌ GOOGLE REFUSED CONNECTION:");
            console.error(data);
        }
    } catch (error) {
        console.error("❌ NETWORK ERROR (Likely Firewall/ISP Block):");
        console.error(error.message);
        console.log("\n⚠️ SOLUTION: You are likely on a University Network.");
        console.log("   Please turn on a VPN (connect to USA or Singapore) and try again.");
    }
}

checkConnection();