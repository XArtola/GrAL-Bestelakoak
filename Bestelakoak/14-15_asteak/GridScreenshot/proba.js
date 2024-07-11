const axios = require('axios');
const fs = require('fs');

// Quiero que se haga una llamada a la API de OpenAI para obtener una respuesta a la pregunta "¿En qué celdas hay elementos con los que se puede interactuar?" basada en una imagen que contiene una cuadrícula con elementos interactivos. Para ello, necesito que se codifique la imagen en base64 y se envíe a la API de OpenAI junto con la pregunta. La respuesta de la API se debe mostrar por consola.


// Read the image file
const imageFilePath = './screenshot_with_grid.png';
const imageData = fs.readFileSync(imageFilePath, { encoding: 'base64' });

// Set up the API request
const apiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions';
const apiKey = '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';
const question = '¿En qué celdas hay elementos con los que se puede interactuar?';

// Make the API call
axios.post(apiUrl, {
    prompt: question,
    images: [imageData]
}, {
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    }
})
    .then(response => {
        // Display the API response
        console.log(response.data.choices[0].text);
    })
    .catch(error => {
        console.error(error);
    });