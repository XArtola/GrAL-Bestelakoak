import { exec } from 'child_process';
import { link } from 'fs';
//import { JSDOM } from 'jsdom';
//const { JSDOM } = require('jsdom');
import cheerio from 'cheerio';


// Obtén la URL como argumento de línea de comandos
const url = process.argv[2];

// Comando 1: Ejecutar un comando de terminal con la URL
const command1 = `lynx -dump -nolist -number_fields -number_links ${url}`;

exec(command1, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error al ejecutar el comando 1: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Error en la salida del comando 1: ${stderr}`);
        return;
    }
    console.log(`Salida del comando 1: ${stdout}`);

});

// Comando 2: Ejecutar otro comando de terminal con la URL
const command2 = `lynx -number_links -number_fields -listonly -dump ${url}`;

exec(command2, (error2, stdout2, stderr2) => {
    if (error2) {
        console.error(`Error al ejecutar el comando 2: ${error2.message}`);
        return;
    }
    if (stderr2) {
        console.error(`Error en la salida del comando 2: ${stderr2}`);
        return;
    }
    console.log(`Salida del comando 2: ${stdout2}`);

    const command3 = `lynx -source ${url}`;

    exec(command3, (error3, stdout3, stderr3) => {
        if (error3) {
            console.error(`Error al ejecutar el comando 3: ${error3.message}`);
            return;
        }
        if (stderr3) {
            console.error(`Error en la salida del comando 3: ${stderr3}`);
            return;
        }
        console.log(`Salida del comando 3: ${stdout3}`);

        // Expresión regular para detectar URLs
        // TODO: kontuz, proiektuko esteka seguruaski lokalhost izango da. Edo localhost sartu 
        const expresionURL = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;

        // Extraer URLs del texto
        const links = stdout2.match(expresionURL);

        // Parsear la salida del comando 2 para obtener la lista de enlaces
        //const links = stdout2.match(/https?:\/\/[^\s]+/g);
        // Crear un objeto para almacenar la información
        const data = {
            url,
            enlaces: links
        };
        console.log('El contenido de data es: ');
        console.log(data);        
        
        // Usar cheerio para cargar el HTML
        const $ = cheerio.load(stdout3);

        
        // Obtener todos los elementos <a> del HTML
        const links2 = $('a');
        /*
        console.log('Los enlaces son: ');
        console.log(links2);

        // Recorrer los elementos <a> y obtener los atributos href y text
        links2.each((index, element) => {
            const href = $(element).attr('href');
            const text = $(element).text();
            data.enlaces.push({ text, href });
        });
*/
/*
        // Recorrer la lista de enlaces
        links.forEach((link) => {
            // Buscar el elemento cuyo href coincida con la URL
            const matchingElement = $('a[href*="' + link + '"]');
            if (matchingElement.length === 0) {
                // Si no se encontró una coincidencia exacta, buscar una coincidencia parcial
                const partialMatch = $('a').filter((index, element) => {
                    const href = $(element).attr('href');
                    if (!href) {
                        return false;
                    }
                    return href.includes(link);
                });
                if (partialMatch.length > 0) {
                    matchingElement = partialMatch.first();
                }
            }
            // Verificar si se encontró el elemento
            if (matchingElement.length > 0) {
                // Obtener los atributos href y text del elemento
                const href = matchingElement.attr('href');
                const text = matchingElement.text();
                // Agregar los datos del enlace al objeto data
                data.enlaces.push({ text, href , link});
            }
        });
*/
        // Find URLs in the links variable that are in the HTML and return an object specifying the element type and the text
        const urlsInHtml = [];
        links.forEach((link) => {
            // Find the element whose href matches the URL
            const matchingElement = $(`[href="${link}"]`);
            if (matchingElement.length > 0) {
                // Get the element type and text
                const elementType = matchingElement[0].tagName;
                const text = matchingElement.text();
                // Add the element type and text to the result object
                urlsInHtml.push({ elementType, text, link });
            }
            else {
                // If no exact match was found, look for a partial match
                const partialMatch = $(`[href*="${String(link).replace(url, '')}"]`);
                if (partialMatch.length > 0) {
                    // Get the element type and text
                    const elementType = partialMatch[0].tagName;
                    const text = partialMatch.text();
                    // Add the element type and text to the result object
                    urlsInHtml.push({ elementType, text , link});
                }
                else
                {
                    urlsInHtml.push({ elementType: 'No se ha encontrado el enlace en el HTML', text: 'No se ha encontrado el enlace en el HTML', link });
                }
            }
        });

        // Print the result object
        console.log('URLs in HTML:');
        console.log(urlsInHtml);

        // Convertir el objeto a JSON
        const json = JSON.stringify(data);
        console.log(`El objeto JSON: ${json}`);
    });
});
