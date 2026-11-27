# Images Directory

This directory contains all image assets for the Dshino Partner App.

## Required Images for Splash Screen

### 1. **logo.png**
- **Description**: Dshino logo with car wash icon
- **Size**: 512x512px (will be scaled down)
- **Format**: PNG with transparency
- **Location**: `src/assets/images/logo.png`
- **Design**: Orange car with bubbles/sparkles

### 2. **car-wash-splash.png**
- **Description**: White car being washed with water splash effect
- **Size**: 800x600px
- **Format**: PNG with transparency
- **Location**: `src/assets/images/car-wash-splash.png`
- **Design**: Modern white sedan with soap bubbles and water splash

### 3. **car-wash-station.png**
- **Description**: Car wash station/garage illustration (background)
- **Size**: 400x300px
- **Format**: PNG with transparency (30% opacity)
- **Location**: `src/assets/images/car-wash-station.png`
- **Design**: Simple car wash station structure

## How to Add Images

1. **Download or create the images** following the specifications above
2. **Place them in this directory**: `src/assets/images/`
3. **Naming convention**: Use kebab-case (lowercase with hyphens)

## Temporary Placeholders

Until you add the actual images, the app will show placeholder images or you can use:

### Free Image Resources:
- **Unsplash**: https://unsplash.com/s/photos/car-wash
- **Pexels**: https://www.pexels.com/search/car%20wash/
- **Freepik**: https://www.freepik.com/search?format=search&query=car%20wash

### Recommended Images:

1. **Logo**: Create a simple SVG or PNG with:
   - Orange car silhouette
   - Bubbles/sparkles around it
   - Clean, modern design

2. **Car Wash Splash**: Use a photo of:
   - White modern sedan (like Honda Civic, Toyota Corolla)
   - Being washed with visible water/soap
   - Clean background (can be removed)

3. **Car Wash Station**: Simple illustration of:
   - Car wash bay structure
   - Orange accents
   - Minimalist design

## Image Optimization

Before adding images:
1. **Compress images** using TinyPNG or similar
2. **Remove backgrounds** if needed
3. **Ensure proper dimensions** for performance
4. **Use PNG** for images with transparency
5. **Use JPG** for photos without transparency

## Example Usage

```typescript
// In your component
import {Image} from 'react-native';

<Image
  source={require('./logo.png')}
  style={{width: 150, height: 150}}
  resizeMode="contain"
/>
```
