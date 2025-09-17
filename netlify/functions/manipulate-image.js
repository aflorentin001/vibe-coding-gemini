import { GoogleGenAI } from '@google/genai';
import mime from 'mime';

// Helper function to parse multipart form data
function parseMultipartFormData(body, boundary) {
  const parts = body.split(`--${boundary}`);
  const formData = {};
  
  for (const part of parts) {
    if (part.includes('Content-Disposition')) {
      const nameMatch = part.match(/name="([^"]+)"/);
      if (nameMatch) {
        const fieldName = nameMatch[1];
        
        if (fieldName === 'image') {
          // Extract image data
          const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
          const mimeType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
          
          // Find the start of binary data (after double CRLF)
          const dataStart = part.indexOf('\r\n\r\n') + 4;
          const dataEnd = part.lastIndexOf('\r\n');
          
          if (dataStart > 3 && dataEnd > dataStart) {
            const binaryData = part.slice(dataStart, dataEnd);
            formData.image = {
              data: Buffer.from(binaryData, 'binary').toString('base64'),
              mimeType: mimeType
            };
          }
        } else {
          // Extract text field
          const dataStart = part.indexOf('\r\n\r\n') + 4;
          const dataEnd = part.lastIndexOf('\r\n');
          
          if (dataStart > 3 && dataEnd > dataStart) {
            formData[fieldName] = part.slice(dataStart, dataEnd);
          }
        }
      }
    }
  }
  
  return formData;
}

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
    // Parse multipart form data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      };
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Missing boundary in Content-Type' }),
      };
    }

    // Parse the form data
    const formData = parseMultipartFormData(event.body, boundary);
    const prompt = formData.prompt;
    const imageFile = formData.image;
    
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
    
    if (!imageFile) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Image file is required' }),
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

    console.log('Manipulating image with prompt:', prompt);

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
            text: `Based on the uploaded image, ${prompt}`,
          },
          {
            inlineData: {
              mimeType: imageFile.mimeType,
              data: imageFile.data
            }
          }
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    const results = await processAIResponse(response, 'image_manipulation');
    
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
        originalImage: {
          mimeType: imageFile.mimeType
        },
        results
      }),
    };

  } catch (error) {
    console.error('Error manipulating image:', error);
    
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
          error: 'Failed to manipulate image',
          details: error.message
        }),
      };
    }
  }
};
