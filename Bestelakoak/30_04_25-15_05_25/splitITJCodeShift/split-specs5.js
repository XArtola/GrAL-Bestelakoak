// split-specs.js
import fs from 'fs';
import path from 'path';

// --- Helper Function ---
const locationsAreEqual = (locA, locB) => {
    if (!locA || !locB) return false;
    try {
        return (
            locA.start.line === locB.start.line &&
            locA.start.column === locB.start.column &&
            locA.end.line === locB.end.line &&
            locA.end.column === locB.end.column
        );
    } catch(e) {
        console.error("Error comparando localizaciones:", e);
        return false;
    }
};
// --- Fin Helper ---

export default function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const itPaths = root.find(j.CallExpression, {
    callee: { name: 'it' },
  }).paths();

  if (itPaths.length <= 1) {
    return undefined;
  }

  console.log(`-> Archivo ${fileInfo.path}: ${itPaths.length} bloque(s) 'it' encontrados. Generando archivos individuales...`);

  const originalPath = fileInfo.path;
  const dir = path.dirname(originalPath);
  const ext = path.extname(originalPath);
  const baseName = path.basename(originalPath, ext);

  itPaths.forEach((targetItPath, index) => {
    // 1. Crear copia fresca del AST
    const astCopy = j(fileInfo.source);

    // 2. Encontrar todos los 'it' en la copia
    const allItPathsInCopy = astCopy.find(j.CallExpression, {
        callee: { name: 'it' },
      }).paths();

    // 3. Obtener la ubicación del 'it' a conservar
    const targetLoc = targetItPath.node.loc;
    if (!targetLoc) {
        console.error(`Error Crítico: Falta información de ubicación para el bloque 'it' (índice ${index}) en ${fileInfo.path}. No se puede generar archivo ${index + 1}.`);
        return;
    }

    // 4. Eliminar los 'it' cuya ubicación NO COINCIDA
    allItPathsInCopy.forEach(currentItPathInCopy => {
        const currentLoc = currentItPathInCopy.node.loc;
        if (!locationsAreEqual(currentLoc, targetLoc)) {
            try {
                 const parentStatementPath = currentItPathInCopy.parentPath;
                 if (parentStatementPath.node.type === 'ExpressionStatement' && parentStatementPath.parentPath?.node?.type) {
                     j(parentStatementPath).remove();
                 } else {
                     j(currentItPathInCopy).remove();
                     console.warn(`Advertencia: Estructura inesperada para bloque 'it' en ${fileInfo.path} (línea ${currentLoc?.start?.line}). Revise el archivo ${index + 1}.`);
                 }
            } catch (error) {
                console.error(`Error eliminando bloque 'it' (línea ${currentLoc?.start?.line}) en ${fileInfo.path} para archivo ${index + 1}:`, error);
            }
        }
    });

    // 5. --- NUEVO PASO: Eliminar bloques 'describe' o 'context' vacíos ---
    try {
        const suitePaths = astCopy.find(j.CallExpression)
            .filter(path =>
                path.node.callee.type === 'Identifier' &&
                ['describe', 'context'].includes(path.node.callee.name)
            )
            .paths();

        // Iterar en REVERSA es importante al eliminar nodos para no afectar índices/paths
        suitePaths.reverse().forEach(suitePath => {
            let isEffectivelyEmpty = false;
            try {
                // Acceder al cuerpo (BlockStatement) de la función del describe/context
                const suiteFunc = suitePath.node.arguments[1]; // El callback es usualmente el 2º argumento
                let blockStatementNode;

                if (suiteFunc && (suiteFunc.type === 'FunctionExpression' || suiteFunc.type === 'ArrowFunctionExpression') && suiteFunc.body.type === 'BlockStatement') {
                     blockStatementNode = suiteFunc.body;
                } else {
                     console.warn(`Advertencia: Estructura inesperada en describe/context (línea ${suitePath.node.loc?.start?.line}) en ${fileInfo.path} para archivo ${index + 1}. No se considerará para limpieza.`);
                     return; // Saltar al siguiente suitePath
                }

                // Comprobar si el cuerpo contiene llamadas 'it'
                const itCallsInBlock = j(blockStatementNode).find(j.CallExpression, {
                    callee: { name: 'it' }
                });

                if (itCallsInBlock.length === 0) {
                    // No hay llamadas 'it' en este bloque describe/context.
                    isEffectivelyEmpty = true;
                }

            } catch (findError){
                 console.error(`Error inspeccionando cuerpo de describe/context (línea ${suitePath.node.loc?.start?.line}) en ${fileInfo.path} para archivo ${index + 1}:`, findError);
                 isEffectivelyEmpty = false; // No eliminar si hubo error al inspeccionar
            }

            if (isEffectivelyEmpty) {
                 const parentStatementPath = suitePath.parentPath;
                 if (parentStatementPath.node.type === 'ExpressionStatement') {
                     j(parentStatementPath).remove();
                     console.log(`   - Describe/Context (línea ${suitePath.node.loc?.start?.line}) eliminado en archivo ${index + 1} por no contener bloques 'it'.`);
                 } else {
                     console.warn(`Advertencia: Describe/Context (línea ${suitePath.node.loc?.start?.line}) sin bloques 'it' no estaba en un ExpressionStatement directo y no se eliminó. Archivo ${index + 1}.`);
                 }
            }
        });
    } catch (error) {
        console.error(`Error durante la limpieza de bloques describe/context en ${fileInfo.path} para archivo ${index + 1}:`, error);
    }
    // --- FIN NUEVO PASO ---

    // 5.1 --- NUEVO PASO: Desenvolver 'context' si solo contiene el bloque 'it' objetivo ---
    try {
        const contextCallPaths = astCopy.find(j.CallExpression, {
            callee: { name: 'context' }
        }).paths();

        contextCallPaths.reverse().forEach(contextCallPath => {
            const contextNode = contextCallPath.node;
            if (!contextNode.arguments || contextNode.arguments.length < 2) return;

            const contextCallback = contextNode.arguments[1];
            if (!contextCallback || !contextCallback.body || contextCallback.body.type !== 'BlockStatement') return;

            const contextBodyNode = contextCallback.body;
            // Verificar que el cuerpo del context contenga exactamente una declaración
            if (!contextBodyNode.body || contextBodyNode.body.length !== 1) {
                return;
            }

            const singleStatementInContextBody = contextBodyNode.body[0];
            // Verificar que la única declaración sea una ExpressionStatement que llama a 'it'
            if (singleStatementInContextBody.type === 'ExpressionStatement' &&
                singleStatementInContextBody.expression &&
                singleStatementInContextBody.expression.type === 'CallExpression' &&
                singleStatementInContextBody.expression.callee &&
                singleStatementInContextBody.expression.callee.name === 'it') {

                // Este 'context' contiene únicamente una llamada 'it'.
                // Dado que otros 'it' fueron eliminados en el paso 4, este 'it' es el objetivo.
                const contextStatementPath = contextCallPath.parentPath;
                if (contextStatementPath.node.type === 'ExpressionStatement') {
                    // Reemplazar el ExpressionStatement del 'context' con el ExpressionStatement del 'it'
                    j(contextStatementPath).replaceWith(singleStatementInContextBody);
                    console.log(`   - Contexto desenvuelto (línea ${contextNode.loc?.start?.line}) en archivo ${index + 1} porque solo contenía un bloque 'it'.`);
                } else {
                    console.warn(`Advertencia: Contexto (línea ${contextNode.loc?.start?.line}) que solo contenía un 'it' no estaba en un ExpressionStatement directo. No se desenvolvió en archivo ${index + 1}.`);
                }
            }
        });
    } catch (error) {
        console.error(`Error durante el desenvolvimiento de bloques 'context' en ${fileInfo.path} para archivo ${index + 1}:`, error);
    }
    // --- FIN NUEVO PASO 5.1 ---

    // 6. Generar código fuente desde el AST modificado (ahora también sin describes vacíos)
    const outputSource = astCopy.toSource({ quote: 'single', trailingComma: true });

    // 7. Construir nuevo nombre de archivo y ruta de directorio de resultados
    const resultsDir = path.join(dir, 'results'); // Directorio de resultados
    
    let newFileName;
    if (baseName.endsWith('.spec')) {
      const nameWithoutSpec = baseName.substring(0, baseName.length - '.spec'.length);
      newFileName = `${nameWithoutSpec}${index + 1}.spec${ext}`;
    } else {
      // Fallback for other naming conventions if needed, or stick to original logic
      // For now, let's assume files are *.spec.ext or handle as an error/warning
      // Sticking to a modified version of original logic for non .spec files for broader compatibility
      newFileName = `${baseName}${index + 1}${ext}`;
      console.warn(`   Advertencia: El archivo base "${baseName}${ext}" no termina con '.spec'. Se usó el formato de nombre: ${newFileName}`);
    }
    // const newFileName = `${baseName}${index + 1}${ext}`; // Original line
    const newFilePath = path.join(resultsDir, newFileName); // Ruta completa en 'results'

    // 8. Asegurarse de que el directorio 'results' exista
    try {
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
            console.log(`   Directorio 'results' creado en: ${resultsDir}`);
        }
    } catch (error) {
        console.error(`Error creando directorio ${resultsDir}:`, error);
        return; // No continuar si no se puede crear el directorio
    }


    // 9. Escribir el nuevo archivo en el directorio 'results'
    try {
      fs.writeFileSync(newFilePath, outputSource);
      console.log(`   Creado: ${newFilePath}`);
    } catch (error) {
      console.error(`Error escribiendo archivo ${newFilePath}:`, error);
    }
  });

  // Devolver undefined/null para no modificar el original
  return undefined;
}

// export const parser = 'ts';