const imageToBase64 = require('image-to-base64');

async function encodeImage(imagePath) {
  try {
    const base64Image = await imageToBase64(imagePath);
    return base64Image;
  } catch (error) {
    console.error('Error al codificar la imagen:', error);
  }
}