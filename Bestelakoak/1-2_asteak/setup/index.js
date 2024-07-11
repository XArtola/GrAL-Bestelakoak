const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const simpleGit = require('simple-git');
const cors = require('cors');

const app = express();
const port = 3005;

// Configuración para permitir CORS
/*app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Permite solicitudes desde cualquier origen
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Permite los métodos especificados
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });*/

// Usa el middleware cors
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/submit', async (req, res) => {
  const repoUrl = req.body.repoUrl;
  const projectName = 'test-project'; // Puedes ajustar el nombre del proyecto descargado

  try {
    // Clonar el repositorio usando simple-git
    console.log('Clonando el repositorio...');
    await new Promise((resolve, reject) => {
      const git = simpleGit();
      git.clone(repoUrl, projectName, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Cambiar al directorio del nuevo proyecto
    process.chdir(projectName);

    // Instalar dependencias
    console.log('Instalando dependencias...');
    await new Promise((resolve, reject) => {
      const installProcess = exec('npm install', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });

      installProcess.stdout.pipe(process.stdout);
      installProcess.stderr.pipe(process.stderr);
    });

    // Ejecutar el proyecto
    console.log('Ejecutando el proyecto...');
    const startProcess = exec('node index.js');

    startProcess.stdout.pipe(process.stdout);
    startProcess.stderr.pipe(process.stderr);

    startProcess.on('exit', (code) => {
      console.log(`Proyecto en marcha. Código de salida: ${code}`);
      res.send(`Proyecto descargado y en marcha. Código de salida: ${code}`);
    });
  } catch (error) {
    console.error('Error durante el proceso:', error);
    res.status(500).send('Error durante el proceso: ' + error.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
