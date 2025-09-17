import { GoogleGenAI } from '@google/genai';
import mime from 'mime';

// Helper function to process AI response and extract images
async function processAIResponse(response, baseFileName = 'generated_image') {
  const results = [];
  let fileIndex = 0;
  
  for await (const chunk of response) {
    if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
      continue;
    }
    
    if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const fileName = `${baseFileName}_${Date.now()}_${fileIndex++}`;
      const inlineData = chunk.candidates[0].content.parts[0].inlineData;
      const fileExtension = mime.getExtension(inlineData.mimeType || 'image/png');
      
      // For Netlify, we'll return the base64 data directly instead of saving files
      results.push({
        type: 'image',
        data: inlineData.data,
        mimeType: inlineData.mimeType,
        filename: `${fileName}.${fileExtension}`
      });
    } else if (chunk.text) {
      results.push({
        type: 'text',
        content: chunk.text
      });
    }
  }
  
  return results;
}

export const handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    
    if (!prompt) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    if (!process.env.GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
      };
    }

    console.log('Generating image for prompt:', prompt);

    // Initialize Google AI
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    };
    
    const model = 'gemini-2.5-flash-image-preview';
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    const results = await processAIResponse(response, 'text_to_image');
    
    if (results.length === 0) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'No content generated' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        prompt,
        results
      }),
    };

  } catch (error) {
    console.error('Error generating image:', error);
    
    // Handle specific API errors
    if (error.status === 429) {
      return {
        statusCode: 429,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'API rate limit exceeded',
          details: 'You have exceeded the API rate limit. Please wait a few minutes and try again.',
          suggestion: 'Consider upgrading your API plan for higher limits.'
        }),
      };
    } else if (error.status === 401) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Invalid API key',
          details: 'Please check your GEMINI_API_KEY in the environment variables.'
        }),
      };
    } else if (error.status === 400) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Invalid request',
          details: error.message || 'The request was malformed or invalid.'
        }),
      };
    } else {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Failed to generate image',
          details: error.message
        }),
      };
    }
  }
};
