# Google AI Image Generator

A modern web application for AI-powered image generation and manipulation using Google's Gemini 2.5 Flash Image Preview model.

## Features

### 🎨 Image Generation
- Generate images from text prompts using Google's latest AI model
- Support for detailed and creative prompts
- High-quality image output with automatic file saving

### 🖼️ Image Manipulation
- Upload your own images (JPG, PNG, GIF, WebP)
- Modify images using natural language prompts
- Drag-and-drop file upload interface
- File size validation (up to 10MB)

### 🌟 Modern UI/UX
- Responsive design that works on all devices
- Beautiful gradient backgrounds and modern styling
- Real-time loading indicators
- Error handling with user-friendly messages
- Tabbed interface for easy navigation

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Google Generative AI** - AI image generation
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Frontend
- **HTML5** - Modern semantic markup
- **CSS3** - Advanced styling with gradients and animations
- **Vanilla JavaScript** - Interactive functionality
- **Font Awesome** - Icon library

### AI Model
- **Gemini 2.5 Flash Image Preview** - Google's latest image generation model

## Installation & Deployment

### Local Development

1. **Clone or download the project**
   ```bash
   cd VibeCoding1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Get your Google AI API key**
   - Visit [Google AI Studio](https://ai.google.dev/)
   - Create a new project or use an existing one
   - Generate an API key

4. **Configure environment variables**
   - Open the `.env` file
   - Replace `your_google_ai_api_key_here` with your actual API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

5. **Start the server**
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Start generating and manipulating images!

### Netlify Deployment

This app is configured for easy deployment to Netlify with serverless functions:

1. **Push to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Deploy to Netlify**
   - Go to [Netlify](https://netlify.com) and sign in
   - Click "New site from Git"
   - Connect your GitHub repository
   - Build settings are automatically configured via `netlify.toml`

3. **Configure Environment Variables**
   - In your Netlify dashboard, go to Site settings > Environment variables
   - Add a new variable:
     - **Name**: `GEMINI_API_KEY`
     - **Value**: Your Google AI API key

4. **Deploy**
   - Netlify will automatically build and deploy your site
   - Your app will be available at your Netlify URL (e.g., `https://your-site-name.netlify.app`)

### Netlify Features
- ✅ **Serverless Functions**: API endpoints run as serverless functions
- ✅ **Automatic HTTPS**: Secure by default
- ✅ **CDN**: Global content delivery
- ✅ **Continuous Deployment**: Auto-deploy on git push

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns server status and model information

### Generate Image
- **POST** `/api/generate-image`
- Body: `{ "prompt": "your text prompt" }`
- Generates images from text descriptions

### Manipulate Image
- **POST** `/api/manipulate-image`
- Form data with `image` file and `prompt` text
- Modifies uploaded images based on text instructions

## Usage Examples

### Text-to-Image Generation
```
"A majestic dragon flying over a medieval castle at sunset"
"A futuristic city with flying cars and neon lights"
"A peaceful garden with cherry blossoms and a small pond"
```

### Image Manipulation
```
"Add a rainbow in the background"
"Change the colors to sepia tone"
"Add snow falling from the sky"
"Make it look like a vintage photograph"
```

## Project Structure

```
VibeCoding1/
├── server.js              # Main Express server (for local development)
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (local)
├── .env.example          # Environment variables template
├── netlify.toml          # Netlify configuration
├── README.md             # This file
├── test-env.js           # Original Google AI code snippet
├── netlify/              # Netlify serverless functions
│   └── functions/        
│       ├── health.js     # Health check endpoint
│       ├── generate-image.js  # Image generation endpoint
│       └── manipulate-image.js # Image manipulation endpoint
├── public/               # Frontend files (static site)
│   ├── index.html        # Main HTML page
│   ├── styles.css        # CSS styling
│   ├── script.js         # JavaScript functionality
│   └── generated/        # Generated images storage (local only)
└── node_modules/         # Dependencies
```

## Features in Detail

### Image Generation
- Uses Google's Gemini 2.5 Flash Image Preview model
- Supports creative and detailed prompts
- Automatic file naming with timestamps
- Base64 to binary conversion for image storage

### Image Manipulation
- Upload validation for image files only
- File size limits to prevent server overload
- Combines uploaded image with text prompts
- Maintains original image context while applying modifications

### Error Handling
- Comprehensive error messages for users
- Server-side validation and sanitization
- Client-side file validation
- Network error handling with retry suggestions

### Security Features
- File type validation
- File size limits
- CORS configuration
- Environment variable protection

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance Considerations

- Images are processed server-side to reduce client load
- Automatic cleanup of temporary files
- Optimized file serving with Express static middleware
- Responsive images with lazy loading

## Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY not configured" error**
   - Make sure you've added your API key to the `.env` file
   - Restart the server after updating environment variables

2. **Images not generating**
   - Check your API key is valid and has sufficient quota
   - Verify your internet connection
   - Try with simpler prompts first

3. **File upload not working**
   - Ensure the file is a valid image format
   - Check that the file size is under 10MB
   - Try a different image file

4. **Server won't start**
   - Make sure port 3000 is available
   - Check that all dependencies are installed
   - Verify Node.js version compatibility

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Look at the server logs in your terminal
3. Verify your API key and internet connection
4. Try with different prompts or images

## License

This project is for educational purposes. Please respect Google's API terms of service and usage limits.

## Acknowledgments

- Built using Google's Generative AI API
- Inspired by modern web design principles
- Font Awesome for beautiful icons
- Express.js community for excellent documentation

---

**Enjoy creating amazing AI-generated images! 🎨✨**
