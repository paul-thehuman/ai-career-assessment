// This is the CORRECT code for your serverless function: api/generateReport.js

export default async function handler(request, response) {
  // Allow your website to call this function (CORS)
  response.setHeader('Access-Control-Allow-Origin', '*');

  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // Get the secret Google API key from Vercel's environment variables
  const secretApiKey = process.env.MY_SECRET_API_KEY;

  if (!secretApiKey) {
    return response.status(500).json({ message: 'API key not configured on the server' });
  }

  // --- Call the Google Gemini API ---
  // This section is now tailored to your exact setup.
  try {
    // 1. Re-create the correct Google API URL, adding the secret key safely on the server
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${secretApiKey}`;

    // 2. Use the data your website sent as the payload
    const payload = request.body;

    // 3. Call the Google API
    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const aiData = await aiResponse.json();

    // 4. Send the final response back to your website
    response.status(200).json(aiData);

  } catch (error) {
    console.error("Error communicating with Google API:", error);
    response.status(500).json({ message: 'Error communicating with Google API' });
  }
}