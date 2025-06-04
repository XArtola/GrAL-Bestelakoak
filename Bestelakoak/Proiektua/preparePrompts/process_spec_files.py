import os
import glob

# Template content (from Test generation prompt.txt)
TEMPLATE_CONTENT = """
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
"""

# Directory containing the .spec.ts files (relative to the script location)
SPEC_FILES_DIR = 'ui'
# Output directory for the generated .txt files (current directory where the script is)
OUTPUT_DIR = '.'

def main():
    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Construct the absolute path to the spec files directory
    spec_dir_path = os.path.join(script_dir, SPEC_FILES_DIR)
    
    # Construct the absolute path to the output directory
    output_dir_path = os.path.join(script_dir, OUTPUT_DIR)

    # Ensure output directory exists
    if not os.path.exists(output_dir_path):
        os.makedirs(output_dir_path)
    
    # Find all .spec.ts files in the specified directory
    spec_files_pattern = os.path.join(spec_dir_path, '*.spec.ts')
    spec_files = glob.glob(spec_files_pattern)

    if not spec_files:
        print(f"No .spec.ts files found in {spec_dir_path} (pattern: {spec_files_pattern})")
        return

    print(f"Found {len(spec_files)} .spec.ts files in {spec_dir_path}")

    for spec_file_path in spec_files:
        try:
            with open(spec_file_path, 'r', encoding='utf-8') as f:
                spec_content = f.read()
            
            # Substitute the content into the template
            output_content = TEMPLATE_CONTENT.replace('{{CYPRESS_TEST_CODE}}', spec_content)
            
            # Create the output file name
            base_name = os.path.basename(spec_file_path) # e.g., auth.spec.ts
            # Output file name will be like auth.spec.txt (original name with .ts replaced by .txt)
            output_file_name = os.path.splitext(base_name)[0] + '.txt' 
            output_file_path = os.path.join(output_dir_path, output_file_name)
            
            with open(output_file_path, 'w', encoding='utf-8') as f:
                f.write(output_content)
            
            print(f"Generated: {output_file_path}")
            
        except Exception as e:
            print(f"Error processing {spec_file_path}: {e}")

if __name__ == '__main__':
    main()
