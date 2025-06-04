const fs = require('fs');
const path = require('path');

// Template content (from Test generation prompt.txt)
const TEMPLATE_CONTENT = `
You are tasked with generating the code inside the 'it' blocks for a Cypress test suite. The test suite is for user sign-up and login functionality. You will be provided with the test suite structure and user information to use in your generated code.

Here is the Cypress test code structure:

<cypress_test_code>
{{CYPRESS_TEST_CODE}}
</cypress_test_code>

And here is the user information to use in your tests:

<user_info>
{{USER_INFO}}
</user_info>

Your task is to generate the code inside each 'it' block so that the Cypress test runs and gets positive results. Follow these guidelines:

1. For each 'it' block, write Cypress commands that test the functionality described in the test name.
2. Use the provided user information (firstName, lastName, username, password) in your test commands where appropriate.
3. Ensure that your generated code follows Cypress best practices and conventions.
4. Include appropriate assertions to verify the expected behavior of each test.
5. If a test requires multiple steps, use comments to explain each step.
6. Do not modify the existing code structure or add new 'it' blocks.

When using the user information, refer to it as 'userInfo' followed by the property name, e.g., 'userInfo.firstName'.

If you encounter any scenarios where you need additional information that isn't provided, do not make assumptions. Instead, indicate that more information is needed for that specific test.

For error handling tests, use invalid data that is clearly different from the provided user information.

Place your generated code for each 'it' block within <generated_code> tags, and include the original 'it' block description as a comment before each block of generated code.

Begin generating the code for each 'it' block now.
`;

function main() {
    // Get command line arguments
    const args = process.argv.slice(2); // First two are node executable and script path

    if (args.length < 3) {
        console.error("Usage: node process_spec_files.js <spec_files_directory_path> <user_info_json_file_path> <output_directory_path>");
        process.exit(1);
    }

    const specFilesDirPathArg = args[0];
    const userInfoJsonPathArg = args[1];
    const outputDirPathArg = args[2];

    // Get the directory where the script is located
    const scriptDir = __dirname;

    // Resolve paths provided as arguments. Assume they can be relative to the script dir or absolute.
    const specDirPath = path.resolve(scriptDir, specFilesDirPathArg);
    const userInfoJsonPath = path.resolve(scriptDir, userInfoJsonPathArg);
    const outputDirPath = path.resolve(scriptDir, outputDirPathArg);

    // Load user information from JSON file
    let userInfoData = {};
    try {
        if (fs.existsSync(userInfoJsonPath)) {
            const userInfoContent = fs.readFileSync(userInfoJsonPath, 'utf-8');
            userInfoData = JSON.parse(userInfoContent);
        } else {
            console.warn(`User info JSON file not found: ${userInfoJsonPath}. {{USER_INFO}} will be blank.`);
        }
    } catch (error) {
        console.error(`Error reading or parsing ${userInfoJsonPath}: ${error.message}. {{USER_INFO}} will be blank.`);
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDirPath)) {
        try {
            fs.mkdirSync(outputDirPath, { recursive: true });
            console.log(`Created output directory: ${outputDirPath}`);
        } catch (error) {
            console.error(`Error creating output directory ${outputDirPath}: ${error.message}`);
            process.exit(1);
        }
    }

    let specFiles;
    try {
        specFiles = fs.readdirSync(specDirPath)
            .filter(file => file.endsWith('.spec.ts'))
            .map(file => path.join(specDirPath, file));
    } catch (error) {
        console.error(`Error reading directory ${specDirPath}: ${error.message}`);
        return;
    }

    if (!specFiles || specFiles.length === 0) {
        console.log(`No .spec.ts files found in ${specDirPath}`);
        return;
    }

    console.log(`Found ${specFiles.length} .spec.ts files in ${specDirPath}`);

    specFiles.forEach(specFilePath => {
        try {
            const specContent = fs.readFileSync(specFilePath, 'utf-8');
            const baseName = path.basename(specFilePath); // e.g., auth.spec.ts or auth1.spec.ts

            // Determine the key for userInfoData lookup
            let userInfoKey = baseName;
            const match = baseName.match(/^(.*?)(\d+)(\.spec\.ts)$/);
            if (match && match[1] && match[3]) {
                // If baseName is like "name123.spec.ts", use "name.spec.ts" as the key
                userInfoKey = match[1] + match[3];
            }

            // Get user info for the current file from the loaded JSON data
            const userInfoForFile = userInfoData[userInfoKey];
            let userInfoString = ''; // Default to blank

            if (userInfoForFile !== undefined) {
                if (typeof userInfoForFile === 'string') {
                    userInfoString = userInfoForFile;
                } else {
                    // If it's an object or array, stringify it nicely
                    userInfoString = JSON.stringify(userInfoForFile, null, 2);
                }
            }

            // Substitute the content into the template
            let outputContent = TEMPLATE_CONTENT.replace('{{CYPRESS_TEST_CODE}}', specContent);
            outputContent = outputContent.replace('{{USER_INFO}}', userInfoString);

            // Create the output file name
            const outputFileName = baseName.replace('.spec.ts', '.spec.txt');
            const outputFilePath = path.join(outputDirPath, outputFileName);

            fs.writeFileSync(outputFilePath, outputContent, 'utf-8');

            console.log(`Generated: ${outputFilePath}`);

        } catch (e) {
            console.error(`Error processing ${specFilePath}: ${e.message}`);
        }
    });
}

if (require.main === module) {
    main();
}