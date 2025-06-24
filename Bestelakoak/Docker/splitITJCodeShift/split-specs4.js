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

    // 5. --- NUEVO PASO: Eliminar bloques 'describe' vacíos ---
    try {
        const describePaths = astCopy.find(j.CallExpression, {
            callee: { name: 'describe' }
        }).paths();

        // Iterar en REVERSA es importante al eliminar nodos para no afectar índices/paths
        describePaths.reverse().forEach(describePath => {
            let isEmpty = false;
            try {
                // Acceder al cuerpo (BlockStatement) de la función del describe
                const describeFunc = describePath.node.arguments[1]; // El callback es usualmente el 2º argumento
                let blockStatementNode;

                if (describeFunc && (describeFunc.type === 'FunctionExpression' || describeFunc.type === 'ArrowFunctionExpression') && describeFunc.body.type === 'BlockStatement') {
                     blockStatementNode = describeFunc.body;
                } else {
                     // Si la estructura no es la esperada, no lo consideramos vacío por seguridad
                     console.warn(`Advertencia: Estructura inesperada en describe (línea ${describePath.node.loc?.start?.line}) en ${fileInfo.path} para archivo ${index + 1}. No se limpiará.`);
                     return; // Saltar al siguiente describe
                }

                // Comprobar si el cuerpo contiene llamadas relevantes
                const relevantCalls = j(blockStatementNode).find(j.CallExpression, node =>
                    ['it', 'describe', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'].includes(node.callee?.name) // Optional chaining por si callee no existe
                );

                if (relevantCalls.length === 0) {
                    // No hay llamadas relevantes, consideramos el describe vacío
                    isEmpty = true;
                }

            } catch (findError){
                 console.error(`Error inspeccionando cuerpo de describe (línea ${describePath.node.loc?.start?.line}) en ${fileInfo.path} para archivo ${index + 1}:`, findError);
                 // No eliminar si hubo error al inspeccionar
                 isEmpty = false;
            }


            if (isEmpty) {
                 // Eliminar el ExpressionStatement que contiene la llamada al describe
                 const parentStatementPath = describePath.parentPath;
                 if (parentStatementPath.node.type === 'ExpressionStatement') {
                     j(parentStatementPath).remove();
                     console.log(`   - Describe vacío eliminado (línea ${describePath.node.loc?.start?.line}) en archivo ${index + 1}`);
                 } else {
                     console.warn(`Advertencia: Describe vacío (línea ${describePath.node.loc?.start?.line}) no estaba en un ExpressionStatement directo. No se eliminó.`);
                 }
            }
        });
    } catch (error) {
        console.error(`Error durante la limpieza de bloques describe en ${fileInfo.path} para archivo ${index + 1}:`, error);
    }
    // --- FIN NUEVO PASO ---


    // 6. Generar código fuente desde el AST modificado (ahora también sin describes vacíos)
    const outputSource = astCopy.toSource({ quote: 'single', trailingComma: true });

    // 7. Construir nuevo nombre de archivo y ruta de directorio de resultados
    const resultsDir = path.join(dir, 'results'); // Directorio de resultados
    const newFileName = `${baseName}${index + 1}${ext}`;
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