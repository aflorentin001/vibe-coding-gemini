import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Initialize Google AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Helper function to save binary files
async function saveBinaryFile(fileName, content) {
  try {
    const outputDir = path.join(__dirname, 'public', 'generated');
    await fs.mkdir(outputDir, { recursive: true });
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, content);
    console.log(`File ${fileName} saved to ${filePath}`);
    return `/generated/${fileName}`;
  } catch (err) {
    console.error(`Error writing file ${fileName}:`, err);
    throw err;
  }
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
      const buffer = Buffer.from(inlineData.data || '', 'base64');
      
      const imagePath = await saveBinaryFile(`${fileName}.${fileExtension}`, buffer);
      results.push({
        type: 'image',
        url: imagePath,
        mimeType: inlineData.mimeType
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

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Google AI Image Generation Server is running',
    model: 'gemini-2.5-flash-image-preview'
  });
});

// Generate image from text prompt
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    console.log('Generating image for prompt:', prompt);

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
      return res.status(500).json({ error: 'No content generated' });
    }

    res.json({
      success: true,
      prompt,
      results
    });

  } catch (error) {
    console.error('Error generating image:', error);
    
    // Handle specific API errors
    if (error.status === 429) {
      res.status(429).json({ 
        error: 'API rate limit exceeded',
        details: 'You have exceeded the API rate limit. Please wait a few minutes and try again.',
        suggestion: 'Consider upgrading your API plan for higher limits.'
      });
    } else if (error.status === 401) {
      res.status(401).json({ 
        error: 'Invalid API key',
        details: 'Please check your GEMINI_API_KEY in the .env file.'
      });
    } else if (error.status === 400) {
      res.status(400).json({ 
        error: 'Invalid request',
        details: error.message || 'The request was malformed or invalid.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate image',
        details: error.message 
      });
    }
  }
});

// Manipulate uploaded image with text prompt
app.post('/api/manipulate-image', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const imageFile = req.file;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    console.log('Manipulating image with prompt:', prompt);

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
              mimeType: imageFile.mimetype,
              data: imageFile.buffer.toString('base64')
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
      return res.status(500).json({ error: 'No content generated' });
    }

    res.json({
      success: true,
      prompt,
      originalImage: {
        name: imageFile.originalname,
        size: imageFile.size,
        mimeType: imageFile.mimetype
      },
      results
    });

  } catch (error) {
    console.error('Error manipulating image:', error);
    
    // Handle specific API errors
    if (error.status === 429) {
      res.status(429).json({ 
        error: 'API rate limit exceeded',
        details: 'You have exceeded the API rate limit. Please wait a few minutes and try again.',
        suggestion: 'Consider upgrading your API plan for higher limits.'
      });
    } else if (error.status === 401) {
      res.status(401).json({ 
        error: 'Invalid API key',
        details: 'Please check your GEMINI_API_KEY in the .env file.'
      });
    } else if (error.status === 400) {
      res.status(400).json({ 
        error: 'Invalid request',
        details: error.message || 'The request was malformed or invalid.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to manipulate image',
        details: error.message 
      });
    }
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({ error: 'Only image files are allowed!' });
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Google AI Image Generation Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎨 Image Generation: POST /api/generate-image`);
  console.log(`🖼️  Image Manipulation: POST /api/manipulate-image`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  WARNING: GEMINI_API_KEY not found in environment variables');
    console.warn('   Please create a .env file with your Google AI API key');
  }
});
