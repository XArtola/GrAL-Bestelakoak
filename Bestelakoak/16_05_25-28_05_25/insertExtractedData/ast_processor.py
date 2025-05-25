import json
import os
import glob
import shutil
import re
from typing import Dict, List, Any

def load_json_data(filepath: str) -> List[Dict[str, Any]]:
    """Load the processing time data from JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)

def extract_code_content(data: List[Dict[str, Any]]) -> List[str]:
    """Extract just the file_content from the data."""
    return [item['file_content'] for item in data if 'file_content' in item]

def parse_js_code(code_content: str):
    """This would use a JavaScript parser. For demonstration, we'll just identify some patterns."""
    # In a real implementation, you might use a library like esprima-python
    patterns = {
        'cy_commands': len([line for line in code_content.split('\n') if 'cy.' in line]),
        'assertions': len([line for line in code_content.split('\n') if '.should(' in line]),
        'test_blocks': code_content.count('it(')
    }
    return patterns

def analyze_files(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze all files in the dataset."""
    results = {
        'total_files': len(data),
        'total_processing_time': sum(item.get('durationMs', 0) for item in data),
        'file_analysis': []
    }
    
    for item in data:
        if 'file_content' in item:
            code_stats = parse_js_code(item['file_content'])
            results['file_analysis'].append({
                'source_file': item.get('source_file', 'unknown'),
                'duration_ms': item.get('durationMs', 0),
                'code_stats': code_stats
            })
    
    return results

def generate_cypress_test_file(file_prefix: str, content: str) -> str:
    """Generate a complete Cypress test file with the content placed inside an it() block."""
    # Convert file prefix to a readable description
    test_description = ' '.join(
        word.capitalize() for word in file_prefix.replace('.spec', '').split('-')
    )
    
    return f"""import Dinero from "dinero.js";
import {{ User, Transaction, TransactionRequestStatus, TransactionResponseItem, Contact, TransactionStatus }} from "../../../src/models";
import {{ addDays, isWithinInterval, startOfDay }} from "date-fns";
import {{ startOfDayUTC, endOfDayUTC }} from "../../../src/utils/transactionUtils";
import {{ isMobile }} from "../../support/utils";

const {{ _ }} = Cypress;

type TransactionFeedsCtx = {{
  allUsers?: User[];
  user?: User;
  contactIds?: string[];
}};

describe("{test_description}", function () {{
  const ctx: TransactionFeedsCtx = {{}};
  
  const feedViews = {{
    public: {{
      tab: "public-tab",
      tabLabel: "everyone",
      routeAlias: "publicTransactions",
      service: "publicTransactionService",
    }},
    contacts: {{
      tab: "contacts-tab",
      tabLabel: "friends",
      routeAlias: "contactsTransactions",
      service: "contactTransactionService",
    }},
    personal: {{
      tab: "personal-tab",
      tabLabel: "mine",
      routeAlias: "personalTransactions",
      service: "personalTransactionService",
    }},
  }};

  beforeEach(function () {{
    cy.task("db:seed");
    cy.intercept("GET", "/notifications").as("notifications");
    cy.intercept("GET", "/transactions*").as(feedViews.personal.routeAlias);
    cy.intercept("GET", "/transactions/public*").as(feedViews.public.routeAlias);
    cy.intercept("GET", "/transactions/contacts*").as(feedViews.contacts.routeAlias);
    cy.database("filter", "users").then((users: User[]) => {{
      ctx.user = users[0];
      ctx.allUsers = users;
      cy.loginByXstate(ctx.user.username);
    }});
  }});

  it("{test_description} test", () => {{
{content}
  }});
}});
"""

def generate_test_files():
    """Copy files from ui/results folder and complete them with JSON content."""
    # Create base results directory if it doesn't exist
    base_results_dir = os.path.join(os.path.dirname(__file__), 'ui', 'complete_tests')
    os.makedirs(base_results_dir, exist_ok=True)
    
    # Source directory for template files
    results_dir = os.path.join(os.path.dirname(__file__), 'ui', 'results')
    
    # Find all JSON files with processing_time_ prefix in pywinauto folder
    pywinauto_dir = os.path.join(os.path.dirname(__file__), 'pywinauto')
    json_files = glob.glob(os.path.join(pywinauto_dir, 'processing_time_*.json'))
    
    for json_file in json_files:
        # Extract model name from JSON filename (after 'processing_time_' prefix)
        json_basename = os.path.basename(json_file)
        model_name = json_basename.replace('processing_time_', '').replace('.json', '')
        
        # Create a specific directory for this model's results
        model_results_dir = os.path.join(base_results_dir, model_name)
        os.makedirs(model_results_dir, exist_ok=True)
        
        print(f"Processing {json_file} into {model_results_dir}...")
        data = load_json_data(json_file)
        
        # Process each entry in the JSON data
        for entry in data:
            if 'output_file' in entry and 'file_content' in entry:
                # Extract the base filename from the output_file path 
                output_file_name = os.path.basename(entry['output_file'])
                
                # Extract the main file prefix (e.g., "transaction-feeds11.spec")
                file_prefix = output_file_name.split('_response_')[0]
                
                # Determine source file path in ui/results - now using .ts extension
                source_path = os.path.join(results_dir, f"{file_prefix}.ts")
                if not os.path.exists(source_path):
                    # Try with .js extension as fallback
                    js_source_path = os.path.join(results_dir, f"{file_prefix}.js")
                    if os.path.exists(js_source_path):
                        source_path = js_source_path
                
                # Create the destination file path in the model-specific results directory with .ts extension
                dest_path = os.path.join(model_results_dir, f"{file_prefix}.ts")
                
                try:
                    if os.path.exists(source_path):
                        # Read the original file content
                        with open(source_path, 'r') as f:
                            original_content = f.read()
                        
                        # Find the it() block where we need to insert the code
                        it_block_regex = r'it\([\'"].*?[\'"].*?\{'
                        match = re.search(it_block_regex, original_content)
                        
                        if match:
                            # Insert the code content after the opening brace of the it block
                            insert_position = match.end()
                            modified_content = (original_content[:insert_position] + 
                                               '\n' + entry['file_content'] + '\n' + 
                                               original_content[insert_position:])
                            
                            # Write the modified content to the destination file
                            with open(dest_path, 'w') as f:
                                f.write(modified_content)
                            print(f"Modified and copied file: {dest_path}")
                        else:
                            # If no it block is found, just copy the file and append the content
                            shutil.copy(source_path, dest_path)
                            print(f"Copied file: {dest_path} (couldn't find it() block)")
                    else:
                        # If the source file doesn't exist, generate a new file with the content
                        test_content = generate_cypress_test_file(file_prefix, entry['file_content'])
                        with open(dest_path, 'w') as f:
                            f.write(test_content)
                        print(f"Generated new file: {dest_path} (source file not found)")
                except Exception as e:
                    print(f"Error processing file {source_path}: {str(e)}")

if __name__ == "__main__":
    # Run the original analysis
    data_path = os.path.join(os.path.dirname(__file__), 'pywinauto', 'processing_time_claude_3_5_sonnet.json')
    data = load_json_data(data_path)
    results = analyze_files(data)
    
    print(f"Analyzed {results['total_files']} files")
    print(f"Total processing time: {results['total_processing_time']}ms")
    
    # Print some sample analysis
    if results['file_analysis']:
        sample = results['file_analysis'][0]
        print(f"\nSample analysis for {os.path.basename(sample['source_file'])}:")
        print(f"Duration: {sample['duration_ms']}ms")
        print(f"Cypress commands: {sample['code_stats']['cy_commands']}")
        print(f"Assertions: {sample['code_stats']['assertions']}")
    
    # Generate test files
    print("\nGenerating test files...")
    generate_test_files()
    print("Test file generation complete!")
