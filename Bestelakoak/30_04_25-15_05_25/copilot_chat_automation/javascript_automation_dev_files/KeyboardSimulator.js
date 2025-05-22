/**
 * Utilidad para simular combinaciones de teclas en VS Code desde la consola DevTools
 */

/**
 * Simula la pulsación de una tecla individual
 * @param {string} key - Tecla que se va a simular (ej: 'a', 'Enter')
 * @param {Object} options - Opciones adicionales (ctrl, shift, alt, meta)
 */
function simulateKey(key, options = {}) {
    const eventOptions = {
        key: key,
        code: getKeyCode(key),
        keyCode: getKeyCodeNumber(key),
        which: getKeyCodeNumber(key),
        bubbles: true,
        cancelable: true,
        ctrlKey: options.ctrl || false,
        shiftKey: options.shift || false,
        altKey: options.alt || false,
        metaKey: options.meta || false
    };

    // Crear eventos de teclado
    const keyDownEvent = new KeyboardEvent('keydown', eventOptions);
    const keyPressEvent = new KeyboardEvent('keypress', eventOptions);
    const keyUpEvent = new KeyboardEvent('keyup', eventOptions);

    // Disparar eventos
    document.dispatchEvent(keyDownEvent);
    document.dispatchEvent(keyPressEvent);
    document.dispatchEvent(keyUpEvent);
    
    console.log(`Tecla simulada: ${key}`, options);
}

/**
 * Simula una combinación de teclas en secuencia
 * @param {Array<{key: string, options: Object}>} sequence - Secuencia de teclas y opciones
 */
function simulateKeySequence(sequence) {
    sequence.forEach(item => {
        simulateKey(item.key, item.options || {});
    });
    console.log('Secuencia de teclas completada');
}

/**
 * Simula la combinación de teclas para crear un nuevo archivo (Ctrl + WN + SHIFT + N)
 */
function simulateNewFileShortcut() {
    try {
        console.log('Simulando combinación de teclas para nuevo archivo...');
        
        // Simulación de la secuencia Ctrl + WN + SHIFT + N
        simulateKeySequence([
            { key: 'Control', options: { ctrl: true } },
            { key: 'w', options: { ctrl: true } },
            { key: 'n', options: { ctrl: true, shift: true } }
        ]);
        
        console.log('Combinación de teclas para nuevo archivo simulada');
    } catch (error) {
        console.error('Error al simular combinación de teclas:', error);
    }
}

/**
 * Ejecuta directamente el comando para crear un nuevo archivo
 */
function executeNewFileCommand() {
    try {
        // Intentar ejecutar el comando directamente a través de la API interna de VS Code
        if (window.require) {
            const vscode = window.require('vscode');
            if (vscode && vscode.commands) {
                vscode.commands.executeCommand('explorer.newFile').then(() => {
                    console.log('Comando explorer.newFile ejecutado con éxito');
                }).catch(err => {
                    console.error('Error al ejecutar el comando:', err);
                });
                return;
            }
        }
        
        // Si no funciona, mostrar mensaje de error
        console.error('No se pudo acceder a la API de VS Code');
    } catch (error) {
        console.error('Error al ejecutar el comando:', error);
    }
}

// Funciones auxiliares
function getKeyCode(key) {
    const keyCodes = {
        'Control': 'ControlLeft',
        'Shift': 'ShiftLeft',
        'Alt': 'AltLeft',
        'w': 'KeyW',
        'n': 'KeyN',
        // Añadir más códigos según sea necesario
    };
    return keyCodes[key] || `Key${key.toUpperCase()}`;
}

function getKeyCodeNumber(key) {
    const keyCodeNumbers = {
        'Control': 17,
        'Shift': 16,
        'Alt': 18,
        'w': 87,
        'n': 78,
        // Añadir más códigos según sea necesario
    };
    return keyCodeNumbers[key] || key.charCodeAt(0);
}

// Para usar desde la consola de DevTools:
// simulateNewFileShortcut()
// o
// executeNewFileCommand()
