import * as THREE from 'three';
import { type Tile, type TileColor } from './rules.ts';

// Texture cache to prevent recreating duplicate textures
const tileTextureCache = new Map<string, THREE.CanvasTexture>();
let tileBackTextureCache: THREE.CanvasTexture | null = null;
let feltTextureCache: THREE.CanvasTexture | null = null;
let woodTextureCache: THREE.CanvasTexture | null = null;

const COLOR_MAP: Record<TileColor, string> = {
  black: '#18181b',
  blue: '#1d4ed8',
  red: '#dc2626',
  yellow: '#d97706',
  joker: '#7c3aed',
};

/**
 * Creates a procedural 2D canvas texture for a Rummikub tile front
 */
export function getTileFrontTexture(tile: Tile, maxAnisotropy = 4): THREE.CanvasTexture {
  const cacheKey = `${tile.color}-${tile.number}-${tile.isJoker ? 'joker' : 'normal'}`;
  if (tileTextureCache.has(cacheKey)) {
    return tileTextureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Ivory / Cream gradient background with subtle tactile border
    const grad = ctx.createLinearGradient(0, 0, 256, 384);
    grad.addColorStop(0, '#fefbf3');
    grad.addColorStop(0.5, '#fbf6e9');
    grad.addColorStop(1, '#f5eedb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 384);

    // Subtle inner bevel shadow
    ctx.strokeStyle = 'rgba(215, 200, 175, 0.6)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 374);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 236, 364);

    if (tile.isJoker) {
      // Draw Joker Face
      const cx = 128;
      const cy = 175;

      // Joker Face Base
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx, cy, 65, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#dc2626';
      ctx.stroke();

      // Joker Hair / Jester Cap (2 colored puffs)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(cx - 50, cy - 50, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.arc(cx + 50, cy - 50, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(cx, cy - 65, 24, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(cx - 24, cy - 12, 10, 0, Math.PI * 2);
      ctx.arc(cx + 24, cy - 12, 10, 0, Math.PI * 2);
      ctx.fill();

      // Rosy cheeks
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(cx - 36, cy + 14, 14, 0, Math.PI * 2);
      ctx.arc(cx + 36, cy + 14, 14, 0, Math.PI * 2);
      ctx.fill();

      // Big joyful smile
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy + 8, 38, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();

      // Label "JOKER" at bottom
      ctx.fillStyle = '#7c3aed';
      ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JOKER', 128, 310);
    } else {
      // Normal Tile Number
      const colorHex = COLOR_MAP[tile.color];

      // Draw large center number with engraved look
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 150px "Trebuchet MS", "Segoe UI", Arial, sans-serif';

      // Slight indented shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillText(tile.number.toString(), 130, 187);

      ctx.fillStyle = colorHex;
      ctx.fillText(tile.number.toString(), 128, 185);

      // Underline bar for 6 and 9 orientation clarity
      if (tile.number === 6 || tile.number === 9) {
        ctx.fillStyle = colorHex;
        ctx.fillRect(85, 265, 86, 12);
      }

      // Small corner indices
      ctx.font = 'bold 34px "Trebuchet MS", Arial, sans-serif';
      ctx.fillText(tile.number.toString(), 38, 48);
      ctx.fillText(tile.number.toString(), 218, 342);

      // Small color dot under corner indices
      ctx.beginPath();
      ctx.arc(38, 70, 6, 0, Math.PI * 2);
      ctx.arc(218, 320, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(maxAnisotropy, 8);
  tileTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates procedural texture for the back of a Rummikub tile
 */
export function getTileBackTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (tileBackTextureCache) return tileBackTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Ivory / Cream base
    ctx.fillStyle = '#fbf6e9';
    ctx.fillRect(0, 0, 256, 384);

    // Outer border
    ctx.strokeStyle = '#c2410c'; // Vintage terracotta red
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 236, 364);

    // Decorative geometric rhombus grid pattern
    ctx.strokeStyle = 'rgba(194, 65, 12, 0.35)';
    ctx.lineWidth = 3;
    const step = 24;

    for (let x = -384; x < 640; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 384, 384);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 384);
      ctx.lineTo(x + 384, 0);
      ctx.stroke();
    }

    // Center circular medallion
    ctx.fillStyle = '#fbf6e9';
    ctx.beginPath();
    ctx.arc(128, 192, 54, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(128, 192, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Rummikub "R" Monogram
    ctx.fillStyle = '#c2410c';
    ctx.font = 'bold 58px "Trebuchet MS", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R', 128, 194);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(maxAnisotropy, 8);
  tileBackTextureCache = texture;
  return texture;
}

/**
 * Creates luxury gaming felt tabletop texture
 */
export function getFeltTexture(): THREE.CanvasTexture {
  if (feltTextureCache) return feltTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Deep emerald green casino felt with subtle velvet grain
    const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 360);
    grad.addColorStop(0, '#115e3b');
    grad.addColorStop(0.7, '#0f5132');
    grad.addColorStop(1, '#093a23');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Fine fiber grain
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 30000; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      ctx.fillRect(rx, ry, 1.5, 1.5);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let i = 0; i < 30000; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      ctx.fillRect(rx, ry, 1.5, 1.5);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  feltTextureCache = texture;
  return texture;
}

/**
 * Creates rich mahogany wood texture for table border and racks
 */
export function getWoodTexture(): THREE.CanvasTexture {
  if (woodTextureCache) return woodTextureCache;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Warm mahogany wood tone
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#3a1e12');
    grad.addColorStop(0.3, '#4d2818');
    grad.addColorStop(0.7, '#5c311e');
    grad.addColorStop(1, '#3a1e12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Wood rings / streaks
    ctx.strokeStyle = 'rgba(30, 12, 6, 0.25)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(150, y + (Math.random() - 0.5) * 30, 350, y + (Math.random() - 0.5) * 30, 512, y);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  woodTextureCache = texture;
  return texture;
}
