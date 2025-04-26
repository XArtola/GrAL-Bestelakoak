"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var fs = require("fs");
var path = require("path");
function removeItBlockContent() {
    return function (context) {
        return function (sourceFile) {
            function visit(node) {
                if (ts.isCallExpression(node) &&
                    ts.isIdentifier(node.expression) &&
                    node.expression.text === 'it' &&
                    node.arguments.length > 1) {
                    var description = node.arguments[0];
                    var emptyBody = ts.factory.createBlock([], false);
                    return ts.factory.createCallExpression(node.expression, undefined, // No type arguments needed here
                    [
                        description,
                        ts.factory.createArrowFunction(undefined, undefined, [], undefined, undefined, emptyBody),
                    ]);
                }
                return ts.visitEachChild(node, visit, context);
            }
            return ts.visitNode(sourceFile, visit);
        };
    };
}
function processFiles(directoryPath) {
    var files = fs.readdirSync(directoryPath);
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var file = files_1[_i];
        var filePath = path.join(directoryPath, file);
        var stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            processFiles(filePath);
        }
        else if (filePath.endsWith(".spec.ts") || filePath.endsWith(".spec.js")) {
            var sourceFile = ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, false);
            var transformedSourceFile = ts.transform(sourceFile, [
                removeItBlockContent(),
            ]);
            var modifiedSourceFile = transformedSourceFile.transformed[0];
            var printer = ts.createPrinter();
            var outputText = printer.printFile(modifiedSourceFile);
            fs.writeFileSync(filePath, outputText);
            console.log("Processed: ".concat(filePath));
        }
    }
}
// Get the target directory (containing the 'cypress' folder)
var targetDirectory = process.argv[2];
if (!targetDirectory) {
    console.error("Error: Please provide the target directory path as an argument.");
    console.error("Usage: node index.js <target-directory>");
    process.exit(1);
}
var cypressDirectory = path.join(targetDirectory, 'cypress');
if (!fs.existsSync(cypressDirectory)) {
    console.error("Error: 'cypress' directory not found in: ".concat(targetDirectory));
    process.exit(1);
}
processFiles(cypressDirectory);
