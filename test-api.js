import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAPI() {
  console.log('🧪 Testing Google AI API...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }
  
  console.log('✅ API key found');
  
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    console.log('🔍 Testing with a simple text generation...');
    
    // Test with text generation first (uses fewer resources)
    const model = 'gemini-1.5-flash';
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: 'Hello, can you respond with just "API working"?',
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents,
    });
    
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    
    console.log('✅ API Response:', text);
    console.log('🎉 API is working! You can now try image generation.');
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    
    if (error.status === 429) {
      console.log('💡 Rate limit exceeded. Wait a few minutes and try again.');
    } else if (error.status === 401) {
      console.log('💡 Invalid API key. Please check your GEMINI_API_KEY.');
    } else if (error.status === 400) {
      console.log('💡 Bad request. The model or request format may be incorrect.');
    }
  }
}

testAPI();
