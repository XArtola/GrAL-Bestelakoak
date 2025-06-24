import json
import os

def generate_latex_table(json_file, category_name):
    """Generate LaTeX table code for a specific test category"""
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get all LLM names (excluding metadata)
    llms = [key for key in data.keys() if key != 'metadata']
    
    # Get all test files for this category
    test_files = set()
    for llm_data in data.values():
        if isinstance(llm_data, dict):
            test_files.update(llm_data.keys())
    
    test_files = sorted([f for f in test_files if f.startswith(category_name.lower())])
    
    if not test_files:
        return f"% No tests found for category: {category_name}"
    
    # Start LaTeX table
    latex_code = f"""
\\begin{{table}}[H]
\\centering
\\caption{{Test Results for {category_name} Category}}
\\label{{tab:{category_name.lower()}_results}}
\\resizebox{{\\textwidth}}{{!}}{{%
\\begin{{tabular}}{{|l|l|""" + "|".join(["c|c"] * len(llms)) + """}
\\hline
\\multirow{{2}}{{*}}{{\\textbf{{File}}}} & \\multirow{{2}}{{*}}{{\\textbf{{Test Name}}}} """
    
    # Add LLM headers
    for llm in llms:
        latex_code += f"& \\multicolumn{{2}}{{c|}}{{\\textbf{{{llm.replace('_', ' ').title()}}}}} "
    
    latex_code += "\\\\\n\\cline{3-" + str(2 + len(llms) * 2) + "}\n"
    latex_code += " & "
    
    # Add sub-headers (Gen Time, Exec Time)
    for llm in llms:
        latex_code += "& \\textbf{Gen Time (s)} & \\textbf{Exec Time (s)} "
    
    latex_code += "\\\\\n\\hline\n"
    
    # Add data rows
    for test_file in test_files:
        # Get test data from first LLM that has this file
        test_data = None
        for llm in llms:
            if test_file in data[llm]:
                test_data = data[llm][test_file]
                break
        
        if not test_data:
            continue
        
        # For each test in the file
        for i, test in enumerate(test_data):
            test_name = test.get('testName', 'Unknown Test')
            # Clean test name for LaTeX
            test_name = test_name.replace('_', '\\_').replace('&', '\\&').replace('%', '\\%').replace('#', '\\#')
            
            if i == 0:
                # First row shows file name
                latex_code += f"{test_file} & {test_name} "
            else:
                # Subsequent rows have empty file column
                latex_code += f" & {test_name} "
            
            # Add data for each LLM
            for llm in llms:
                if test_file in data[llm] and i < len(data[llm][test_file]):
                    llm_test = data[llm][test_file][i]
                    gen_time = llm_test.get('generationTime', 0)
                    exec_time = llm_test.get('executionTime', 0)
                    status = llm_test.get('status', 'unknown')
                    
                    # Format times
                    gen_time_str = f"{gen_time:.1f}" if gen_time > 0 else "-"
                    exec_time_str = f"{exec_time:.1f}" if exec_time > 0 else "-"
                    
                    # Add cell colors based on status
                    if status == 'passed':
                        latex_code += f"& \\cellcolor{{green!30}}{gen_time_str} & \\cellcolor{{green!30}}{exec_time_str} "
                    elif status == 'failed':
                        latex_code += f"& \\cellcolor{{red!30}}{gen_time_str} & \\cellcolor{{red!30}}{exec_time_str} "
                    else:
                        latex_code += f"& \\cellcolor{{gray!30}}{gen_time_str} & \\cellcolor{{gray!30}}{exec_time_str} "
                else:
                    # No data available
                    latex_code += "& \\cellcolor{gray!30}- & \\cellcolor{gray!30}- "
            
            latex_code += "\\\\\n\\hline\n"
    
    latex_code += """\\end{tabular}%
}
\\end{table}

"""
    
    return latex_code

def main():
    """Generate LaTeX tables for all categories"""
    
    # Categories based on the file structure
    categories = [
        ('Auth', 'auth_tests.json'),
        ('Bank Accounts', 'bankaccounts_tests.json'),
        ('New Transaction', 'new-transaction_tests.json'),
        ('Notifications', 'notifications_tests.json'),
        ('Transaction Feeds', 'transaction-feeds_tests.json'),
        ('Transaction View', 'transaction-view_tests.json'),
        ('User Settings', 'user-settings_tests.json')
    ]
    
    # LaTeX document header
    latex_document = """\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage[table]{xcolor}
\\usepackage{multirow}
\\usepackage{float}
\\usepackage{graphicx}
\\usepackage{geometry}
\\geometry{a4paper, margin=1cm, landscape}

\\begin{document}

"""
    
    # Generate table for each category
    for category_name, json_file in categories:
        if os.path.exists(json_file):
            print(f"Generating LaTeX table for {category_name}...")
            latex_table = generate_latex_table(json_file, category_name)
            latex_document += latex_table
            
            # Also save individual table
            with open(f"{category_name.lower().replace(' ', '_')}_table.tex", 'w', encoding='utf-8') as f:
                f.write(latex_table)
            print(f"Saved individual table to {category_name.lower().replace(' ', '_')}_table.tex")
        else:
            print(f"Warning: {json_file} not found")
    
    latex_document += "\\end{document}"
    
    # Save complete document
    with open('all_tables.tex', 'w', encoding='utf-8') as f:
        f.write(latex_document)
    
    print("Complete LaTeX document saved to all_tables.tex")
    print("\nYou can copy the individual table code from the .tex files or use the complete document.")

if __name__ == "__main__":
    main()
