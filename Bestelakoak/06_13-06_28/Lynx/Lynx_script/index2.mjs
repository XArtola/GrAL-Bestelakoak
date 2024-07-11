import { exec } from 'child_process';


// Obtén la URL como argumento de línea de comandos
const url = process.argv[2];

// Comando 1: Ejecutar un comando de terminal con la URL
const command1 = `links2 -dump -html-numbered-links 1 ${url}`;

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

    // Separar la información de stdout en 2 variables utilizando "Links:" como separador
    const [stdoutPart1, stdoutPart2] = stdout.split('Links:');

    // Imprimir las dos partes separadas
    console.log('Parte 1:', stdoutPart1);
    console.log('Parte 2:', stdoutPart2);

    // Crear un objeto que contenga la información de stdoutPart2
    const infoObj = {
        stdoutPart2: stdoutPart2.trim().split('\n')
    };

    // Imprimir el objeto
    const parsedInfo = infoObj.stdoutPart2.map((line) => {
        const [number, text] = line.split('. ');

        if (text.startsWith('http://') || text.startsWith('https://')) {
            return { number, type: 'link', text,};
        } else if (text.startsWith('Image')) {
            const [_, link] = line.split('Image: ');
            return { number, type: 'Image', link};
        }
        else if (text.startsWith('Post form: ')) {
            const [_, link] = line.split(': ');
            return { number, type: 'Post form', link};
        }
        else if (text.startsWith('Submit form: ')) {
            const [_, link] = line.split(': ');
            return { number, type: 'Submit form', link};
        }
        else if (text.startsWith('Checkbox, ')) {
            const [type, name, value] = line.split(',');
            const [,,name2] = name.split(' ');
            const [,,value2] = value.split(' ');
            return { number, type: 'checkbox', name: name2 , value: value2};
        }
        else if (text.startsWith('Text field')) {
            if (text.includes(',')){
                const [type, name] = line.split(',');
                const [,,name2] = name.split(' ');
                return { number, type: 'Text field', name: name2};
            }
            else
            {
                return { number, type: 'Text field' };
            }
        }
        else if (text.startsWith('Password field')) {
            if (text.includes(',')){
                const [type, name] = line.split(',');
                const [,,name2] = name.split(' ');
                return { number, type: 'Password field', name: name2};
            }
            else
            {
                return { number, type: 'Password field' };
            }
        }
        else if (text.startsWith('mailto:')) {
           
                const [, mail] = line.split(':');
                return { number, type: 'mailto', address: mail};
            
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
    console.log('Objeto de información:', infoObj);
    console.log('Objeto de información:', parsedInfo);
});
