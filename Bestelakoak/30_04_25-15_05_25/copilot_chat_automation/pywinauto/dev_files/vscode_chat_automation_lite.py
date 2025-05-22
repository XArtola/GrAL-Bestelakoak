import time
import psutil
import subprocess
import traceback
import os
import json
import re
from pywinauto.application import Application
from pywinauto import Desktop
from pywinauto.keyboard import send_keys
import pyperclip
from datetime import datetime
from pywinauto.findbestmatch import MatchError
from pywinauto.findwindows import ElementNotFoundError
import argparse

# --- Configuration ---
# Paths
prompt_file_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\30_04_25-15_05_25\preparePrompts\prompts\auth1.spec.txt"
workspace_folder_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\01_04_25-15_04_25\Hustuta"
devtools_script_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\VsCode\pywinauto\copilotTimer2.js"
vscode_path = r"C:\Users\xabia\AppData\Local\Programs\Microsoft VS Code\Code.exe"

# LLM Names
LLM_NAMES = [
    "claude_3_5_sonnet", "claude_3_7_sonnet", "claude_3_7_sonnet_thinking", "gemini_2_0_flash", "gemini_2_5_pro_preview", 
    "GPT_4_1", "GPT_4o", "o1_preview", "o3_mini", "o4_mini_preview"
]

# Timing constants
WAIT_SHORT = 1.0
WAIT_MEDIUM = 2.0 
WAIT_LONG = 45.0

# --- Global variables ---
timestamps_data = []

