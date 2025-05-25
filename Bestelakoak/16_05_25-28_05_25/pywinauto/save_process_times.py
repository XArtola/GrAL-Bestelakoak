import os
import json
import re
import pandas as pd
from datetime import datetime

def find_output_folders(base_dir):
    """Find all folders with 'output_' prefix in the given directory."""
    return [d for d in os.listdir(base_dir) 
            if os.path.isdir(os.path.join(base_dir, d)) and d.startswith('output_')]

def load_json_file(file_path):
    """Load data from a JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading file {file_path}: {str(e)}")
        return None

def deduplicate_copilot_data(copilot_data):
    """Remove duplicate entries from copilot data based on requestTimestamp."""
    print(f"Original copilot data has {len(copilot_data)} entries")
    
    # Convert to DataFrame for easier deduplication
    df = pd.DataFrame(copilot_data)
    
    # Count duplicates
    duplicate_count = df.duplicated(subset=['requestTimestamp'], keep='first').sum()
    print(f"Found {duplicate_count} duplicate entries based on requestTimestamp")
    
    # Drop duplicates
    df_dedup = df.drop_duplicates(subset=['requestTimestamp'], keep='first')
    print(f"After deduplication: {len(df_dedup)} entries")
    
    # Convert back to list of dictionaries
    return df_dedup.to_dict(orient='records')

def load_file_content(folder_path, output_file_path, folder_suffix=None):
    """Load the content of the generated output file."""
    try:
        # The output_file field contains a relative path within the output folder
        # We need to get just the filename and combine it with the folder path
        file_name = os.path.basename(output_file_path)
        full_path = os.path.join(folder_path, file_name)
        
        # Check if the file exists
        if not os.path.exists(full_path):
            print(f"Warning: Output file not found: {full_path}")
            return "File content not available"
        
        # Read the file content
        with open(full_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
            
            # Process files based on their folder suffix
            # For models that use <generated_code> tags: Gemini, GPT-4o, and o4_mini_preview
            if folder_suffix in ["gemini_2_5_pro_preview", "GPT_4o", "o4_mini_preview"]:
                print(f"Processing {folder_suffix} file: {file_name}")
                
                # Find the generated code markers
                import re
                
                # Look for lines containing the generated code markers with any number of spaces
                # between '>' and '// <generated_code>'
                start_marker = re.search(r'>\s*<generated_code>', content)
                if not start_marker:
                    # Also try with comment style markers
                    start_marker = re.search(r'>\s*//\s*<generated_code>', content)
                
                end_marker = re.search(r'>\s*</generated_code>', content)
                if not end_marker:
                    # Also try with comment style markers
                    end_marker = re.search(r'>\s*//\s*</generated_code>', content)
                
                if start_marker and end_marker:
                    # Extract content between markers (exclude the marker lines)
                    start_pos = content.find('\n', start_marker.end()) + 1
                    end_pos = end_marker.start()
                    
                    if start_pos < end_pos:
                        # Get the content between markers
                        generated_code = content[start_pos:end_pos].strip()
                        
                        # Remove ">" symbols at the beginning of lines
                        code_lines = generated_code.split('\n')
                        cleaned_lines = []
                        for line in code_lines:
                            line_stripped = line.strip()
                            if line_stripped.startswith('>'):
                                # Remove just the ">" character and any whitespace after it
                                index = line.find('>')
                                if index != -1:
                                    line = line[:index] + line[index+1:].lstrip()
                            cleaned_lines.append(line)
                        content = '\n'.join(cleaned_lines)
                        
                        print(f"Extracted generated code from {file_name} ({len(content)} characters)")
                    else:
                        print(f"Warning: Invalid marker positions in {file_name}")
                else:
                    print(f"Warning: Could not find generated code markers in {file_name}")
                    
            # Apply extraction logic for Claude models
            elif folder_suffix and "claude_3" in folder_suffix and "sonnet" in folder_suffix:
                print(f"Processing Claude Sonnet file ({folder_suffix}): {file_name}")
                
                # Find the typescript code block first
                typescript_start = content.find("```typescript")
                typescript_end = content.find("```", typescript_start + 12) if typescript_start != -1 else -1
                
                if typescript_start != -1 and typescript_end != -1:
                    # Extract the typescript code block
                    code_block = content[typescript_start + 12:typescript_end].strip()
                    
                    # Find the it() function body
                    it_pattern = r'>\s*it\([^{]+\{\s*\n'
                    import re
                    it_match = re.search(it_pattern, code_block)
                    
                    if it_match:
                        # Find the starting position (after the opening brace)
                        start_pos = it_match.end()
                        
                        # Find the last closing brace
                        end_pos = code_block.rfind('});')
                        
                        if end_pos > start_pos:
                            # Extract only the function body (between the braces)
                            function_body = code_block[start_pos:end_pos].strip()
                            
                            # Remove ">" symbols at the beginning of lines
                            body_lines = function_body.split('\n')
                            cleaned_lines = []
                            for line in body_lines:
                                line_stripped = line.strip()
                                if line_stripped.startswith('>'):
                                    # Remove just the ">" character and any whitespace after it
                                    index = line.find('>')
                                    if index != -1:
                                        line = line[:index] + line[index+1:].lstrip()
                                cleaned_lines.append(line)
                            content = '\n'.join(cleaned_lines)
                            
                            print(f"Extracted function body from {file_name} ({len(content)} characters)")
                        else:
                            print(f"Warning: Could not locate the end of test function in {file_name}")
                    else:
                        print(f"Warning: Could not find it() function in the code block in {file_name}")
                else:
                    print(f"Warning: Could not find typescript code block in {file_name}")
            else:
                print(f"Loaded complete content from {file_name} ({len(content)} characters)")
                
            return content
    except Exception as e:
        print(f"Error loading file content from {output_file_path}: {str(e)}")
        return "Error loading file content"

def merge_data_by_timestamp(copilot_data, timestamps_data, folder_path=None, folder_suffix=None):
    """Merge the two datasets based on matching timestamps."""
    print(f"Starting merge process. Copilot data length: {len(copilot_data)}, Timestamps data length: {len(timestamps_data)}")
    
    # Deduplicate copilot data first
    copilot_data = deduplicate_copilot_data(copilot_data)
    
    # Convert data to DataFrames for easier merging
    df_copilot = pd.DataFrame(copilot_data)
    df_timestamps = pd.DataFrame(timestamps_data)
    
    print(f"Converted data to DataFrames. Copilot columns: {df_copilot.columns.tolist()}")
    print(f"Timestamps columns: {df_timestamps.columns.tolist()}")
    
    # Check if required columns exist
    if 'requestTimestamp' not in df_copilot.columns:
        print("Error: 'requestTimestamp' column not found in copilot data")
        return None
    
    if 'timestamp' not in df_timestamps.columns:
        print("Error: 'timestamp' column not found in timestamps data")
        return None
    
    print("Found required columns for matching")
    
    # Parse timestamps to datetime objects for comparison
    try:
        df_copilot['datetime'] = pd.to_datetime(df_copilot['requestTimestamp'])
        df_timestamps['datetime'] = pd.to_datetime(df_timestamps['timestamp'])
        print("Successfully parsed timestamps to datetime objects")
    except Exception as e:
        print(f"Error parsing timestamps: {str(e)}")
        # Try to continue with string matching if parsing fails
    
    # Match records with timestamp tolerance
    merged_data = []
    match_count = 0
    
    # Define a time tolerance for matching (e.g., 5 seconds)
    TIME_TOLERANCE_SECONDS = 5
    
    print(f"Using time tolerance of {TIME_TOLERANCE_SECONDS} seconds for matching")
    
    for copilot_idx, copilot_row in df_copilot.iterrows():
        copilot_entry = copilot_data[copilot_idx]
        
        if 'datetime' in df_copilot.columns and 'datetime' in df_timestamps.columns:
            # Use datetime comparison with tolerance
            copilot_time = copilot_row['datetime']
            
            for timestamp_idx, timestamp_row in df_timestamps.iterrows():
                timestamp_time = timestamp_row['datetime']
                time_diff = abs((timestamp_time - copilot_time).total_seconds())
                
                if time_diff <= TIME_TOLERANCE_SECONDS:
                    timestamp_entry = timestamps_data[timestamp_idx]
                    merged_entry = {**copilot_entry, **timestamp_entry}
                    
                    # Add the file content if folder_path is provided and output_file exists
                    if folder_path and 'output_file' in timestamp_entry:
                        output_file = timestamp_entry['output_file']
                        merged_entry['file_content'] = load_file_content(folder_path, output_file, folder_suffix)
                    
                    merged_data.append(merged_entry)
                    match_count += 1
                    print(f"Matched: {copilot_time} with {timestamp_time} (diff: {time_diff:.2f}s)")
                    break
        else:
            # Fallback to string matching
            copilot_timestamp = copilot_row.get('requestTimestamp', '')
            
            for timestamp_idx, timestamp_row in df_timestamps.iterrows():
                timestamps_timestamp = timestamp_row.get('timestamp', '')
                
                # Check for partial string match
                if (copilot_timestamp and timestamps_timestamp and
                    (copilot_timestamp[:16] == timestamps_timestamp[:16])):  # Match up to seconds
                    timestamp_entry = timestamps_data[timestamp_idx]
                    merged_entry = {**copilot_entry, **timestamp_entry}
                    
                    # Add the file content if folder_path is provided and output_file exists
                    if folder_path and 'output_file' in timestamp_entry:
                        output_file = timestamp_entry['output_file']
                        merged_entry['file_content'] = load_file_content(folder_path, output_file, folder_suffix)
                    
                    merged_data.append(merged_entry)
                    match_count += 1
                    print(f"String-matched: {copilot_timestamp} with {timestamps_timestamp}")
                    break
    
    print(f"Matching complete. Found {match_count} matches out of {len(copilot_data)} copilot entries")
    return merged_data

def process_output_folders(base_dir):
    """Process all output folders and merge their timing files."""
    output_folders = find_output_folders(base_dir)
    
    for folder in output_folders:
        folder_path = os.path.join(base_dir, folder)
        
        # Extract suffix from folder name
        suffix_match = re.match(r'output_(.*)', folder)
        if not suffix_match:
            print(f"Could not extract suffix from folder name: {folder}")
            continue
        
        suffix = suffix_match.group(1)
        print(f"Processing folder with suffix: {suffix}")
        
        # Find copilot_timings and timestamps files
        file_list = os.listdir(folder_path)
        copilot_file = next((f for f in file_list if 'copilot_timings' in f), None)
        timestamps_file = next((f for f in file_list if 'timestamps' in f), None)
        
        if not copilot_file or not timestamps_file:
            print(f"Missing required files in folder {folder}")
            continue
        
        # Load data from both files
        copilot_data = load_json_file(os.path.join(folder_path, copilot_file))
        timestamps_data = load_json_file(os.path.join(folder_path, timestamps_file))
        
        if not copilot_data or not timestamps_data:
            print(f"Could not load data from files in folder {folder}")
            continue
        
        # Merge the data
        merged_data = merge_data_by_timestamp(copilot_data, timestamps_data, folder_path, suffix)
        
        if not merged_data:
            print(f"Could not merge data for folder {folder} - no matching timestamps found")
            continue
        
        # Save the merged data
        output_filename = f"processing_time_{suffix}.json"
        output_path = os.path.join(base_dir, output_filename)
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(merged_data, f, indent=2)
            print(f"Successfully saved merged data to {output_path}")
        except Exception as e:
            print(f"Error saving merged data for {folder}: {str(e)}")

if __name__ == "__main__":
    # Use the directory where the script is located
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Looking for output folders in: {base_dir}")
    process_output_folders(base_dir)
