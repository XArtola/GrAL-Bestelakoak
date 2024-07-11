import { base64 } from 'base-64';
import { fs } from 'fs';
import { axios } from 'axios';

// Función para codificar la imagen
function encodeImage(imagePath) {
    const image = fs.readFileSync(imagePath);
    return base64.encode(image);
};

// Ruta a tu imagen
const imagePath = "images\ProbaIrudia.JPG";

// Obteniendo la cadena base64
const base64Image = encodeImage(imagePath);

const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` //${process.env.OPENAI_API_KEY}`
};

const payload = {
    "model": "gpt-4-vision-preview",
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "¿Qué hay en esta imagen?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": `data:image/jpeg;base64,${base64Image}`
                    }
                }
            ]
        }
    ],
    "max_tokens": 300
};

axios.post('https://api.openai.com/v1/chat/completions', payload, { headers })
    .then(response => console.log(response.data))
    .catch(error => console.error(error));
