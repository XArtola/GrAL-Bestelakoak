import { exec } from 'child_process';
import { parse } from 'path';

function getInfoFromURL(url, depth, obj, debug = false) {

    if (depth === 0) {
        return obj;
    }
    else {
        depth--;

        // Comando 1: Ejecutar un comando de terminal con la URL
        const command1 = `links2 -dump -html-numbered-links 1 ${url}`;
        //enlaces = { url: url, elements: {} };

        exec(command1, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error al ejecutar el comando 1: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Error en la salida del comando 1: ${stderr}`);
                return;
            }
            if (debug) {
                console.log(`Salida del comando 1: ${stdout}`);
            }

            /* kontrolatu stdout hau denean
            
                                400. Se trata de un error.

                El servidor no puede procesar la solicitud porque su formato es
                incorrecto. No se debe volver a intentar. Esa es toda la información de la
                que disponemos.
             
            */

            if (stdout.includes('400. Se trata de un error.')) {
                obj[url] = {};
                return obj;
            }

            // Separar la información de stdout en 2 variables utilizando "Links:" como separador
            const [stdoutPart1, stdoutPart2] = stdout.split('Links:');
            if (debug) {
                // Imprimir las dos partes separadas
                console.log('Parte 1:', stdoutPart1);
                console.log('Parte 2:', stdoutPart2);
            }

            //console.log('stdout', stdout);
            // Crear un objeto que contenga la información de stdoutPart2
            const infoObj = {
                stdoutPart2: stdoutPart2.trim().split('\n')
            };

            // Imprimir el objeto
            const parsedInfo = infoObj.stdoutPart2.map((line) => {
                const [number, text] = line.split('. ');

                if (text.startsWith('http://') || text.startsWith('https://')) {
                    return { number, type: 'link', text, };
                } else if (text.startsWith('Image')) {
                    const [_, link] = line.split('Image: ');
                    return { number, type: 'Image', link };
                }
                else if (text.startsWith('Post form: ')) {
                    const [_, link] = line.split(': ');
                    return { number, type: 'Post form', link };
                }
                else if (text.startsWith('Submit form: ')) {
                    const [_, link] = line.split(': ');
                    return { number, type: 'Submit form', link };
                }
                else if (text.startsWith('Checkbox, ')) {
                    const [type, name, value] = line.split(',');
                    const [, , name2] = name.split(' ');
                    const [, , value2] = value.split(' ');
                    return { number, type: 'checkbox', name: name2, value: value2 };
                }
                else if (text.startsWith('Text field')) {
                    if (text.includes(',')) {
                        const [type, name] = line.split(',');
                        const [, , name2] = name.split(' ');
                        return { number, type: 'Text field', name: name2 };
                    }
                    else {
                        return { number, type: 'Text field' };
                    }
                }
                else if (text.startsWith('Password field')) {
                    if (text.includes(',')) {
                        const [type, name] = line.split(',');
                        const [, , name2] = name.split(' ');
                        return { number, type: 'Password field', name: name2 };
                    }
                    else {
                        return { number, type: 'Password field' };
                    }
                }
                else if (text.startsWith('mailto:')) {

                    const [, mail] = line.split(':');
                    return { number, type: 'mailto', address: mail };

                }
            });

            // Buscar los números con el formato [número] en el texto de stdoutPart1
            const regex = /\[(\d+)\]/g;
            let match;
            while ((match = regex.exec(stdoutPart1)) !== null) {
                const number = match[1];
                const description = stdoutPart1.substring(match.index + match[0].length, stdoutPart1.indexOf('\n', match.index)).trim();

                const objIndex = parsedInfo.findIndex((obj) => obj.number === number);
                if (objIndex !== -1) {
                    parsedInfo[objIndex].description = description;
                    if (description.includes(`[${Number(number) + 1}]`)) {
                        parsedInfo[objIndex].description = description.split(`[${Number(number) + 1}]`)[0].trim();
                    }
                }

            }
            if (debug) {
                console.log('Objeto de información:', infoObj);
                console.log('Objeto de información:', parsedInfo);
            }

            // Aquí puedes realizar cualquier operación adicional con la información obtenida
            // utilizando los parámetros URL, number y obj

            //obj[elements] = parsedInfo;


            obj[url] = parsedInfo;

            //console.log('Objeto:', obj[url]);

            const links = obj[url].filter(obj => obj.type === 'link');
            const linkTexts = links.map(link => link.text);
            //console.log(linkTexts);

            //console.log(linkTexts);
            //console.log(obj);
            if (typeof obj !== 'undefined' && obj != null) {
                //console.log('obj no es nulo');
                //console.log(obj);
                let obj1;
                for (let i = 0; i < linkTexts.length; i++) {
                    const linkText = linkTexts[i];
                    /*
                    console.log('Entra en el for');
                    console.log(obj);
                    console.log(obj[linkText]);
                    */
                    if (!obj[linkText]) {
                        //if (!obj.hasOwnProperty(linkText)) {
                        //obj[linkText] = {};
                        obj1 = getInfoFromURL(linkText, depth, obj, false);
                        Promise.resolve(obj1).then(() => {
                            // Code to execute after getInfoFromURL has finished
                            //console.log('Execution finished');
                            obj[linkText] = obj1;
                        });
                        //console.log('obj1:', obj1);
                    }
                }
            }

            //console.log('Resultado final:', obj);
            return obj;

        });
    }
}

// Ejemplo de uso de la función
//const url = 'https://www.pirate-king.es';
const url = 'https://www.google.es';
const depth = 2;
const obj = {};
const obj1 = getInfoFromURL(url, depth, obj, false);
Promise.resolve(obj1).then(() => {
    // Code to execute after getInfoFromURL has finished
    console.log(obj1);
});

