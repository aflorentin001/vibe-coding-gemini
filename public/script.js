class GoogleAIImageApp {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.checkServerHealth();
    }

    initializeElements() {
        // Tab elements
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabContents = document.querySelectorAll('.tab-content');

        // Generate tab elements
        this.generatePrompt = document.getElementById('generatePrompt');
        this.generateBtn = document.getElementById('generateBtn');

        // Manipulate tab elements
        this.uploadArea = document.getElementById('uploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.uploadedImageContainer = document.getElementById('uploadedImageContainer');
        this.uploadedImage = document.getElementById('uploadedImage');
        this.removeImageBtn = document.getElementById('removeImage');
        this.manipulatePrompt = document.getElementById('manipulatePrompt');
        this.manipulateBtn = document.getElementById('manipulateBtn');

        // Common elements
        this.loading = document.getElementById('loading');
        this.results = document.getElementById('results');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.clearResultsBtn = document.getElementById('clearResults');
        this.error = document.getElementById('error');
        this.errorText = document.getElementById('errorText');
        this.closeErrorBtn = document.getElementById('closeError');

        // State
        this.uploadedFile = null;
    }

    bindEvents() {
        // Tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        // Generate image
        this.generateBtn.addEventListener('click', () => this.generateImage());
        this.generatePrompt.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.generateImage();
            }
        });

        // File upload
        this.uploadArea.addEventListener('click', () => this.imageInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.removeImageBtn.addEventListener('click', () => this.removeUploadedImage());

        // Manipulate image
        this.manipulateBtn.addEventListener('click', () => this.manipulateImage());
        this.manipulatePrompt.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.manipulateImage();
            }
        });

        // Results
        this.clearResultsBtn.addEventListener('click', () => this.clearResults());

        // Error handling
        this.closeErrorBtn.addEventListener('click', () => this.hideError());
    }

    async checkServerHealth() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            console.log('Server health:', data);
        } catch (error) {
            console.error('Server health check failed:', error);
            this.showError('Unable to connect to the server. Please make sure the server is running.');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        // Update tab contents
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    handleFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file.');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size must be less than 10MB.');
            return;
        }

        this.uploadedFile = file;
        
        // Display the uploaded image
        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedImage.src = e.target.result;
            this.uploadedImageContainer.style.display = 'block';
            this.uploadArea.style.display = 'none';
            this.manipulateBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    removeUploadedImage() {
        this.uploadedFile = null;
        this.uploadedImage.src = '';
        this.uploadedImageContainer.style.display = 'none';
        this.uploadArea.style.display = 'block';
        this.manipulateBtn.disabled = true;
        this.imageInput.value = '';
    }

    async generateImage() {
        const prompt = this.generatePrompt.value.trim();
        
        if (!prompt) {
            this.showError('Please enter a prompt to generate an image.');
            return;
        }

        this.showLoading();
        this.hideError();

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate image');
            }

            this.displayResults(data);
        } catch (error) {
            console.error('Error generating image:', error);
            let errorMessage = 'Failed to generate image. Please try again.';
            
            if (error.message.includes('429') || error.message.includes('rate limit')) {
                errorMessage = 'API rate limit exceeded. Please wait a few minutes and try again.';
            } else if (error.message.includes('401') || error.message.includes('API key')) {
                errorMessage = 'Invalid API key. Please check your configuration.';
            }
            
            this.showError(errorMessage);
        } finally {
            this.hideLoading();
        }
    }

    async manipulateImage() {
        const prompt = this.manipulatePrompt.value.trim();
        
        if (!prompt) {
            this.showError('Please enter a prompt to manipulate the image.');
            return;
        }

        if (!this.uploadedFile) {
            this.showError('Please upload an image first.');
            return;
        }

        this.showLoading();
        this.hideError();

        try {
            const formData = new FormData();
            formData.append('image', this.uploadedFile);
            formData.append('prompt', prompt);

            const response = await fetch('/api/manipulate-image', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to manipulate image');
            }

            this.displayResults(data);
        } catch (error) {
            console.error('Error manipulating image:', error);
            let errorMessage = 'Failed to manipulate image. Please try again.';
            
            if (error.message.includes('429') || error.message.includes('rate limit')) {
                errorMessage = 'API rate limit exceeded. Please wait a few minutes and try again.';
            } else if (error.message.includes('401') || error.message.includes('API key')) {
                errorMessage = 'Invalid API key. Please check your configuration.';
            }
            
            this.showError(errorMessage);
        } finally {
            this.hideLoading();
        }
    }

    displayResults(data) {
        this.resultsContainer.innerHTML = '';
        
        if (!data.results || data.results.length === 0) {
            this.showError('No results were generated. Please try again.');
            return;
        }

        data.results.forEach((result, index) => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item';

            if (result.type === 'image') {
                // For Netlify deployment, images are returned as base64 data
                const imageUrl = result.url || `data:${result.mimeType};base64,${result.data}`;
                const filename = result.filename || `generated_image_${Date.now()}.png`;
                
                resultElement.innerHTML = `
                    <img src="${imageUrl}" alt="Generated image ${index + 1}" loading="lazy">
                    <div class="result-info">
                        <div class="result-type">Generated Image</div>
                        <div class="result-content">
                            <strong>Prompt:</strong> ${data.prompt}
                        </div>
                        <button class="download-btn" onclick="this.downloadImage('${imageUrl}', '${filename}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                `;
                
                // Add download functionality
                const downloadBtn = resultElement.querySelector('.download-btn');
                downloadBtn.addEventListener('click', () => this.downloadImage(imageUrl, filename));
            } else if (result.type === 'text') {
                resultElement.innerHTML = `
                    <div class="result-info">
                        <div class="result-type">Generated Text</div>
                        <div class="result-content">${result.content}</div>
                    </div>
                `;
            }

            this.resultsContainer.appendChild(resultElement);
        });

        this.results.style.display = 'block';
        this.results.scrollIntoView({ behavior: 'smooth' });
    }

    downloadImage(imageUrl, filename) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    clearResults() {
        this.resultsContainer.innerHTML = '';
        this.results.style.display = 'none';
    }

    showLoading() {
        this.loading.style.display = 'block';
        this.generateBtn.disabled = true;
        this.manipulateBtn.disabled = true;
    }

    hideLoading() {
        this.loading.style.display = 'none';
        this.generateBtn.disabled = false;
        this.manipulateBtn.disabled = !this.uploadedFile;
    }

    showError(message) {
        this.errorText.textContent = message;
        this.error.style.display = 'flex';
        this.error.scrollIntoView({ behavior: 'smooth' });
    }

    hideError() {
        this.error.style.display = 'none';
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GoogleAIImageApp();
});

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key to close error messages
    if (e.key === 'Escape') {
        const error = document.getElementById('error');
        if (error.style.display !== 'none') {
            error.style.display = 'none';
        }
    }
});
