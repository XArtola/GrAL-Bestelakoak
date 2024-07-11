const sharp = require('sharp');
const { createCanvas, Image } = require('canvas');
const fs = require('fs');

// Tamaño de la cuadrícula
const gridSize = 50;

// Cargar la imagen
sharp('screenshot.png')
  .toBuffer()
  .then((buffer) => {
    // Crear el canvas
    const img = new Image();
    img.onload = () => {
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');

      // Dibujar la imagen original
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // Establecer el estilo de la cuadrícula
      ctx.strokeStyle = '#FF0000'; // Rojo
      ctx.lineWidth = 2;

      // Dibujar la cuadrícula
      for (let x = 0; x < img.width; x += gridSize) {
        for (let y = 0; y < img.height; y += gridSize) {
          ctx.strokeRect(x, y, gridSize, gridSize);
        }
      }

      // Guardar la imagen con la cuadrícula
      const out = fs.createWriteStream('screenshot_with_grid.png');
      const stream = canvas.createPNGStream();
      stream.pipe(out);
    };
    img.src = buffer;
  })
  .catch((err) => {
    console.error(err);
  });
