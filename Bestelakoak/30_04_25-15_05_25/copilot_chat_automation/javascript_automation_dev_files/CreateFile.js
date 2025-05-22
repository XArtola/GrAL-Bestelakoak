/**
 * Función para crear un nuevo archivo en el workspace de VS Code
 * @param {string} relativePath - Ruta relativa del archivo dentro del workspace
 * @param {string} content - Contenido del archivo
 * @returns {Promise<void>}
 */
async function createFile(relativePath, content = '') {
    // Obtener el workspace actual
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
        console.error('No hay ningún workspace abierto');
        return;
    }
    
    const workspaceRoot = workspaceFolders[0].uri;
    
    // Crear la URI para el nuevo archivo
    const fileUri = vscode.Uri.joinPath(workspaceRoot, relativePath);
    
    try {
        // Crear o sobrescribir el archivo
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(content);
        
        await vscode.workspace.fs.writeFile(fileUri, uint8Array);
        console.log(`Archivo creado correctamente: ${relativePath}`);
        
        // Opcional: abrir el archivo recién creado
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        console.error(`Error al crear el archivo: ${error.message}`);
    }
}

/**
 * Simula el proceso de "Click derecho > New File" en VS Code
 * Muestra un cuadro de diálogo para que el usuario introduzca la ruta del archivo
 * @returns {Promise<void>}
 */
async function newFileInteractive() {
    try {
        // Obtener el workspace actual
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders || workspaceFolders.length === 0) {
            console.error('No hay ningún workspace abierto');
            return;
        }
        
        // Seleccionar workspace si hay múltiples
        let targetWorkspace = workspaceFolders[0];
        if (workspaceFolders.length > 1) {
            const selected = await vscode.window.showQuickPick(
                workspaceFolders.map(folder => ({ 
                    label: folder.name,
                    folder: folder
                })),
                { placeHolder: 'Selecciona el workspace para el nuevo archivo' }
            );
            if (!selected) return;
            targetWorkspace = selected.folder;
        }
        
        // Pedir la ruta relativa del archivo
        const relativePath = await vscode.window.showInputBox({
            prompt: 'Ingresa la ruta del nuevo archivo',
            placeHolder: 'carpeta/nuevo-archivo.txt'
        });
        
        if (!relativePath) return; // El usuario canceló
        
        // Crear el archivo vacío
        const fileUri = vscode.Uri.joinPath(targetWorkspace.uri, relativePath);
        await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
        
        // Abrir el archivo recién creado
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
        
        console.log(`Archivo creado: ${relativePath}`);
    } catch (error) {
        console.error(`Error al crear el archivo: ${error.message}`);
    }
}

/**
 * Función para crear múltiples archivos en el workspace de VS Code
 * @param {Array<{path: string, content: string}>} files - Array de objetos con rutas y contenidos
 * @returns {Promise<void>}
 */
async function createMultipleFiles(files) {
    for (const file of files) {
        await createFile(file.path, file.content || '');
    }
    console.log(`Se han creado ${files.length} archivos`);
}

// Ejemplo de uso para un archivo:
// createFile('carpeta/nuevo-archivo.txt', 'Contenido del archivo');

// Ejemplo de uso para múltiples archivos:
/*
createMultipleFiles([
    { path: 'carpeta/archivo1.js', content: '// Código JavaScript' },
    { path: 'carpeta/archivo2.html', content: '<!DOCTYPE html><html></html>' },
    { path: 'carpeta/archivo3.css', content: 'body { margin: 0; }' }
]);
*/

// Ejemplo de uso:
// Para crear un archivo de forma interactiva (similar al "Click derecho > New File")
// newFileInteractive();

/**
 * Crea un archivo en el workspace utilizando los servicios internos de VS Code
 * Esta versión funciona desde la consola de DevTools
 * @param {string} path - Ruta del archivo a crear
 * @param {string} content - Contenido del archivo
 */
