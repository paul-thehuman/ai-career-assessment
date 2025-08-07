export default async function handler(request, response) {
  // Allow CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // Get the secret API key
  const secretApiKey = process.env.MY_SECRET_API_KEY;

  if (!secretApiKey) {
    return response.status(500).json({ message: 'API key not configured' });
  }

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${secretApiKey}`;
    const payload = request.body;

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const aiData = await aiResponse.json();
    response.status(200).json(aiData);

  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ message: 'Error communicating with AI' });
  }
}