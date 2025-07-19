# Mapbox Integration Setup Guide

## Overview
The Lunoa frontend-dashboard includes an interactive map component powered by Mapbox GL JS. This guide will help you configure Mapbox to enable full map functionality.

## Quick Setup

### 1. Get Your Mapbox Access Token
1. **Sign up** for a free Mapbox account at [https://account.mapbox.com/auth/signup/](https://account.mapbox.com/auth/signup/)
2. **Navigate** to your [Access Tokens page](https://account.mapbox.com/access-tokens/)
3. **Copy** your default public token (starts with `pk.`)
4. **Or create** a new token with these scopes:
   - `styles:read`
   - `fonts:read`
   - `datasets:read`
   - `vision:read`

### 2. Configure Environment Variables
1. **Copy** the environment template:
   ```bash
   cp env.example .env.local
   ```

2. **Edit** `.env.local` and replace the Mapbox token:
   ```bash
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGV4YW1wbGUifQ.your_actual_token_here
   ```

3. **Restart** your development server:
   ```bash
   npm run dev
   ```

## Map Features

Once configured, the interactive map will provide:

### ✅ Core Functionality
- **Interactive Map**: Pan, zoom, and navigate
- **Quest Markers**: Visual indicators for available quests
- **Vibe Locations**: User-generated content markers
- **User Location**: GPS-based positioning
- **Custom Styling**: Lunoa-branded map appearance

### ✅ Advanced Features
- **Clustering**: Automatic marker grouping at different zoom levels
- **Filtering**: Toggle quest types, difficulty levels, and completed quests
- **Search**: Location-based quest discovery
- **Real-time Updates**: Live quest and vibe data
- **Responsive Design**: Mobile and desktop optimized

## Map Controls

### Filter Panel
- **Show Quests**: Toggle quest markers on/off
- **Show Vibes**: Toggle vibe markers on/off
- **Show Completed**: Include completed quests
- **Difficulty Filter**: Filter by quest difficulty

### Legend
- 🗺️ **Green**: Exploration quests
- 👥 **Blue**: Social quests  
- 🏆 **Yellow**: Challenge quests
- 💼 **Purple**: Business quests
- 📸 **Pink**: Vibe locations

## Fallback Behavior

If Mapbox is not configured:
- **Graceful Degradation**: Shows helpful setup message
- **No Errors**: Prevents crashes and DOM errors
- **Partial Functionality**: Filter controls still work
- **Clear Instructions**: Guides users to configure Mapbox

## Troubleshooting

### Common Issues

**Map not loading:**
- Verify your token starts with `pk.`
- Check token permissions include `styles:read`
- Ensure `.env.local` is in the project root
- Restart development server after changes

**Token errors:**
- Confirm token is active in Mapbox dashboard
- Check for typos in environment variable name
- Verify no extra spaces or quotes around token

**Performance issues:**
- Consider upgrading to Mapbox Pro for higher usage limits
- Implement marker clustering for large datasets
- Optimize quest data loading

### Support Resources
- [Mapbox Documentation](https://docs.mapbox.com/)
- [Mapbox GL JS API](https://docs.mapbox.com/mapbox-gl-js/api/)
- [Lunoa GitHub Issues](https://github.com/your-repo/issues)

## Development Notes

### Map Component Structure
```
components/map/
├── interactive-map.tsx     # Main map component
├── quest-markers.tsx       # Quest marker logic
├── vibe-markers.tsx        # Vibe marker logic
└── map-controls.tsx        # Filter and control UI
```

### Key Dependencies
- `mapbox-gl`: Core mapping library
- `@types/mapbox-gl`: TypeScript definitions
- `react`: Component framework
- `next.js`: Application framework

### Environment Variables
```bash
# Required for map functionality
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token_here

# Optional: Custom map style
NEXT_PUBLIC_MAPBOX_STYLE_URL=mapbox://styles/username/style_id

# Optional: Default map center
NEXT_PUBLIC_DEFAULT_LAT=37.7749
NEXT_PUBLIC_DEFAULT_LNG=-122.4194
```

## Production Deployment

### Vercel/Netlify
Add environment variables in your deployment platform:
1. Go to project settings
2. Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
3. Redeploy application

### Docker
Include in your Dockerfile:
```dockerfile
ENV NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token_here
```

### Security Notes
- Public tokens are safe for client-side use
- Restrict token to specific URLs in production
- Monitor usage in Mapbox dashboard
- Set up billing alerts for usage limits

---

**Need Help?** Check the [Mapbox documentation](https://docs.mapbox.com/) or create an issue in the project repository.
