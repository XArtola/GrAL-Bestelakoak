const sharp = require('sharp');
const { createCanvas, Image } = require('canvas');
const fs = require('fs');
const openai = require('openai');

//const { callChatGPT } = require('./openai');


// Tamaño de la cuadrícula
const gridSize = 75;

// Cargar la imagen
sharp('captura.JPG')
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
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let letterIndex = 0;

      for (let y = 0; y < img.height; y += gridSize) {
        for (let x = 0; x < img.width; x += gridSize) {
          ctx.strokeRect(x, y, gridSize, gridSize);
          ctx.font = 'bold 15px Arial';
          ctx.fillStyle = '#FF0000'; // Rojo
          ctx.fillText(getLetter(letterIndex), x + 5, y + 15);
          letterIndex = (letterIndex + 1) % (letters.length * letters.length);
        }
      }

      function getLetter(index) {
        const firstLetter = letters[Math.floor(index / letters.length) - 1] || '';
        const secondLetter = letters[index % letters.length];
        return firstLetter + secondLetter;
      }

      // Guardar la imagen con la cuadrícula
      const out = fs.createWriteStream('screenshot_with_grid2.png');
      const stream = canvas.createPNGStream();
      stream.pipe(out);

    };
    img.src = buffer;
  })
  .catch((err) => {
    console.error(err);
  });

  