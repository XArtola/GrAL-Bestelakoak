import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

function removeItBlockContent(): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      function visit(node: ts.Node): ts.Node {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'it' &&
          node.arguments.length > 1
        ) {
          const description = node.arguments[0];
          const emptyBody = ts.factory.createBlock([], false);

          return ts.factory.createCallExpression(
            node.expression,
            undefined, // No type arguments needed here
            [
              description,
              ts.factory.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                undefined,
                emptyBody
              ),
            ]
          );
        }
        return ts.visitEachChild(node, visit, context);
      }

      return ts.visitNode(sourceFile, visit) as ts.SourceFile;
    };
  };
}

function processFiles(directoryPath: string): void {
  const files = fs.readdirSync(directoryPath);

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processFiles(filePath);
    } else if (filePath.endsWith(".spec.ts") || filePath.endsWith(".spec.js")) {
      const sourceFile = ts.createSourceFile(
        filePath,
        fs.readFileSync(filePath, 'utf8'),
        ts.ScriptTarget.Latest,
        false 
      );

      const transformedSourceFile = ts.transform(sourceFile, [
        removeItBlockContent(),
      ]);
      const modifiedSourceFile = transformedSourceFile.transformed[0] as ts.SourceFile;

      const printer = ts.createPrinter();
      const outputText = printer.printFile(modifiedSourceFile);

      fs.writeFileSync(filePath, outputText);

      console.log(`Processed: ${filePath}`);
    }
  }
}

// Get the target directory (containing the 'cypress' folder)
const targetDirectory = process.argv[2];

if (!targetDirectory) {
  console.error("Error: Please provide the target directory path as an argument.");
  console.error("Usage: node index.js <target-directory>");
  process.exit(1);
}

const cypressDirectory = path.join(targetDirectory, 'cypress');

if (!fs.existsSync(cypressDirectory)) {
  console.error(`Error: 'cypress' directory not found in: ${targetDirectory}`);
  process.exit(1);
}

processFiles(cypressDirectory);