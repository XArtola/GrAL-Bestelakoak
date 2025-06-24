// split-specs.js
import fs from 'fs';
import path from 'path';

// Función principal del transformador de JSCodeshift
export default function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source); // Parsea el código fuente a un AST

  // Encuentra todos los nodos de llamada a la función 'it'
  // Nota: Buscamos la CallExpression, pero necesitamos operar sobre el
  //       Statement que la contiene (usualmente ExpressionStatement) para removerla correctamente.
  const itPaths = root.find(j.CallExpression, {
    callee: { name: 'it' },
  }).paths(); // Obtenemos los "paths" para tener más contexto

  // Si no hay bloques 'it' o solo hay uno, no hacemos nada con este archivo.
  if (itPaths.length <= 1) {
    console.log(`-> Archivo ${fileInfo.path}: ${itPaths.length} bloque(s) 'it' encontrados. No se requiere división.`);
    return null; // No se generan nuevos archivos
  }

  console.log(`-> Archivo ${fileInfo.path}: ${itPaths.length} bloque(s) 'it' encontrados. Generando archivos individuales...`);

  const originalPath = fileInfo.path;
  const dir = path.dirname(originalPath);
  const ext = path.extname(originalPath); // Debería ser '.ts'
  const baseName = path.basename(originalPath, ext); // Ej: 'mi-componente.spec'

  // --- Generación de un archivo por cada bloque 'it' ---
  itPaths.forEach((targetItPath, index) => {
    // 1. Crear una copia FRESCAdel AST original para cada archivo de salida
    //    La forma más simple es volver a parsear la fuente original.
    const astCopy = j(fileInfo.source);

    // 2. Encontrar TODOS los 'it' DENTRO DE ESTA COPIA del AST
    const allItPathsInCopy = astCopy.find(j.CallExpression, {
        callee: { name: 'it' },
      }).paths();

    // 3. Identificar el nodo 'it' específico que queremos MANTENER en esta copia
    //    (Basado en la posición/estructura, no es trivial comparar nodos directamente entre ASTs parseados por separado,
    //     pero podemos asumir que el índice en la búsqueda será consistente si el código no cambia)
    const nodeToKeep = targetItPath.node;

    // 4. Eliminar TODOS los otros bloques 'it' de la copia del AST
    allItPathsInCopy.forEach(currentItPathInCopy => {
      // Comparamos los nodos originales para saber cuál mantener.
      // Es una comparación superficial, pero debería funcionar si los nodos no son idénticos.
      // Una comparación más robusta podría usar localizaciones (línea/columna) si fuera necesario.
      if (currentItPathInCopy.node !== nodeToKeep) {
         try {
             // Intentamos eliminar el 'statement' padre (usualmente ExpressionStatement)
             // que contiene la llamada a 'it'. Esto es más limpio que eliminar solo la llamada.
             const parentStatementPath = currentItPathInCopy.parentPath;
             if (parentStatementPath.node.type === 'ExpressionStatement') {
                 j(parentStatementPath).remove();
             } else {
                 // Si 'it' no está directamente en un ExpressionStatement (raro en specs),
                 // podríamos necesitar lógica más compleja. Por ahora, intentamos quitar el 'it'.
                 j(currentItPathInCopy).remove();
                 console.warn(`Advertencia: El bloque 'it' en ${fileInfo.path} (línea ${currentItPathInCopy.node.loc?.start?.line}) no estaba en un ExpressionStatement directo. Se eliminó la llamada, pero podría quedar código residual.`);
             }
         } catch (error) {
              console.error(`Error al intentar eliminar un bloque 'it' en ${fileInfo.path} para el archivo ${index + 1}:`, error);
         }
      }
    });

    // 5. Generar el código fuente desde el AST modificado (solo con un 'it')
    //    Usamos las opciones de Recast (implícitas en jscodeshift) para intentar mantener el formato.
    const outputSource = astCopy.toSource({ quote: 'single', trailingComma: true });

    // 6. Construir el nuevo nombre de archivo
    //    Ej: mi-componente.spec.ts -> mi-componente.spec1.ts, mi-componente.spec2.ts
    const newFileName = `${baseName}${index + 1}${ext}`;
    const newFilePath = path.join(dir, newFileName);

    // 7. Escribir el nuevo archivo
    try {
      fs.writeFileSync(newFilePath, outputSource);
      console.log(`   Creado: ${newFilePath}`);
    } catch (error) {
      console.error(`Error al escribir el archivo ${newFilePath}:`, error);
    }
  });

  // Importante: Devolvemos 'null' para indicar a jscodeshift que NO
  // sobrescriba el archivo original. Nosotros ya hemos creado los nuevos archivos.
  return null;
}

// Opcional: Indica a jscodeshift que use el parser de Babel (que soporta TS)
// Esto suele ser necesario si no pasas --parser=ts en la línea de comandos.
// export const parser = 'ts'; // O 'tsx' si tienes JSX