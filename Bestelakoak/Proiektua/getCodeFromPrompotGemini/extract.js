// Importar las librerías necesarias
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

// Obtener la ruta de entrada desde los argumentos de línea de comandos
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Error: Debe proporcionar la ruta de la carpeta a procesar.');
    console.log('Uso: node extract.js <ruta_de_la_carpeta>');
    console.log('Ejemplos:');
    console.log('  node extract.js ./pywinauto/output_claude_3_5_sonnet');
    console.log('  node extract.js "C:\\path\\to\\folder"');
    process.exit(1);
}

const inputPath = args[0];

// Verificar que la ruta existe
if (!fs.existsSync(inputPath)) {
    console.error(`Error: La ruta "${inputPath}" no existe.`);
    process.exit(1);
}

// Verificar que es una carpeta
const stats = fs.statSync(inputPath);
if (!stats.isDirectory()) {
    console.error(`Error: "${inputPath}" no es una carpeta. Este script solo procesa carpetas.`);
    process.exit(1);
}

// Función para procesar un solo archivo
function processFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        console.log(`Procesando archivo: ${filePath}`);
        
        const result = extractCodeFromFile(fileContent);
        return {
            file: path.basename(filePath),
            fullPath: filePath,
            extractedCode: result,
            processedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error(`Error al procesar el archivo "${filePath}":`, error.message);
        return {
            file: path.basename(filePath),
            fullPath: filePath,
            error: error.message,
            processedAt: new Date().toISOString()
        };
    }
}

// Función para extraer código de un contenido de archivo
function extractCodeFromFile(fileContent) {

// --- INICIO DE LA LÓGICA DE EXTRACCIÓN MEJORADA ---

let extractedTests = [];

// 1. Aislar y limpiar el contenido del bloque de cita (líneas que empiezan con '>').
const blockquoteLines = fileContent
    .split('\n') // Dividir el texto en líneas individuales.
    .filter(line => line.trim().startsWith('>')) // Quedarse solo con las líneas que forman parte de la cita[cite: 1].
    .map(line => line.replace(/^>\s?/, '')); // Quitar el símbolo '>' y el espacio opcional del inicio.

const blockquoteContent = blockquoteLines.join('\n'); // Unir las líneas limpias de nuevo.
console.log(`Contenido de cita extraído: ${blockquoteContent.length} caracteres`);

// 2. Extraer el bloque de código de la cita ya limpia.
// Buscar primero código dentro de <generated_code> tags
let codeToProcess = null;
const generatedCodeRegex = /<generated_code>\s*([\s\S]*?)\s*<\/generated_code>/;
const generatedMatch = blockquoteContent.match(generatedCodeRegex);

if (generatedMatch && generatedMatch[1]) {
    console.log("Encontrado código dentro de <generated_code> tags");
    codeToProcess = generatedMatch[1].trim();
} else {
    // Si no hay <generated_code>, buscar bloques de código normales
    const codeBlockRegex = /```(?:typescript|ts)\s*([\s\S]*?)\s*```/;
    const match = blockquoteContent.match(codeBlockRegex);
    
    if (match && match[1]) {
        console.log("Encontrado bloque de código typescript/ts");
        codeToProcess = match[1];
    }
}

if (codeToProcess) {
    // Clean up the code before processing
    codeToProcess = codeToProcess.trim();
    console.log(`Bloque de código encontrado: ${codeToProcess.length} caracteres`);
    console.log(`Primeros 100 caracteres: "${codeToProcess.substring(0, 100)}..."`);

    try {
        // 3. Convertir el código aislado en un AST (Árbol de Sintaxis Abstracta).
        const ast = parser.parse(codeToProcess, {
            sourceType: "module",
            plugins: ["typescript"],
            allowImportExportEverywhere: true,
            allowReturnOutsideFunction: true
        });

        // 4. Recorrer el AST para encontrar el contenido de todos los bloques it().
        let foundItBlocks = false;
        traverse(ast, {
            CallExpression(path) {
                const callee = path.get('callee');
                if (callee.isIdentifier({ name: 'it' }) && path.node.arguments[0]) {
                    foundItBlocks = true;
                    const testName = path.node.arguments[0].value;
                    console.log(`Encontrado test: "${testName}"`);
                    
                    const callback = path.get('arguments.1');
                    if (callback.isArrowFunctionExpression() || callback.isFunctionExpression()) {
                        const bodyNode = callback.get('body').node;
                        
                        // 5. Generar la cadena de texto y limpiarla.
                        const generated = generate(bodyNode, {});
                        const testCode = generated.code.slice(1, -1).trim();

                        extractedTests.push({
                            testName: testName,
                            code: testCode
                        });

                        console.log(`Código extraído del test: "${testName}" (${testCode.length} caracteres)`);
                    }
                }
            }
        });

        // Si no se encontraron bloques it(), extraer todo el código como un test genérico
        if (!foundItBlocks) {
            console.log("No se encontraron bloques it(), extrayendo todo el código como test genérico");
            
            // Buscar comentarios que puedan indicar el nombre del test
            let testName = "Generic Test";
            const firstComment = codeToProcess.match(/\/\/\s*(.+)/);
            if (firstComment && firstComment[1]) {
                testName = firstComment[1].trim();
            }
            
            extractedTests.push({
                testName: testName,
                code: codeToProcess.trim()
            });
        }

    } catch (error) {
        console.error("Error al analizar el código:", error.message);
        console.log("Intentando extraer como código genérico sin parsing...");
        
        // Fallback: extraer todo el código sin parsing
        let testName = "Generic Test (Parse Failed)";
        const firstComment = codeToProcess.match(/\/\/\s*(.+)/);
        if (firstComment && firstComment[1]) {
            testName = firstComment[1].trim();
        }
        
        extractedTests.push({
            testName: testName,
            code: codeToProcess.trim()
        });
        
        console.log(`Código extraído como fallback: "${testName}" (${codeToProcess.length} caracteres)`);
    }
} else {
    console.log("No se encontró un bloque de código typescript/ts dentro de la sección de cita.");
    // Intentar buscar bloques de código sin especificar lenguaje
    const genericCodeBlockRegex = /```\n([\s\S]*?)\n```/;
    const genericMatch = blockquoteContent.match(genericCodeBlockRegex);
    if (genericMatch) {
        console.log("Se encontró un bloque de código genérico, pero no se pudo procesar como TypeScript");
    }
    return null;
}

// Imprimir el resultado final
console.log("--- CÓDIGO EXTRAÍDO ---");
if (extractedTests.length > 0) {
    console.log(`Se extrajeron ${extractedTests.length} test(s):`);
    extractedTests.forEach((test, index) => {
        console.log(`${index + 1}. ${test.testName}`);
    });
    return extractedTests;
} else {
    console.log("No se extrajo ningún código de test");
    return null;
}
}

