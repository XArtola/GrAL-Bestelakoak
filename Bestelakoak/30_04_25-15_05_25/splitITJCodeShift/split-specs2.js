// split-specs.js
import fs from 'fs';
import path from 'path';

// --- Helper Function ---
// Compara si dos objetos de ubicación AST son iguales
const locationsAreEqual = (locA, locB) => {
    if (!locA || !locB) return false; // Safety check si falta info de ubicación
    try {
        return (
            locA.start.line === locB.start.line &&
            locA.start.column === locB.start.column &&
            locA.end.line === locB.end.line &&
            locA.end.column === locB.end.column
        );
    } catch(e) {
        // En caso de error accediendo a las propiedades (muy raro)
        console.error("Error comparando localizaciones:", e);
        return false;
    }
};
// --- Fin Helper ---


// Función principal del transformador de JSCodeshift
export default function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source); // Parsea el código fuente original

  // Encuentra todos los nodos de llamada a la función 'it' en el AST original
  const itPaths = root.find(j.CallExpression, {
    callee: { name: 'it' },
  }).paths();

  // Si no hay bloques 'it' o solo hay uno, no hacemos nada con este archivo.
  if (itPaths.length <= 1) {
    // console.log(`-> Archivo ${fileInfo.path}: ${itPaths.length} bloque(s) 'it'. No se requiere división.`);
    // Devolver null/undefined hace que jscodeshift lo cuente como 'skipped'
    return undefined;
  }

  console.log(`-> Archivo ${fileInfo.path}: ${itPaths.length} bloque(s) 'it' encontrados. Generando archivos individuales...`);

  const originalPath = fileInfo.path;
  const dir = path.dirname(originalPath);
  const ext = path.extname(originalPath);
  const baseName = path.basename(originalPath, ext);

  // --- Generación de un archivo por cada bloque 'it' ---
  itPaths.forEach((targetItPath, index) => {
    // 1. Crear una copia FRESCA del AST original para CADA archivo de salida
    const astCopy = j(fileInfo.source);

    // 2. Encontrar TODOS los 'it' DENTRO DE ESTA COPIA del AST
    const allItPathsInCopy = astCopy.find(j.CallExpression, {
        callee: { name: 'it' },
      }).paths();

    // 3. Obtener la ubicación del nodo 'it' que queremos MANTENER (del AST original)
    const targetLoc = targetItPath.node.loc;

    // Seguridad: Si por alguna razón el nodo original no tiene 'loc', no podemos continuar esta iteración.
    if (!targetLoc) {
        console.error(`Error Crítico: Falta información de ubicación para el bloque 'it' (índice ${index}) en ${fileInfo.path}. No se puede generar archivo ${index + 1}.`);
        return; // Saltar a la siguiente iteración del forEach
    }

    // 4. Eliminar TODOS los otros bloques 'it' cuya ubicación NO COINCIDA con targetLoc
    allItPathsInCopy.forEach(currentItPathInCopy => {
        const currentLoc = currentItPathInCopy.node.loc;

        // Si las ubicaciones NO coinciden, ESTE es un nodo para eliminar
        if (!locationsAreEqual(currentLoc, targetLoc)) {
            try {
                // Intentar eliminar el 'statement' padre (usualmente ExpressionStatement)
                 const parentStatementPath = currentItPathInCopy.parentPath;
                 if (parentStatementPath.node.type === 'ExpressionStatement' && parentStatementPath.parentPath?.node?.type) {
                     // Comprobación extra: Asegurarse de que el abuelo existe (para evitar errores en el borde del AST)
                     j(parentStatementPath).remove();
                 } else {
                     j(currentItPathInCopy).remove(); // Fallback menos ideal
                     console.warn(`Advertencia: Estructura inesperada para bloque 'it' en ${fileInfo.path} (línea ${currentLoc?.start?.line}). Revise el archivo ${index + 1}.`);
                 }
            } catch (error) {
                console.error(`Error eliminando bloque 'it' (línea ${currentLoc?.start?.line}) en ${fileInfo.path} para archivo ${index + 1}:`, error);
            }
        }
        // Else: Las ubicaciones coinciden -> Este es el nodo a conservar, NO HACER NADA.
    });

    // 5. Generar código fuente desde el AST modificado
    const outputSource = astCopy.toSource({ quote: 'single', trailingComma: true });

    // 6. Construir nuevo nombre de archivo
    const newFileName = `${baseName}${index + 1}${ext}`;
    const newFilePath = path.join(dir, newFileName);

    // 7. Escribir el nuevo archivo
    try {
      fs.writeFileSync(newFilePath, outputSource);
      console.log(`   Creado: ${newFilePath}`);
    } catch (error) {
      console.error(`Error escribiendo archivo ${newFilePath}:`, error);
    }
  });

  // Importante: Devolver undefined/null para no modificar el original
  return undefined;
}

// Opcional pero recomendado si no usas --parser=ts en la línea de comandos
// export const parser = 'ts';