function createFileDevTools(path, content = '') {
    try {
        // Acceder a los servicios internos de VS Code
        const vscodeRequire = window.require;
        const fileService = vscodeRequire('vs/workbench/services/textfile/browser/textFileService').workbenchTextFileService;
        const URI = vscodeRequire('vs/base/common/uri').URI;
        const vscodePath = vscodeRequire('vs/base/common/path');
        
        // Obtener el workspace actual
        const workspaceService = vscodeRequire('vs/workbench/services/workspace/common/workspaceService').workspaceService;
        const workspaceFolder = workspaceService.getWorkspace().folders[0];
        
        if (!workspaceFolder) {
            console.error('No hay ningún workspace abierto');
            return;
        }
        
        // Crear URI para el archivo
        const baseUri = URI.parse(workspaceFolder.uri);
        const fileUri = baseUri.with({ path: vscodePath.join(baseUri.path, path) });
        
        // Crear el archivo
        fileService.create(fileUri, content, { overwrite: true }).then(() => {
            console.log(`Archivo creado correctamente: ${path}`);
            
            // Opcional: abrir el archivo recién creado
            const editorService = vscodeRequire('vs/workbench/services/editor/browser/editorService').editorService;
            editorService.openEditor({ resource: fileUri }).then(() => {
                console.log(`Archivo abierto: ${path}`);
            });
        });
    } catch (error) {
        console.error('Error al crear el archivo:', error);
        console.log('Detalles del error:', error.message);
    }
}

/**
 * Muestra instrucciones simples para crear un archivo en VS Code
 */
function showSimpleInstructions() {
    console.log('=====================================================');
    console.log('INSTRUCCIONES PARA CREAR UN ARCHIVO EN VS CODE:'); 
    console.log('=====================================================');
    console.log('Método 1: Usando la interfaz de usuario');
    console.log('  1. Haz clic derecho en el panel del explorador');
    console.log('  2. Selecciona "New File"');
    console.log('  3. Escribe el nombre del archivo y presiona Enter');
    console.log('');
    console.log('Método 2: Usando atajos de teclado');
    console.log('  1. Presiona Ctrl + WN + SHIFT + N para crear un archivo nuevo');
    console.log('  2. Presiona Ctrl+S (o Cmd+S en Mac)');
    console.log('  3. Navega a la carpeta deseada y asigna un nombre al archivo');
    console.log('');
    console.log('Método 3: Usando la paleta de comandos');
    console.log('  1. Presiona Ctrl+Shift+P (o Cmd+Shift+P en Mac)');
    console.log('  2. Escribe "File: New File" y presiona Enter');
    console.log('  3. Guarda el archivo con Ctrl+S (o Cmd+S en Mac)');
    console.log('=====================================================');
}

/**
 * Simula la combinación de teclas Ctrl + WN + SHIFT + N para crear un nuevo archivo
 * Intentará ejecutar el comando asociado a esta combinación o simular los eventos de teclado
 */
function simulateNewFileKeyCombo() {
    try {
        // Método 1: Intentar ejecutar el comando directamente
        if (typeof acquireVsCodeApi === 'function') {
            const vscode = acquireVsCodeApi();
            vscode.postMessage({
                command: 'executeCommand',
                commandId: 'explorer.newFile'
            });
            console.log('Comando para crear archivo enviado');
            return;
        }

        // Método 2: Intentar acceder al servicio de comandos interno
        if (window.require) {
            const vscodeRequire = window.require;
            try {
                const commandService = vscodeRequire('vs/platform/commands/common/commands').ICommandService;
                if (commandService) {
                    commandService.executeCommand('explorer.newFile');
                    console.log('Comando explorer.newFile ejecutado');
                    return;
                }
            } catch (e) {
                console.log('No se pudo acceder a ICommandService');
            }

            try {
                // Intentar con el CommandsRegistry
                const commandRegistry = vscodeRequire('vs/platform/commands/common/commands').CommandsRegistry;
                if (commandRegistry && commandRegistry.getCommands) {
                    const commands = commandRegistry.getCommands();
                    if (commands['explorer.newFile']) {
                        commands['explorer.newFile'].handler();
                        console.log('Comando explorer.newFile ejecutado desde el registro');
                        return;
                    }
                }
            } catch (e) {
                console.log('No se pudo acceder a CommandsRegistry');
            }
        }

        // Método 3: Simular eventos de teclado directamente
        try {
            // Crear eventos de teclado para la combinación Ctrl + WN + SHIFT + N
            const ctrlKey = new KeyboardEvent('keydown', { 
                key: 'Control', 
                code: 'ControlLeft', 
                keyCode: 17, 
                which: 17,
                ctrlKey: true 
            });
            
            const wKey = new KeyboardEvent('keydown', { 
                key: 'w', 
                code: 'KeyW', 
                keyCode: 87, 
                which: 87,
                ctrlKey: true 
            });
            
            const nKey = new KeyboardEvent('keydown', { 
                key: 'n', 
                code: 'KeyN', 
                keyCode: 78, 
                which: 78,
                ctrlKey: true,
                shiftKey: true
            });
            
            // Disparar los eventos en secuencia
            document.dispatchEvent(ctrlKey);
            document.dispatchEvent(wKey);
            document.dispatchEvent(nKey);
            
            console.log('Eventos de teclado simulados para Ctrl + WN + SHIFT + N');
            return;
        } catch (e) {
            console.log('No se pudieron simular eventos de teclado:', e);
        }
        
        // Si todos los métodos fallan, mostrar instrucciones
        console.error('No se pudo simular la combinación de teclas');
        showSimpleInstructions();
    } catch (error) {
        console.error('Error al simular la combinación de teclas:', error);
        showSimpleInstructions();
    }
}

