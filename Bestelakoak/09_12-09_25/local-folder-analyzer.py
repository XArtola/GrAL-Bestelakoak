import os
from tqdm import tqdm

def get_readme_content(folder_path):
    """
    Retrieve the content of the README file.
    """
    readme_path = os.path.join(folder_path, "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, 'r', encoding='utf-8') as f:
            return f.read()
    return "README not found."

def traverse_folder_iteratively(folder_path):
    """
    Traverse the folder iteratively to avoid recursion limits for large directories.
    """
    structure = ""
    for root, dirs, files in os.walk(folder_path):
        level = root.replace(folder_path, '').count(os.sep)
        indent = ' ' * 4 * level
        structure += f"{indent}{os.path.basename(root)}/\n"
        sub_indent = ' ' * 4 * (level + 1)
        for file in files:
            structure += f"{sub_indent}{file}\n"
    return structure

def get_file_contents_iteratively(folder_path):
    file_contents = ""
    binary_extensions = [
        # (list of binary extensions as in the original code)
        '.exe', '.dll', '.so', '.a', '.lib', '.dylib', '.o', '.obj',
        '.zip', '.tar', '.tar.gz', '.tgz', '.rar', '.7z', '.bz2', '.gz', '.xz', '.z', '.lz', '.lzma', '.lzo', '.rz', '.sz', '.dz',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
        '.png', '.jpg', '.jpeg', '.gif', '.mp3', '.mp4', '.wav', '.flac', '.ogg', '.avi', '.mkv', '.mov', '.webm', '.wmv', '.m4a', '.aac',
        '.iso', '.vmdk', '.qcow2', '.vdi', '.vhd', '.vhdx', '.ova', '.ovf',
        '.db', '.sqlite', '.mdb', '.accdb', '.frm', '.ibd', '.dbf',
        '.jar', '.class', '.war', '.ear', '.jpi',
        '.pyc', '.pyo', '.pyd', '.egg', '.whl',
        '.deb', '.rpm', '.apk', '.msi', '.dmg', '.pkg', '.bin', '.dat', '.data',
        '.dump', '.img', '.toast', '.vcd', '.crx', '.xpi', '.lockb', 'package-lock.json', '.svg',
        '.eot', '.otf', '.ttf', '.woff', '.woff2',
        '.ico', '.icns', '.cur',
        '.cab', '.dmp', '.msp', '.msm',
        '.keystore', '.jks', '.truststore', '.cer', '.crt', '.der', '.p7b', '.p7c', '.p12', '.pfx', '.pem', '.csr',
        '.key', '.pub', '.sig', '.pgp', '.gpg',
        '.nupkg', '.snupkg', '.appx', '.msix', '.msp', '.msu',
        '.deb', '.rpm', '.snap', '.flatpak', '.appimage',
        '.ko', '.sys', '.elf',
        '.swf', '.fla', '.swc',
        '.rlib', '.pdb', '.idb', '.pdb', '.dbg',
        '.sdf', '.bak', '.tmp', '.temp', '.log', '.tlog', '.ilk',
        '.bpl', '.dcu', '.dcp', '.dcpil', '.drc',
        '.aps', '.res', '.rsrc', '.rc', '.resx',
        '.prefs', '.properties', '.ini', '.cfg', '.config', '.conf',
        '.DS_Store', '.localized', '.svn', '.git', '.gitignore', '.gitkeep',
    ]

    for root, dirs, files in tqdm(os.walk(folder_path), desc="Processing files"):
        for file in files:
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, folder_path)
            file_contents += f"File: {relative_path}\n"

            if any(file.endswith(ext) for ext in binary_extensions):
                file_contents += "Content: Skipped binary file\n\n"
            else:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        file_contents += f"Content:\n{content}\n\n"
                except UnicodeDecodeError:
                    try:
                        with open(file_path, 'r', encoding='latin-1') as f:
                            content = f.read()
                            file_contents += f"Content (Latin-1 Decoded):\n{content}\n\n"
                    except:
                        file_contents += "Content: Skipped due to unsupported encoding\n\n"
                except Exception as e:
                    file_contents += f"Content: Skipped due to error: {str(e)}\n\n"

    return file_contents

def get_folder_contents(folder_path):
    """
    Main function to get folder contents.
    """
    folder_name = os.path.basename(folder_path)

    print(f"Fetching README for: {folder_name}")
    readme_content = get_readme_content(folder_path)

    print(f"\nFetching folder structure for: {folder_name}")
    folder_structure = f"Folder Structure: {folder_name}\n"
    folder_structure += traverse_folder_iteratively(folder_path)

    print(f"\nFetching file contents for: {folder_name}")
    file_contents = get_file_contents_iteratively(folder_path)

    instructions = f"Prompt: Analyze the {folder_name} folder to understand its structure, purpose, and functionality. Follow these steps to study the codebase:\n\n"
    instructions += "1. Read the README file to gain an overview of the project, its goals, and any setup instructions.\n\n"
    instructions += "2. Examine the folder structure to understand how the files and directories are organized.\n\n"
    instructions += "3. Identify the main entry point of the application (e.g., main.py, app.py, index.js) and start analyzing the code flow from there.\n\n"
    instructions += "4. Study the dependencies and libraries used in the project to understand the external tools and frameworks being utilized.\n\n"
    instructions += "5. Analyze the core functionality of the project by examining the key modules, classes, and functions.\n\n"
    instructions += "6. Look for any configuration files (e.g., config.py, .env) to understand how the project is configured and what settings are available.\n\n"
    instructions += "7. Investigate any tests or test directories to see how the project ensures code quality and handles different scenarios.\n\n"
    instructions += "8. Review any documentation or inline comments to gather insights into the codebase and its intended behavior.\n\n"
    instructions += "9. Identify any potential areas for improvement, optimization, or further exploration based on your analysis.\n\n"
    instructions += "10. Provide a summary of your findings, including the project's purpose, key features, and any notable observations or recommendations.\n\n"
    instructions += "Use the files and contents provided below to complete this analysis:\n\n"

    return folder_name, instructions, readme_content, folder_structure, file_contents

if __name__ == '__main__':
    folder_path = input("Please enter the local folder path: ")
    try:
        folder_name, instructions, readme_content, folder_structure, file_contents = get_folder_contents(folder_path)
        output_filename = f'{folder_name}_contents.txt'
        with open(output_filename, 'w', encoding='utf-8') as f:
            f.write(instructions)
            f.write(f"README:\n{readme_content}\n\n")
            f.write(folder_structure)
            f.write('\n\n')
            f.write(file_contents)
        print(f"Folder contents saved to '{output_filename}'.")
    except Exception as e:
        print(f"An error occurred: {e}")
        print("Please check the folder path and try again.")
