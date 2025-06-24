import json
import os

def get_llm_display_name(llm_key):
    """Convert LLM key to display name"""
    name_mapping = {
        'claude_3_5_sonnet': 'Claude 3.5 Sonnet',
        'claude_3_7_sonnet': 'Claude 3.7 Sonnet', 
        'claude_3_7_sonnet_thinking': 'Claude 3.7 Sonnet Thinking',
        'claude_sonnet_4': 'Claude Sonnet 4',
        'gemini_2_0_flash': 'Gemini 2.0 Flash',
        'gemini_2_5_pro_preview': 'Gemini 2.5 Pro',
        'gpt_4_1': 'GPT-4.1',
        'gpt_4o': 'GPT-4o',
        'o3_mini': 'O3 Mini',
        'o4_mini_preview': 'O4 Mini'
    }
    return name_mapping.get(llm_key, llm_key.replace('_', ' ').title())

def format_duration(duration_ms):
    """Convert milliseconds to seconds with 1 decimal place"""
    if duration_ms is None:
        return "-"
    return f"{duration_ms / 1000:.1f}s"

def get_test_file_number(file_path):
    """Extract test number from file path"""
    import re
    match = re.search(r'(\w+)(\d+)\.spec\.ts', file_path)
    if match:
        return int(match.group(2))
    return 0

def generate_latex_table(category_data, category_name):
    """Generate LaTeX table for a specific category"""
    
    # Get all LLMs and sort them
    llms = list(category_data['llms'].keys())
    llm_display_names = [get_llm_display_name(llm) for llm in llms]
    
    # Collect all tests and sort by file number
    all_tests = []
    for llm in llms:
        for test in category_data['llms'][llm]['tests']:
            test_key = f"{test['name']}|{test['filePath']}"
            if test_key not in [t['key'] for t in all_tests]:
                all_tests.append({
                    'key': test_key,
                    'name': test['name'],
                    'filePath': test['filePath'],
                    'fileNumber': get_test_file_number(test['filePath'])
                })
    
    # Sort tests by file number
    all_tests.sort(key=lambda x: x['fileNumber'])
    
    # Start LaTeX code
    latex_code = []
    latex_code.append("\\documentclass{article}")
    latex_code.append("\\usepackage[utf8]{inputenc}")
    latex_code.append("\\usepackage{longtabu}")
    latex_code.append("\\usepackage{xcolor}")
    latex_code.append("\\usepackage{colortbl}")
    latex_code.append("\\usepackage{geometry}")
    latex_code.append("\\geometry{a4paper, landscape, margin=1cm}")
    latex_code.append("\\usepackage{array}")
    latex_code.append("")
    latex_code.append("% Define colors")
    latex_code.append("\\definecolor{passgreen}{RGB}{144,238,144}")
    latex_code.append("\\definecolor{failred}{RGB}{255,182,193}")
    latex_code.append("\\definecolor{headerblue}{RGB}{70,130,180}")
    latex_code.append("")
    latex_code.append("\\begin{document}")
    latex_code.append("")
    latex_code.append(f"\\section*{{{category_name.title()} Test Results}}")
    latex_code.append("")
    
    # Calculate number of columns
    num_llms = len(llms)
    num_cols = 2 + num_llms  # File + Test Name + LLMs
    
    # Create column specification
    col_spec = "l|p{6cm}|" + "c|" * num_llms
    
    latex_code.append("\\begin{longtabu}{" + col_spec + "}")
    latex_code.append("\\hline")
    
    # Header row
    header_row = "\\rowcolor{headerblue} \\textbf{\\color{white}File} & \\textbf{\\color{white}Test Name}"
    for display_name in llm_display_names:
        header_row += f" & \\textbf{{\\color{{white}}{display_name}}}"
    header_row += " \\\\"
    latex_code.append(header_row)
    latex_code.append("\\hline")
    latex_code.append("\\endhead")
    
    # Data rows
    for test in all_tests:
        # Extract file name from path
        file_name = os.path.basename(test['filePath']).replace('.spec.ts', '')
        
        # Start row
        row = f"{file_name} & {test['name']}"
        
        # Add data for each LLM
        for llm in llms:
            # Find this test in the LLM's results
            test_result = None
            for t in category_data['llms'][llm]['tests']:
                if t['name'] == test['name'] and t['filePath'] == test['filePath']:
                    test_result = t
                    break
            
            if test_result:
                duration = format_duration(test_result['duration'])
                if test_result['status'] == 'passed':
                    row += f" & \\cellcolor{{passgreen}}{duration}"
                else:
                    row += f" & \\cellcolor{{failred}}{duration}"
            else:
                row += " & \\cellcolor{gray!30}-"
        
        row += " \\\\"
        latex_code.append(row)
        latex_code.append("\\hline")
    
    latex_code.append("\\end{longtabu}")
    latex_code.append("")
    latex_code.append("\\end{document}")
    
    return "\n".join(latex_code)

def main():
    # Directory containing the JSON files
    base_dir = "c:\\Users\\xabia\\OneDrive\\Documentos\\4.Maila\\TFG-Bestelakoak\\Bestelakoak\\Docker\\results\\By_file"
    
    # Categories to process
    categories = [
        ('auth', 'Authentication'),
        ('bankaccounts', 'Bank Accounts'),
        ('new-transaction', 'New Transaction'),
        ('notifications', 'Notifications'),
        ('transaction-feeds', 'Transaction Feeds'),
        ('transaction-view', 'Transaction View'),
        ('user-settings', 'User Settings')
    ]
    
    for category_key, category_display in categories:
        json_file = os.path.join(base_dir, f"tests_by_category_{category_key}.json")
        
        if os.path.exists(json_file):
            print(f"Processing {category_display}...")
            
            # Load JSON data
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Generate LaTeX code
            latex_code = generate_latex_table(data, category_display)
            
            # Save LaTeX file
            latex_file = os.path.join(base_dir, f"{category_key}_table.tex")
            with open(latex_file, 'w', encoding='utf-8') as f:
                f.write(latex_code)
            
            print(f"LaTeX table saved to: {latex_file}")
        else:
            print(f"JSON file not found: {json_file}")

if __name__ == "__main__":
    main()
