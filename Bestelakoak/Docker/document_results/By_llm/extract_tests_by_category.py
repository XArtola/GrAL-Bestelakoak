#!/usr/bin/env python3
"""
Script to extract tests by category from each LLM results file.
Creates separate JSON files for each test category with all LLM results.
"""

import json
import os
import re
from collections import defaultdict

def get_test_category(file_path):
    """Extract test category from file path."""
    if not file_path:
        return "unknown"
    
    # Extract filename from path
    filename = file_path.split('\\')[-1].lower()
    
    if 'auth' in filename:
        return 'auth'
    elif 'bankaccount' in filename:
        return 'bankaccounts'
    elif 'new-transaction' in filename:
        return 'new-transaction'
    elif 'notification' in filename:
        return 'notifications'
    elif 'transaction-feed' in filename:
        return 'transaction-feeds'
    elif 'transaction-view' in filename:
        return 'transaction-view'
    elif 'user-setting' in filename:
        return 'user-settings'
    else:
        return 'other'

def extract_llm_name(filename):
    """Extract LLM name from results filename."""
    # Remove 'results_' prefix and '.json' suffix
    name = filename.replace('results_', '').replace('.json', '')
    return name

def process_results_files():
    """Process all results files and extract tests by category."""
    
    # Dictionary to store tests by category and LLM
    # Structure: {category: {llm_name: {summary: {}, tests: []}}}
    categories_data = defaultdict(lambda: defaultdict(lambda: {'summary': {}, 'tests': []}))
    
    # Get all results files
    results_files = [f for f in os.listdir('.') if f.startswith('results_') and f.endswith('.json')]
    
    print(f"Found {len(results_files)} results files to process:")
    for f in results_files:
        print(f"  - {f}")
    
    # Process each results file
    for filename in results_files:
        llm_name = extract_llm_name(filename)
        print(f"\nProcessing {filename} (LLM: {llm_name})...")
        
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract summary
            summary = data.get('results', {}).get('summary', {})
            tests = data.get('results', {}).get('tests', [])
            
            print(f"  Total tests: {len(tests)}")
            
            # Group tests by category
            category_counts = defaultdict(int)
            
            for test in tests:
                if 'name' in test and 'filePath' in test:  # Only process valid tests
                    category = get_test_category(test.get('filePath', ''))
                    categories_data[category][llm_name]['tests'].append(test)
                    category_counts[category] += 1
            
            # Add summary for each category
            for category in category_counts:
                # Calculate category-specific summary
                category_tests = categories_data[category][llm_name]['tests']
                category_summary = {
                    'tests': len(category_tests),
                    'passed': sum(1 for t in category_tests if t.get('status') == 'passed'),
                    'failed': sum(1 for t in category_tests if t.get('status') == 'failed'),
                    'skipped': sum(1 for t in category_tests if t.get('status') == 'skipped'),
                    'pending': sum(1 for t in category_tests if t.get('status') == 'pending'),
                    'other': sum(1 for t in category_tests if t.get('status') not in ['passed', 'failed', 'skipped', 'pending'])
                }
                categories_data[category][llm_name]['summary'] = category_summary
            
            print(f"  Tests by category:")
            for category, count in sorted(category_counts.items()):
                print(f"    {category}: {count}")
                
        except Exception as e:
            print(f"Error processing {filename}: {e}")
    
    return categories_data

def save_category_files(categories_data):
    """Save separate JSON files for each category."""
    
    print(f"\nCreating JSON files for {len(categories_data)} categories...")
    
    for category, llm_data in categories_data.items():
        output_filename = f"tests_by_category_{category}.json"
        
        # Structure the output data
        output_data = {
            "category": category,
            "llms": {}
        }
        
        # Add data for each LLM
        for llm_name, llm_info in llm_data.items():
            output_data["llms"][llm_name] = {
                "summary": llm_info['summary'],
                "tests": llm_info['tests']
            }
        
        # Calculate overall statistics for this category
        total_tests = sum(llm_info['summary'].get('tests', 0) for llm_info in llm_data.values())
        total_passed = sum(llm_info['summary'].get('passed', 0) for llm_info in llm_data.values())
        total_failed = sum(llm_info['summary'].get('failed', 0) for llm_info in llm_data.values())
        
        output_data["overall_stats"] = {
            "total_llms": len(llm_data),
            "total_tests_across_llms": total_tests,
            "total_passed_across_llms": total_passed,
            "total_failed_across_llms": total_failed
        }
        
        # Save to file
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"  Created {output_filename} with {len(llm_data)} LLMs and {total_tests} total tests")

def main():
    """Main function."""
    print("Extracting tests by category from LLM results files...")
    print("=" * 60)
    
    categories_data = process_results_files()
    save_category_files(categories_data)
    
    print("\nProcess completed successfully!")
    print(f"Created {len(categories_data)} category files:")
    for category in sorted(categories_data.keys()):
        print(f"  - tests_by_category_{category}.json")

if __name__ == "__main__":
    main()
