import os
import re
from datetime import datetime

class LocalRepoScraper:
    """Scrapes local repositories (folders)."""

    def __init__(self, repo_path, output_path, output_filename, selected_file_types=None):
        if selected_file_types is None:
            selected_file_types = []
        self.repo_path = repo_path
        self.output_path = output_path
        self.output_filename = output_filename
        self.selected_file_types = selected_file_types

    def fetch_all_files(self):
        """Fetches content from all files in the local repository."""
        files_data = []
        for root, _, files in os.walk(self.repo_path):
            for filename in files:
                # Check file type if filter is applied
                if not self.selected_file_types or any(filename.endswith(ext) for ext in self.selected_file_types):
                    file_path = os.path.join(root, filename)
                    relative_path = os.path.relpath(file_path, self.repo_path) 
                    file_content = f"\n'''--- {relative_path} ---\n"
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            file_content += f.read()
                    except UnicodeDecodeError:
                        print(f"Skipping file {file_path}: Could not decode using UTF-8.")
                        continue  # Skip to the next file
                    except Exception as e:
                        print(f"Error reading file {file_path}: {e}")
                        continue
                    file_content += "\n'''"
                    files_data.append(file_content)
        return files_data

    def write_to_file(self, files_data):
        """Writes the scraped data to a .txt file."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{self.output_filename}_{timestamp}.txt"
        output_file_path = os.path.join(self.output_path, filename)
        with open(output_file_path, "w", encoding='utf-8') as f:
            f.write(f"*Local Repository: {self.repo_path}*\n")
            for file_data in files_data:
                f.write(file_data)
        return output_file_path

    def clean_up_text(self, filename):
        """Cleans up excessive line breaks in the generated .txt file."""
        with open(filename, 'r', encoding='utf-8') as f:
            text = f.read()
        cleaned_text = re.sub(r'\n{3,}', '\n\n', text)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(cleaned_text)

    def run(self):
        """Executes the scraping and file writing process."""
        print("Fetching all files...")
        files_data = self.fetch_all_files()

        print("Writing to file...")
        filename = self.write_to_file(files_data)

        print("Cleaning up file...")
        self.clean_up_text(filename)

        print(f"Done. Output written to: {filename}")

# Example usage:
if __name__ == "__main__":
    repo_path = "../cypress-realworld-app-develop"  # Path to your local repository
    output_path = "."  # Path to the output directory
    output_filename = "output"  # Output filename (without extension)
    selected_file_types = ['.py', '.js', '.html', '.css'] # Optional: Specify file types

    scraper = LocalRepoScraper(repo_path, output_path, output_filename, selected_file_types)
    scraper.run() 