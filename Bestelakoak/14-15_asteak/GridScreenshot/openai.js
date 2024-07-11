const OpenAI = require('openai');
const imageToBase64 = require('image-to-base64');
const {encodeImage} = require('./encodeImage');


async function callChatGPT(apiKey, imagePath, question) {
  const openai = new OpenAI(apiKey);

  const base64Image = await encodeImage(imagePath);
  const imagePrompt = `Imagen: ${base64Image}`;

  const response = await openai.createCompletion('text-davinci-003', {
    prompt: `${imagePrompt}\n\nPregunta: ${question}`,
    temperature: 0.7,
    max_tokens: 100,
  });

  if (response.choices && response.choices.length > 0) {
    return response.choices[0].text;
  } else {
    return 'No se pudo obtener una respuesta de la API.';
  }
}
