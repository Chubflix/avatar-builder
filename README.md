# Avatar Builder

A Chubflix-styled React application for generating images using Stable Diffusion WebUI Forge API.

## Features

- **Text-to-Image Generation**: Send prompts to your Stable Diffusion WebUI Forge instance
- **Model Selection**: Dynamically loads available models from the API
- **Persistent Storage**: All generated images are saved to SQLite database and filesystem
- **Lightbox View**: Click images to view in fullscreen with swipe/arrow navigation
- **Settings Restoration**: Restore any previous generation's settings (with or without seed)
- **Infinite Scroll**: Load images in batches of 50 for smooth browsing
- **Mobile Optimized**: Simplified mobile interface with collapsible advanced settings
- **Docker Support**: Easy deployment with Docker Compose

## Project Structure

```
avatar-builder/
├── docker-compose.yml      # Docker orchestration
├── config.json             # App configuration (externalized)
├── package.json            # Root scripts
├── .gitignore
├── README.md
├── server/                 # Express backend
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
└── client/                 # React frontend
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── public/
    │   ├── index.html
    │   └── config.json     # Dev config (overridden in Docker)
    └── src/
        ├── index.js
        ├── index.css
        └── App.js
```

## Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- Stable Diffusion WebUI Forge running with `--api` flag

## Quick Start with Docker

1. Configure the API URL in `config.json` (root level):
   ```json
   {
     "api": {
       "baseUrl": "https://your-sd-api-url.com"
     }
   }
   ```

2. Build and start the containers:
   ```bash
   docker-compose up -d --build
   ```

3. Access the application at http://localhost:8080

### Docker Commands

```bash
# Build images
docker-compose build

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

### Docker Volumes

The application uses a named volume `avatar-data` for persistent storage:
- Database: `/data/avatar-builder.db`
- Generated images: `/data/generated/`

## Local Development

1. Install all dependencies:
   ```bash
   npm run install-all
   ```

2. Configure the API URL in `client/public/config.json`

3. Run in development mode:
   ```bash
   npm run dev
   ```

This starts:
- Backend server on http://localhost:3001
- React dev server on http://localhost:3000

## Configuration

Edit `config.json` (root level for Docker, `client/public/config.json` for local dev) to customize:

```json
{
  "api": {
    "baseUrl": "https://ai-sd.svc.cklio.com"
  },
  "defaults": {
    "positivePrompt": "masterpiece, best quality, highly detailed",
    "negativePrompt": "lowres, bad anatomy, ...",
    "orientation": "portrait",
    "batchSize": 1
  },
  "generation": {
    "samplerName": "DPM++ 2M",
    "scheduler": "Karras",
    "steps": 25,
    "cfgScale": 7
  },
  "adetailer": {
    "enabled": true,
    "model": "face_yolov8n.pt"
  },
  "dimensions": {
    "portrait": { "width": 832, "height": 1216 },
    "landscape": { "width": 1216, "height": 832 }
  }
}
```

## API Endpoints

- `GET /api/images?limit=50&offset=0` - Get paginated images
- `POST /api/images` - Save a new generated image
- `DELETE /api/images/:id` - Delete an image
- `GET /api/health` - Health check
- `GET /generated/:filename` - Serve image files

## Usage

### Desktop

1. Enter your positive prompt
2. Expand settings to configure negative prompt, model, orientation, batch size
3. Use Advanced Settings for seed control
4. Click "Generate Images"

### Mobile

1. Enter your positive prompt
2. Tap "Advanced Settings" to show additional options
3. Click "Generate Images"

### Lightbox

- Click any image to open in fullscreen
- Use arrow keys or swipe to navigate
- Press ESC or click outside to close
- Actions available: Download, Copy, Restore (with/without seed), Delete

### Restoring Settings

Each image has two restore options:
- **Restore (↺)**: Loads all settings including the exact seed
- **Restore New Seed (🔀)**: Loads settings but sets seed to -1 (random)

## Environment Variables (Server)

- `PORT` - Server port (default: 3001)
- `DATA_DIR` - Data directory path (default: ../data)
- `GENERATED_DIR` - Generated images path (default: DATA_DIR/generated)
- `DB_PATH` - Database file path (default: DATA_DIR/avatar-builder.db)

## Troubleshooting

### CORS Issues
Ensure your SD WebUI is started with CORS enabled:
```bash
./webui.sh --api --cors-allow-origins=*
```

### Images Not Loading
Check that the nginx proxy is correctly routing to the server. View logs:
```bash
docker-compose logs client
```

### Database Errors
The SQLite database is created automatically on first run. If you encounter issues, check the data volume:
```bash
docker volume inspect avatar-builder_avatar-data
```
