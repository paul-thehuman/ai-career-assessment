const callGeminiAPI = async (prompt, isStructured = false, schema = null, setLoadingState = null) => {
  if (setLoadingState) setLoadingState(true);

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: isStructured && schema ? {
      responseMimeType: "application/json",
      responseSchema: schema
    } : {}
  };

  try {
    const response = await fetch('/api/generateReport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log("API raw response:", result);

    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      let text = result.candidates[0].content.parts[0].text;
      console.log("API response text:", text);
      if (isStructured) {
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse JSON response:", e, text);
          return null;
        }
      }
      return text;
    } else {
      console.error("Unexpected API response structure:", result);
      return "Error: Could not generate content. Please try again.";
    }
  } catch (error) {
    console.error("Error calling API:", error);
    return "Error: Failed to connect to AI. Please check your network.";
  } finally {
    if (setLoadingState) setLoadingState(false);
  }
};