# --- Setup and utilities ---
def setup():
    """Initialize settings and environment."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Automate VSCode with AI models")
    parser.add_argument("llm_index", type=int, choices=range(0, 10), help="Index of LLM to use (0-9)")
    args = parser.parse_args()
    
    # Get LLM name
    llm_name = LLM_NAMES[args.llm_index] if 0 <= args.llm_index < len(LLM_NAMES) else f"llm{args.llm_index}"
    
    # Setup output folder
    output_folder = f"output_{llm_name}"
    os.makedirs(output_folder, exist_ok=True)
    
    # Read prompt content
    try:
        with open(prompt_file_path, 'r', encoding='utf-8') as file:
            prompt_content = file.read()
        print(f"Successfully read prompt file: {prompt_file_path}")
    except Exception as e:
        print(f"Error reading prompt file: {e}")
        prompt_content = "Error: Could not read prompt file."
    
    return llm_name, output_folder, prompt_content

def send_keys_safely(window, keys_to_send, with_spaces=False, pause=0.05):
    """Send keys safely to a window with proper focus."""
    try:
        if not window.is_active():
            window.set_focus()
            time.sleep(WAIT_SHORT)
        
        print(f"Sending keys: {keys_to_send}")
        send_keys(keys_to_send, with_spaces=with_spaces, pause=pause)
        return True
    except Exception as e:
        print(f"Error sending keys: {e}")
        return False

def log_and_save(output_folder, llm_name, content, prefix="response", error=None):
    """Save content to a file with proper error handling."""
    if not content.strip():
        print("Warning: Empty content. Nothing to save.")
        return os.path.join(output_folder, f"empty_content_{llm_name}.txt")
    
    try:
        original_filename = os.path.basename(prompt_file_path)
        filename_without_ext, ext = os.path.splitext(original_filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(output_folder, f"{filename_without_ext}_{prefix}_{llm_name}_{timestamp}{ext}")
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Content saved to: {output_path}")
        return output_path
    except Exception as e:
        print(f"Error saving content: {e}")
        traceback.print_exc()
        error_path = os.path.join(output_folder, f"error_save_{llm_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
        try:
            with open(error_path, "w", encoding="utf-8") as f:
                f.write(f"Error: {e}\n\n")
                if error:
                    f.write(f"Exception details: {error}\n\n")
                f.write("Content attempted to save:\n")
                f.write(content)
            return error_path
        except:
            return os.path.join(output_folder, f"fatal_error_{llm_name}.txt")

# --- Window handling ---
def find_vscode_window(pid, timeout=30):
    """Find VS Code window using multiple strategies."""
    print(f"Looking for VS Code window (timeout: {timeout}s)...")
    end_time = time.time() + timeout
    
    while time.time() < end_time:
        # Try by PID
        try:
            app = Application(backend="uia").connect(process=pid, timeout=1)
            window = app.top_window()
            if window.window_text() and window.class_name() != "#32770":
                print(f"✅ Found VS Code window by PID: '{window.window_text()}'")
                return window
        except: pass
        
        # Try by title
        try:
            app = Application(backend="uia").connect(title_re=r".*Visual Studio Code.*", timeout=1, class_name_re="^!#32770$")
            window = app.top_window()
            if window.window_text() and window.class_name() != "#32770":
                print(f"✅ Found VS Code window by title: '{window.window_text()}'")
                return window
        except: pass
        
        # Try by process name
        try:
            for proc in psutil.process_iter(['pid', 'name']):
                if proc.info['name'] and proc.info['name'].lower() == "code.exe":
                    try:
                        app = Application(backend="uia").connect(process=proc.info['pid'], timeout=1)
                        window = app.top_window()
                        if window.window_text() and window.class_name() != "#32770":
                            print(f"✅ Found VS Code window by process: '{window.window_text()}'")
                            return window
                    except: pass
        except: pass
        
        print(".", end="", flush=True)
        time.sleep(1)
    
    print("\n❌ Couldn't find VS Code window after multiple attempts.")
    return None

def setup_window(window):
    """Configure window for interaction (maximize, focus)."""
    try:
        if window.is_minimized():
            window.restore()
            time.sleep(WAIT_SHORT)
        
        window.set_focus()
        time.sleep(WAIT_SHORT)
        
        if not window.is_maximized():
            try:
                window.maximize()
                time.sleep(WAIT_SHORT)
            except: pass
        
        print("Window configured for interaction.")
    except Exception as e:
        print(f"Error configuring window: {e}")

def cerrar_dialogo_guardar_vscode(timeout=15):
    """Close 'Save changes' dialog using keyboard shortcuts first, then UI controls."""
    print(f"Looking for Save dialog (timeout: {timeout}s)...")
    
    end_time = time.time() + timeout
    dialog_found = None
    
    # Find dialog
    while time.time() < end_time and not dialog_found:
        try:
            dialogs = Desktop(backend="uia").windows(class_name="#32770", title_re=".*Visual Studio Code.*", top_level_only=True)
            for win in dialogs:
                try:
                    if win.child_window(control_type="Button").exists():
                        if win.child_window(title_re=".*Don't Save.*|.*No guardar.*", control_type="Button").exists():
                            dialog_found = win
                            print(f"✅ Found Save dialog: '{dialog_found.window_text()}'")
                            break
                except Exception as e:
                    print(f"⚠️ Error processing dialog candidate: {e}")
        except Exception as e:
            print(f"⚠️ Error searching for dialogs: {e}")
        
        if not dialog_found:
            print(".", end="", flush=True)
            time.sleep(0.5)
    
    if not dialog_found:
        print("\n❌ No Save dialog detected.")
        return False
    
    # Try to close dialog
    print("\nInteracting with dialog...")
    dialog_found.set_focus()
    time.sleep(WAIT_SHORT)
    
    # FIRST: Try Alt+N (for "No guardar" in Spanish) or Alt+D (for "Don't Save" in English)
    print("Trying Alt+N shortcut...")
    send_keys("%n")
    time.sleep(WAIT_MEDIUM)
    
    # Check if dialog closed
    try:
        if not dialog_found.exists() or not dialog_found.is_visible():
            print("✅ Dialog closed with Alt+N.")
            return True
    except:
        print("✅ Dialog likely closed with Alt+N.")
        return True
    
    # SECOND: Try clicking the button
    try:
        buttons = dialog_found.children(control_type="Button")
        print(f"Found {len(buttons)} buttons in dialog.")
        
        for button in buttons:
            btn_text = button.window_text()
            if re.search(r"Don't Save", btn_text, re.IGNORECASE) or re.search(r"No guardar", btn_text, re.IGNORECASE):
                print(f"✅ Found 'Don't Save' button: '{btn_text}'")
                button.click_input()
                print(f"✅ Clicked button: '{btn_text}'")
                return True
    except Exception as e:
        print(f"Error interacting with buttons: {e}")
    
    # THIRD: Try Tab and Enter
    print("Trying Tab+Enter sequence...")
    send_keys("{TAB}")
    time.sleep(WAIT_SHORT)
    send_keys("{ENTER}")
    time.sleep(WAIT_SHORT)
    
    try:
        if not dialog_found.exists() or not dialog_found.is_visible():
            print("✅ Dialog closed with Tab+Enter.")
            return True
    except:
        print("✅ Dialog likely closed with Tab+Enter.")
        return True
    
    print("❌ Failed to close dialog.")
    return False

# --- DevTools handling ---
def focus_devtools_window(timeout=15):
    """Find and focus DevTools window."""
    print(f"Looking for DevTools window (timeout: {timeout}s)...")
    
    end_time = time.time() + timeout
    devtools_title_regex = r".*Developer Tools.*|.*Herramientas de desarrollo.*"
    devtools_class_regex = r"Chrome_WidgetWin_1"
    
    while time.time() < end_time:
        try:
            windows = Desktop(backend="uia").windows(
                title_re=devtools_title_regex,
                class_name_re=devtools_class_regex,
                top_level_only=True
            )
            
            if windows:
                devtools_window = windows[0]
                print(f"✅ Found DevTools window: '{devtools_window.window_text()}'")
                
                devtools_window.set_focus()
                print("✅ DevTools window focused.")
                time.sleep(WAIT_SHORT)
                return devtools_window
        except Exception as e:
            pass
        
        print(".", end="", flush=True)
        time.sleep(0.5)
    
    print("\n❌ DevTools window not found.")
    return None

def open_devtools_and_run_script(main_window, script):
    """Open DevTools, run a script, and close DevTools."""
    main_window.set_focus()
    time.sleep(WAIT_MEDIUM)
    
    # Open command palette and DevTools
    send_keys("^+p")
    time.sleep(WAIT_MEDIUM)
    pyperclip.copy("Developer: Toggle Developer Tools")
    send_keys("^v")
    time.sleep(WAIT_MEDIUM)
    send_keys("{ENTER}")
    time.sleep(10)  # Wait for DevTools to open
    
    # Focus and run script
    send_keys("{TAB}")
    time.sleep(WAIT_SHORT)
    pyperclip.copy(script)
    send_keys("^v")
    time.sleep(WAIT_MEDIUM)
    send_keys("{ENTER}")
    time.sleep(5)  # Wait for script to execute
    
    # Close DevTools
    send_keys("%{F4}")  # Alt+F4
    time.sleep(WAIT_MEDIUM)
    
    # Return focus to main window
    main_window.set_focus()
    time.sleep(WAIT_SHORT)

def extract_copilot_timings(main_window, output_folder, llm_name):
    """Extract and save Copilot timing data."""
    print("Opening DevTools to get Copilot timings...")
    try:
        # Open DevTools
        main_window.set_focus()
        time.sleep(WAIT_MEDIUM)
        send_keys("^+p")
        time.sleep(WAIT_MEDIUM)
        pyperclip.copy("Developer: Toggle Developer Tools")
        send_keys("^v")
        time.sleep(WAIT_MEDIUM)
        send_keys("{ENTER}")
        time.sleep(10)
        
        # Focus DevTools
        devtools_window = focus_devtools_window(timeout=WAIT_LONG)
        if not devtools_window:
            print("❌ Couldn't focus DevTools window.")
            return
        
        # Execute command to copy timings
        pyperclip.copy("copy(getCopilotTimings())")
        send_keys_safely(devtools_window, "^v")
        time.sleep(WAIT_SHORT)
        send_keys_safely(devtools_window, "{ENTER}")
        time.sleep(WAIT_MEDIUM)
        
        # Process clipboard data
        clipboard_content = pyperclip.paste()
        match = re.search(r'(\[.*\])', clipboard_content, re.DOTALL)
        if match:
            timings_str = match.group(1)
            copilot_timings_json = json.loads(timings_str)
            timings_filename = os.path.join(output_folder, f"copilot_timings_{llm_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
            with open(timings_filename, "w", encoding="utf-8") as f:
                json.dump(copilot_timings_json, f, indent=4)
            print(f"Copilot timings saved to: {timings_filename}")
        else:
            print("Couldn't extract timings array from clipboard.")
        
        # Close DevTools
        send_keys_safely(devtools_window, "^w")
        time.sleep(WAIT_SHORT)
        main_window.set_focus()
    except Exception as e:
        print(f"Error extracting Copilot timings: {e}")

# --- Content handling ---
def capture_chat_content(window, output_folder, llm_name):
    """Reliably capture chat content using multiple methods."""
    print("Capturing chat content...")
    
    # Ensure we're focused on the main window
    window.set_focus()
    time.sleep(WAIT_SHORT)
    
    # Close any open dialogs
    dialogs = Desktop(backend="uia").windows(class_name="#32770")
    for dialog in dialogs:
        try:
            if "save" in dialog.window_text().lower():
                dialog.set_focus()
                time.sleep(WAIT_SHORT)
                send_keys("{ESC}")
                time.sleep(WAIT_SHORT)
        except: pass
    
    # Try to find and focus the chat area
    chat_area = None
    chat_selectors = [
        {"title_re": ".*GitHub Copilot Chat.*", "control_type": "Document"},
        {"title_re": ".*Chat.*", "control_type": "Edit"},
        {"title_re": ".*Chat.*", "control_type": "Document"},
        {"automation_id": "chatEditor"},
        {"class_name_re": ".*CodeEditor.*"}
    ]
    
    for selector in chat_selectors:
        try:
            potential_chat = window.child_window(**selector)
            if potential_chat.exists():
                chat_area = potential_chat
                print(f"✅ Found chat area with: {selector}")
                chat_area.click_input()
                time.sleep(WAIT_SHORT)
                break
        except: continue
    
    if not chat_area:
        # Click in center of window as fallback
        window_rect = window.rectangle()
        center_x = (window_rect.left + window_rect.right) // 2
        center_y = (window_rect.top + window_rect.bottom) // 2
        window.click_input(coords=(center_x, center_y))
        time.sleep(WAIT_SHORT)
    
    # Clear clipboard
    pyperclip.copy("")
    time.sleep(WAIT_SHORT)
    
    # Try multiple selection methods
    selection_methods = [
        # Method 1: Ctrl+A
        lambda: send_keys_safely(window, "^a", pause=0.1),
        
        # Method 2: Ctrl+Home then Shift+Ctrl+End
        lambda: (send_keys_safely(window, "^{HOME}", pause=0.1), 
                time.sleep(WAIT_SHORT), 
                send_keys_safely(window, "+^{END}", pause=0.1)),
        
        # Method 3: Click then Ctrl+A
        lambda: (window.click_input() if chat_area is None else chat_area.click_input(), 
                time.sleep(WAIT_SHORT), 
                send_keys_safely(window, "^a", pause=0.1))
    ]
    
    content = ""
    for i, method in enumerate(selection_methods):
        print(f"Selection attempt #{i+1}...")
        try:
            method()
            time.sleep(WAIT_SHORT)
            
            send_keys_safely(window, "^c", pause=0.1)
            time.sleep(WAIT_MEDIUM)
            
            content = pyperclip.paste()
            print(f"Copied {len(content)} characters")
            
            # Check if content is a dialog or valid
            if not is_dialog_text(content) and len(content.strip()) > 10:
                print(f"✅ Valid content captured in attempt #{i+1}")
                break
            else:
                print(f"⚠️ Invalid content in attempt #{i+1}, trying another method")
        except Exception as e:
            print(f"Error in attempt #{i+1}: {e}")
    
    # Save the captured content
    if not content.strip():
        print("❌ Failed to capture valid content after multiple attempts")
        return os.path.join(output_folder, f"empty_content_{llm_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
    elif is_dialog_text(content):
        print("⚠️ Captured dialog text instead of chat content")
        return log_and_save(output_folder, llm_name, content, prefix="dialog")
    else:
        return log_and_save(output_folder, llm_name, content)

def is_dialog_text(text):
    """Check if text appears to be from a dialog box."""
    if not text:
        return False
    
    dialog_indicators = [
        "[Window Title]",
        "[Save]",
        "[Don't Save]",
        "[Cancel]",
        "Do you want to save",
        "Your changes will be lost"
    ]
    
    return any(indicator in text for indicator in dialog_indicators)

# --- Main automation function ---
def automate_vscode():
    """Main function for VS Code automation."""
    # Setup
    llm_name, output_folder, prompt_content = setup()
    
    try:
        # Launch VS Code
        print(f"Starting VS Code with folder: {workspace_folder_path}")
        cmd = f'"{vscode_path}" "{workspace_folder_path}"'
        app = Application(backend="uia").start(cmd)
        time.sleep(WAIT_MEDIUM * 2)
        
        # Find and setup main window
        main_window = find_vscode_window(app.process, timeout=WAIT_LONG)
        if not main_window:
            print("Fatal error: Couldn't find VS Code window.")
            return
        
        setup_window(main_window)
        
        # Run DevTools script
        print("Running DevTools script...")
        try:
            with open(devtools_script_path, 'r', encoding='utf-8') as file:
                devtools_script = file.read()
            open_devtools_and_run_script(main_window, devtools_script)
        except Exception as e:
            print(f"Error running DevTools script: {e}")
            devtools_script = "console.log('Failed to read script');"
            open_devtools_and_run_script(main_window, devtools_script)
        
        # Chat interaction
        print("Starting chat interaction...")
        
        # Type repo name
        text_to_type = "#cypress-realworld-app"
        for char in text_to_type:
            send_keys_safely(main_window, char)
            time.sleep(0.1)
        
        send_keys_safely(main_window, "{TAB}")
        time.sleep(WAIT_MEDIUM)
        
        # Send prompt content
        try:
            pyperclip.copy(prompt_content)
            send_keys_safely(main_window, "^v")
            time.sleep(WAIT_SHORT)
        except Exception as e:
            print(f"Error pasting prompt: {e}. Trying character-by-character...")
            lines = prompt_content.strip().split('\n')
            for line in lines:
                escaped_line = line.replace('{', '{{}').replace('}', '{}}').replace('+', '{{+}}').replace('^', '{{^}}').replace('%', '{{%}}')
                send_keys_safely(main_window, escaped_line, with_spaces=True, pause=0.01)
                send_keys_safely(main_window, "{ENTER}")
                time.sleep(0.05)
        
        # Send prompt and wait for response
        timestamp_sent = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        print(f"Sending prompt (timestamp: {timestamp_sent})...")
        send_keys_safely(main_window, "{ENTER}")
        time.sleep(WAIT_MEDIUM)
        
        print(f"Waiting {WAIT_LONG} seconds for response generation...")
        time.sleep(WAIT_LONG)
        
        # Save content method 1: Use /save command
        print("Saving content with /save...")
        send_keys_safely(main_window, "/save", with_spaces=True)
        time.sleep(WAIT_SHORT)
        send_keys_safely(main_window, "{ENTER}")
        time.sleep(WAIT_MEDIUM)
        
        # Select and copy content
        print("Selecting all content (Ctrl+A)...")
        send_keys_safely(main_window, "^a")
        time.sleep(WAIT_SHORT)
        
        print("Copying selection (Ctrl+C)...")
        send_keys_safely(main_window, "^c")
        time.sleep(WAIT_MEDIUM)
        
        # Save to file
        content = pyperclip.paste()
        output_file = log_and_save(output_folder, llm_name, content)
        
        # Record timestamp
        timestamps_data.append({
            "timestamp": timestamp_sent,
            "output_file": output_file
        })
        
        # Close dialog if needed
        print("Checking for and closing any save dialogs...")
        cerrar_dialogo_guardar_vscode()
        
        # Close current panel/window
        print("Closing current panel (Ctrl+W)...")
        send_keys_safely(main_window, "^w")
        time.sleep(WAIT_MEDIUM)
        
        # Clear chat
        print("Clearing chat...")
        send_keys_safely(main_window, "^+p")
        time.sleep(WAIT_MEDIUM)
        send_keys_safely(main_window, ">", with_spaces=True) 
        time.sleep(WAIT_SHORT)
        send_keys_safely(main_window, "/clear", with_spaces=True)
        time.sleep(WAIT_SHORT)
        send_keys_safely(main_window, "{ENTER}")
        time.sleep(WAIT_MEDIUM)
        
        # Save timestamps
        timestamps_file = os.path.join(output_folder, f"timestamps_{llm_name}_{datetime.now().strftime('%Y%m%d')}.json")
        with open(timestamps_file, 'w', encoding='utf-8') as f:
            json.dump(timestamps_data, f, indent=4)
        print(f"Timestamps saved to: {timestamps_file}")
        
        # Extract Copilot timings
        extract_copilot_timings(main_window, output_folder, llm_name)
        
        print("Automation completed successfully.")
        
    except Exception as e:
        print(f"Error during automation: {e}")
        traceback.print_exc()
        
        if timestamps_data:
            timestamps_file = os.path.join(output_folder, f"timestamps_{llm_name}_{datetime.now().strftime('%Y%m%d')}.json")
            with open(timestamps_file, 'w', encoding='utf-8') as f:
                json.dump(timestamps_data, f, indent=4)
            print(f"Timestamps saved before error: {timestamps_file}")
    
    finally:
        print("Script finished.")

if __name__ == "__main__":
    automate_vscode()