/**
 * Método alternativo que usa comandos internos para simular el clic derecho > New File
 */
function createFileWithCommand() {
    try {
        // Intentar encontrar una forma de acceder a los comandos de VS Code
        if (typeof acquireVsCodeApi === 'function') {
            const vscode = acquireVsCodeApi();
            vscode.postMessage({
                command: 'createFile',
                text: 'Solicitud para crear un nuevo archivo'
            });
            console.log('Mensaje enviado al host de VS Code');
            return;
        }
        
        // Si llegamos aquí, no pudimos acceder a la API de VS Code
        console.error('No se pudo acceder a la API de VS Code');
        showSimpleInstructions();
    } catch (error) {
        console.error('Error:', error);
        showSimpleInstructions();
    }
}

/**
 * Método más simple para crear un archivo usando FileSystem API (si está disponible)
 * @param {string} fileName - Nombre del archivo a crear
 * @param {string} content - Contenido del archivo
 */
async function createFileWithFSAPI(fileName, content = '') {
    try {
        // Comprobar si la API de FileSystem está disponible
        if (!window.showSaveFilePicker) {
            console.error('FileSystem API no disponible en este entorno');
            showSimpleInstructions();
            return;
        }
        
        // Configurar opciones para guardar archivo
        const options = {
            types: [
                {
                    description: 'Archivos de texto',
                    accept: {
                        'text/plain': ['.txt', '.js', '.html', '.css', '.json']
                    }
                },
            ],
            suggestedName: fileName
        };
        
        // Mostrar diálogo para guardar archivo
        const fileHandle = await window.showSaveFilePicker(options);
        
        // Crear un stream de escritura
        const writable = await fileHandle.createWritable();
        
        // Escribir contenido
        await writable.write(content);
        
        // Cerrar el archivo
        await writable.close();
        
        console.log(`Archivo guardado: ${fileName}`);
    } catch (error) {
        console.error('Error al crear el archivo:', error);
        showSimpleInstructions();
    }
}

/**
 * Función principal para crear un archivo con el método que funcione
 * @param {string} fileName - Nombre del archivo a crear
 * @param {string} content - Contenido del archivo
 */
async function createNewFile(fileName, content = '') {
    try {
        // Intentar usar FileSystem API primero (más probable que funcione en DevTools)
        await createFileWithFSAPI(fileName, content);
    } catch (error) {
        console.log('No se pudo crear el archivo con FileSystem API, intentando métodos alternativos...');
        try {
            createFileWithCommand();
        } catch (err) {
            console.error('Todos los métodos para crear archivos fallaron.');
            showSimpleInstructions();
        }
    }
}

// Ejemplo de uso:
// createNewFile('miarchivo.txt', 'Este es el contenido del archivo');
// O simplemente mostrar instrucciones:
// showSimpleInstructions();
