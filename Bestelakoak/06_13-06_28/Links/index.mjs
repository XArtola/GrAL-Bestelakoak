const { exec } = require('child_process');

function ejecutarComando(url) {
    const comando = `links2 -html-numbered-links 1 -dump ${url} > output.html`;
    exec(comando, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al ejecutar el comando: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Error en la salida del comando: ${stderr}`);
            return;
        }
        console.log(`Comando ejecutado correctamente. Salida: ${stdout}`);
    });

}

// Ejemplo de uso
const url = 'https://www.pirate-king.es';
ejecutarComando(url);