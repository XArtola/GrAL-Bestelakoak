import json
import os
import re

def clean_test_name(name):
    """Clean and shorten test names for better display"""
    # Remove common prefixes
    name = re.sub(r'^User Sign-up and Login\s+', '', name)
    # Limit length
    if len(name) > 60:
        name = name[:57] + "..."
    return name

def format_duration(duration_ms):
    """Convert milliseconds to seconds with one decimal place"""
    if duration_ms is None:
        return "-"
    return f"{duration_ms / 1000:.1f}s"

def generate_latex_table(json_file_path):
    """Generate LaTeX table from JSON test results"""
    
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    category = data['category'].title()
    llms = data['llms']
    
    # Get all unique test names and their corresponding file numbers
    test_names = []
    file_numbers = []
    
    # Use the first LLM to get the test structure
    first_llm = list(llms.keys())[0]
    for test in llms[first_llm]['tests']:
        test_names.append(clean_test_name(test['name']))
        # Extract file number from filePath
        file_path = test['filePath']
        match = re.search(r'auth(\d+)\.spec\.ts', file_path)
        if match:
            file_numbers.append(f"auth{match.group(1)}")
        else:
            file_numbers.append("auth?")
    
    # LLM display names mapping
    llm_display_names = {
        'claude_3_5_sonnet': 'Claude 3.5 Sonnet',
        'claude_3_7_sonnet': 'Claude 3.7 Sonnet',
        'claude_3_7_sonnet_thinking': 'Claude 3.7 Sonnet\\\\Thinking',
        'claude_sonnet_4': 'Claude Sonnet 4',
        'gemini_2_5_pro_preview': 'Gemini 2.5 Pro',
        'gpt_4o': 'GPT-4o',
        'gpt_4o_mini': 'GPT-4o Mini',
        'o3_mini': 'O3 Mini',
        'o1_mini_preview': 'O1 Mini Preview',
        'gemini_2_0_flash': 'Gemini 2.0 Flash',
        'original': 'Original'
    }
    
    # Start LaTeX table
    latex_content = []
    latex_content.append("\\documentclass{article}")
    latex_content.append("\\usepackage[utf8]{inputenc}")
    latex_content.append("\\usepackage{xcolor}")
    latex_content.append("\\usepackage{colortbl}")
    latex_content.append("\\usepackage{longtable}")
    latex_content.append("\\usepackage{array}")
    latex_content.append("\\usepackage{geometry}")
    latex_content.append("\\geometry{a4paper, landscape, margin=1cm}")
    latex_content.append("")
    latex_content.append("% Define colors")
    latex_content.append("\\definecolor{passgreen}{RGB}{76, 175, 80}")  # Green for pass
    latex_content.append("\\definecolor{failred}{RGB}{244, 67, 54}")    # Red for fail
    latex_content.append("\\definecolor{headerblue}{RGB}{33, 150, 243}") # Blue for headers
    latex_content.append("")
    latex_content.append("\\begin{document}")
    latex_content.append("")
    latex_content.append(f"\\section*{{{category} Test Results}}")
    latex_content.append("")
    
    # Create column specification
    num_llms = len(llms)
    col_spec = "p{1.5cm}p{4cm}" + "c" * (num_llms * 2)  # File, Test Name, then 2 cols per LLM (Gen Time, Exec Time)
    
    latex_content.append("\\begin{longtable}{" + col_spec + "}")
    latex_content.append("\\hline")
    
    # Header row 1 - LLM names
    header1 = "\\rowcolor{headerblue}\\textcolor{white}{\\textbf{File}} & \\textcolor{white}{\\textbf{Test Name}}"
    for llm_key in llms.keys():
        display_name = llm_display_names.get(llm_key, llm_key.replace('_', ' ').title())
        header1 += f" & \\multicolumn{{2}}{{c}}{{\\textcolor{{white}}{{\\textbf{{{display_name}}}}}}}"
    header1 += " \\\\"
    latex_content.append(header1)
    
    # Header row 2 - Gen Time / Exec Time
    header2 = "\\rowcolor{headerblue} & "
    for _ in llms.keys():
        header2 += " & \\textcolor{white}{\\textbf{Gen Time (s)}} & \\textcolor{white}{\\textbf{Exec Time (s)}}"
    header2 += " \\\\"
    latex_content.append(header2)
    latex_content.append("\\hline")
    
    # Data rows
    for i, test_name in enumerate(test_names):
        row = f"{file_numbers[i]} & {test_name}"
        
        for llm_key in llms.keys():
            llm_data = llms[llm_key]
            if i < len(llm_data['tests']):
                test = llm_data['tests'][i]
                status = test['status']
                duration = format_duration(test.get('duration'))
                
                # For now, we'll use the execution time for both columns
                # You might want to modify this if you have separate generation and execution times
                gen_time = "-"  # Placeholder for generation time
                exec_time = duration
                
                if status == 'passed':
                    color = "passgreen"
                else:
                    color = "failred"
                
                row += f" & \\cellcolor{{{color}}}{gen_time} & \\cellcolor{{{color}}}{exec_time}"
            else:
                row += " & - & -"
        
        row += " \\\\"
        latex_content.append(row)
    
    latex_content.append("\\hline")
    latex_content.append("\\end{longtable}")
    latex_content.append("")
    latex_content.append("\\end{document}")
    
    return '\n'.join(latex_content)

def main():
    # Get the directory of this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Look for all test category JSON files
    json_files = [f for f in os.listdir(script_dir) if f.startswith('tests_by_category_') and f.endswith('.json')]
    
    for json_file in json_files:
        print(f"Processing {json_file}...")
        json_path = os.path.join(script_dir, json_file)
        
        # Generate LaTeX content
        latex_content = generate_latex_table(json_path)
        
        # Create output filename
        base_name = json_file.replace('.json', '')
        latex_filename = f"{base_name}_table.tex"
        latex_path = os.path.join(script_dir, latex_filename)
        
        # Write LaTeX file
        with open(latex_path, 'w', encoding='utf-8') as f:
            f.write(latex_content)
        
        print(f"Created LaTeX table: {latex_filename}")

if __name__ == "__main__":
    main()