// Función principal para manejar archivos o carpetas
function main() {
    const results = [];

    // Procesar todos los archivos .txt en la carpeta
    console.log(`Procesando carpeta: ${inputPath}`);
    
    const files = fs.readdirSync(inputPath);
    const txtFiles = files.filter(file => path.extname(file).toLowerCase() === '.txt');
    
    if (txtFiles.length === 0) {
        console.log('No se encontraron archivos .txt en la carpeta especificada.');
        process.exit(0);
    }
    
    console.log(`Encontrados ${txtFiles.length} archivos .txt para procesar.`);
    
    txtFiles.forEach(file => {
        const fullPath = path.join(inputPath, file);
        const result = processFile(fullPath);
        results.push(result);
    });    // Calcular estadísticas
    const successful = results.filter(r => !r.error && r.extractedCode && r.extractedCode.length > 0).length;
    const withErrors = results.filter(r => r.error).length;
    const withoutCode = results.filter(r => !r.error && (!r.extractedCode || r.extractedCode.length === 0)).length;
    
    // Guardar resultados en archivo JSON
    const outputFileName = `extracted_code_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const outputPath = path.join(process.cwd(), outputFileName);
    
    const finalResults = {
        totalFiles: results.length,
        processedAt: new Date().toISOString(),
        inputPath: inputPath,
        statistics: {
            successful: successful,
            withErrors: withErrors,
            withoutCode: withoutCode,
            successRate: results.length > 0 ? ((successful / results.length) * 100).toFixed(2) + '%' : '0%'
        },
        results: results
    };    try {
        fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2), 'utf8');
        console.log(`\n=== RESUMEN ===`);
        console.log(`Archivos procesados: ${results.length}`);
        console.log(`Extracciones exitosas: ${successful}`);
        console.log(`Con errores: ${withErrors}`);
        console.log(`Sin código extraído: ${withoutCode}`);
        console.log(`Tasa de éxito: ${finalResults.statistics.successRate}`);
        console.log(`Resultados guardados en: ${outputPath}`);
        
    } catch (error) {
        console.error(`Error al guardar los resultados:`, error.message);
        process.exit(1);
    }
}

// Ejecutar la función principal
main();