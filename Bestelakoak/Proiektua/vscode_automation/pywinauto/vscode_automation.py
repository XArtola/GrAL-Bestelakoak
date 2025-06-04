import time
import traceback
import os
import json
import re
import platform
from pywinauto.application import Application
from pywinauto import Desktop
from pywinauto.keyboard import send_keys
import pyperclip
from datetime import datetime
from pywinauto.findwindows import ElementNotFoundError
import argparse
import glob

# --- CONFIGURATION VARIABLES ---
# File paths
prompt_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "auth1.spec.txt")
prompt_folder_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")
workspace_folder_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Hustuta")
devtools_script_path = os.path.join(os.path.dirname(__file__), "copilotTimer.js")
vscode_path = r"C:\Users\xabia\AppData\Local\Programs\Microsoft VS Code\Code.exe"

# Timing configuration
wait_time = 2
long_wait_time = 120

# Screen configuration (adjust based on your screen resolution)
screen_width = 1920
screen_height = 1080

# Chat configuration
workspace_reference = "#cypress-realworld-app"

# File extensions to search for prompts
prompt_file_extensions = ['*.txt']

# LLM Configuration
LLM_NAMES = [
    "claude_3_5_sonnet", "claude_3_7_sonnet", "claude_3_7_sonnet_thinking", "claude_sonnet_4", 
    "gemini_2_0_flash", "gemini_2_5_pro_preview", "gpt_4_1", "gpt_4o", "o1_preview", "o3_mini", "o4_mini_preview"
]

parser = argparse.ArgumentParser(description="Automatiza VSCode y guarda resultados con sufijo de LLM.")
parser.add_argument("llm_index", type=int, choices=range(0, 10), help="Índice del LLM a usar (0-9)")
args = parser.parse_args()

llm_name = LLM_NAMES[args.llm_index] if args.llm_index < len(LLM_NAMES) else f"llm{args.llm_index}"
output_folder = f"output_{llm_name}"
os.makedirs(output_folder, exist_ok=True)

# --- Global Variables ---
current_file_index = 0
total_files_count = 1
timestamps_data = []

def log(message):
    """Simplified logging with file counter."""
    prefix = f"[{current_file_index}/{total_files_count}] " if current_file_index > 0 else ""
    print(f"{prefix}{message}")

def get_timestamp():
    """Returns timestamp in JavaScript format."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

def add_timestamp_entry(timestamp, output_file, source_file=None):
    """Add timestamp entry to registry."""
    entry = {"timestamp": timestamp, "output_file": output_file}
    if source_file:
        entry["source_file"] = source_file
    timestamps_data.append(entry)

def save_timestamps():
    """Save timestamps to JSON file."""
    json_file = os.path.join(output_folder, f"timestamps_{llm_name}_{datetime.now().strftime('%Y%m%d')}.json")
    try:
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(timestamps_data, f, indent=4)
        log(f"Timestamps saved: {json_file}")
    except Exception as e:
        log(f"Error saving timestamps: {e}")

def read_file(file_path):
    """Read file content."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        log(f"Error reading file: {e}")
        return "Error: Could not read file."

def send_keys_safe(window, keys, with_spaces=False, pause=0.05):
    """Send keys safely to a specific window with enhanced focus management."""
    try:
        # Ensure we have focus on the correct window
        if not window.is_active():
            window.set_focus()
            time.sleep(0.5)  # Small pause for focus to establish

        # Reconfirm focus if necessary (may be lost between commands)
        if not window.is_active():
            window.set_focus()
            time.sleep(0.5)

        log(f"Sending keys to '{window.window_text() or window.class_name()}': {keys}")
        send_keys(keys, with_spaces=with_spaces, pause=pause)
        return True
    except Exception as e:
        log(f"Error sending keys to '{window.window_text() or window.class_name()}': {e}")
        return False

def find_vscode_window(main_pid, timeout=30):
    """Find VS Code main window."""
    log(f"🔎 Searching for VS Code window for {timeout} seconds...")
    end_time = time.time() + timeout

    while time.time() < end_time:
        # Strategy 1: Connect by PID
        try:
            app = Application(backend="uia").connect(process=main_pid, timeout=1)
            main_window = app.top_window()
            if main_window.window_text() and main_window.class_name() != "#32770":
                log(f"✅ Main window found by PID: '{main_window.window_text()}'")
                return main_window
        except:
            pass

        # Strategy 2: Connect by title regex
        try:
            app = Application(backend="uia").connect(title_re=r".*Visual Studio Code.*", timeout=1, class_name_re="^!#32770$")
            main_window = app.top_window()
            if main_window.window_text() and main_window.class_name() != "#32770":
                log(f"✅ Main window found by title: '{main_window.window_text()}'")
                return main_window
        except:
            pass

        # Strategy 3: Search all Code.exe processes
        try:
            for proc in psutil.process_iter(['pid', 'name']):
                if proc.info['name'] and proc.info['name'].lower() == "code.exe":
                    try:
                        app = Application(backend="uia").connect(process=proc.info['pid'], timeout=1)
                        main_window = app.top_window()
                        if main_window.window_text() and main_window.class_name() != "#32770":
                            log(f"✅ Window found by Code.exe process: '{main_window.window_text()}'")
                            return main_window
                    except:
                        pass
        except:
            pass

        print(".", end="", flush=True)
        time.sleep(1)

    log("\n❌ Could not connect to VS Code main window.")
    return None

def setup_window(window):
    """Configura la ventana para la interacción (foco, maximizar)."""
    log(f"Configurando ventana '{window.window_text() or window.class_name()}'...")
    try:
        if not window.is_visible():
            log("Advertencia: Ventana no visible, intentando mostrar...")
            try:
                window.show()
                time.sleep(0.5)
            except Exception as e:
                log(f"No se pudo mostrar la ventana: {e}")

        if window.is_minimized():
            log("Ventana minimizada, restaurando...")
            try:
                window.restore()
                time.sleep(0.5)
            except Exception as e:
                log(f"No se pudo restaurar la ventana: {e}")

        log("Poniendo ventana en primer plano y enfocando...")
        try:
            window.set_foreground()
            time.sleep(0.2)  # Slightly longer pause for foreground
            window.wait_for_idle(timeout=5) # Wait for the application to be ready for input
            window.set_focus()
            time.sleep(0.2)  # Pause after focus
            if not window.is_active():
                log("Advertencia: La ventana no está activa después del primer set_focus(). Intentando de nuevo...")
                window.set_foreground()  # Re-attempt bringing to foreground
                time.sleep(0.2)
                window.wait_for_idle(timeout=3) # Shorter timeout for retry
                window.set_focus()
                time.sleep(0.1) # Brief pause
                if not window.is_active():
                    log("ERROR CRÍTICO: La ventana sigue sin estar activa después de múltiples intentos de enfoque.")
                else:
                    log("✅ Ventana activada en el segundo intento.")
            else:
                log("✅ Ventana principal activa después del primer intento de enfoque.")
        except Exception as e_focus_fg:
            log(f"⚠️ Error durante la secuencia de set_foreground/wait_for_idle/set_focus: {e_focus_fg}")
            # import traceback; traceback.print_exc() # Consider uncommenting for debugging

        time.sleep(0.5) # General pause for UI to settle after focus operations

        try:
            if not window.is_maximized():
                window.maximize()
                log("Ventana maximizada.")
                time.sleep(0.5)
            else:
                log("La ventana ya está maximizada.")
        except Exception as e:
            log(f"No se pudo maximizar la ventana o ya estaba maximizada: {e}")

        try:
            window.wait('ready', timeout=5)
            log("Ventana está lista para interacción.")
        except Exception as e:
            log(f"Advertencia: Ventana puede no estar completamente lista: {e}")

        log("Ventana configurada.")
    except Exception as e:
        log(f"Error al configurar la ventana: {e}")
        traceback.print_exc()

def send_text_via_clipboard(window, text):
    """Send text to editor using clipboard with fallback to character-by-character typing."""
    original_clipboard = ""
    try:
        original_clipboard = pyperclip.paste()
    except pyperclip.PyperclipException as e:
        log(f"Warning getting clipboard content: {e}")
        original_clipboard = ""

    try:
        log(f"Using clipboard to send text to '{window.window_text() or window.class_name()}'...")
        pyperclip.copy(text)
        send_keys_safe(window, "^v")
        time.sleep(1)
        log("Text sent via clipboard.")

    except Exception as e:
        log(f"Error using clipboard: {e}. Trying alternative method (character-by-character)...")
        lines = text.strip().split('\n')
        for i, line in enumerate(lines):
            log(f"Writing line {i+1}/{len(lines)}...")
            # Escape special characters for send_keys
            escaped_line = line.replace('{', '{{}').replace('}', '{}}').replace('+', '{{+}}').replace('^', '{{^}}').replace('%', '{{%}}').replace('~', '{{~}}').replace('(', '{{(}}').replace(')', '{{)}}')
            send_keys_safe(window, escaped_line)
            send_keys_safe(window, "{ENTER}")
            time.sleep(0.05)
        log("Text sent line by line.")
    finally:
        try:
            current_clipboard = pyperclip.paste()
            if current_clipboard != original_clipboard:
                pyperclip.copy(original_clipboard)
                log("Clipboard restored.")
        except Exception as e:
            log(f"Error restoring clipboard: {e}")
        except pyperclip.PyperclipException as e:
            log(f"Warning restoring clipboard: {e}")
        except Exception as e_gen:
            log(f"Unexpected error restoring clipboard: {e_gen}")

def close_save_dialog(timeout=15):
    """Close VS Code save dialog if it appears with OS-specific key combinations."""
    log(f"🔎 Looking for save dialog for up to {timeout} seconds...")
    end_time = time.time() + timeout
    dialog = None

    while time.time() < end_time and not dialog:
        try:
            windows = Desktop(backend="win32").windows(class_name="#32770")
            for win in windows:
                if win.window_text().strip() == "Visual Studio Code":
                    dialog = win
                    break
        except:
            pass

        if not dialog:
            try:
                dialogs = Desktop(backend="uia").windows(class_name="#32770", title_re=".*Visual Studio Code.*", top_level_only=True)
                for win in dialogs:
                    try:
                        if win.child_window(title_re=".*(Don't Save|No guardar).*", control_type="Button").exists(timeout=0.1):
                            dialog = win
                            break
                    except:
                        continue
            except:
                pass
        
        if not dialog:
            time.sleep(0.5)

    if not dialog:
        return False

    log(f"✅ Dialog detected: '{dialog.window_text()}'")
    
    # Click on the center of the screen when dialog is opened
    log("Clicking on center of screen...")
    center_x = screen_width // 2
    center_y = screen_height // 2
    
    try:
        mouse.click(coords=(center_x, center_y))
        time.sleep(1)
        log(f"✅ Clicked on center of screen at ({center_x}, {center_y})")
    except Exception as e:
        log(f"Error clicking center of screen: {e}")
    
    # Get OS and set appropriate key combinations
    current_os = platform.system().lower()
    log(f"Detected OS: {current_os}")
    
    if current_os == "windows":
        # Windows: RIGHT + ENTER (current behavior)
        methods = [
            lambda: send_keys("{RIGHT}{ENTER}", pause=0.2),
            lambda: send_keys("%n", pause=0.2),
            lambda: dialog.child_window(title_re=".*(Don't Save|No guardar).*", control_type="Button").click()
        ]
    elif current_os == "linux":
        # Linux: LEFT + LEFT + ENTER
        methods = [
            lambda: send_keys("{LEFT}{LEFT}{ENTER}", pause=0.2),
            lambda: send_keys("%n", pause=0.2),
            lambda: dialog.child_window(title_re=".*(Don't Save|No guardar).*", control_type="Button").click()
        ]
    elif current_os == "darwin":  # macOS
        # macOS: ENTER only
        methods = [
            lambda: send_keys("{ENTER}", pause=0.2),
            lambda: send_keys("%n", pause=0.2),
            lambda: dialog.child_window(title_re=".*(Don't Save|No guardar).*", control_type="Button").click()
        ]
    else:
        # Default to Windows behavior for unknown OS
        log(f"Unknown OS '{current_os}', using Windows key combination")
        methods = [
            lambda: send_keys("{RIGHT}{ENTER}", pause=0.2),
            lambda: send_keys("%n", pause=0.2),
            lambda: dialog.child_window(title_re=".*(Don't Save|No guardar).*", control_type="Button").click()
        ]
    
    for method in methods:
        try:
            method()
            time.sleep(1.5)
            if not dialog.exists(timeout=0.2):
                log("✅ Dialog closed.")
                return True
        except:
            continue
    
    return False

def focus_devtools_window(timeout=15):
    """Find and focus Developer Tools window."""
    log(f"🔎 Looking for Developer Tools window for up to {timeout} seconds...")
    end_time = time.time() + timeout

    while time.time() < end_time:
        try:
            windows = Desktop(backend="uia").windows(
                title_re=r".*Developer Tools.*|.*Herramientas de desarrollo.*",
                class_name_re=r"Chrome_WidgetWin_1",
                top_level_only=True
            )
            if windows:
                devtools_window = windows[0]
                log(f"✅ Developer Tools window found: '{devtools_window.window_text()}'")
                devtools_window.set_focus()
                time.sleep(1)
                return devtools_window
        except:
            pass
        time.sleep(0.5)

    log("\n❌ Developer Tools window not found.")
    return None

def open_devtools_and_run_script(main_window, script):
    """Open DevTools, run script, and close."""
    log("Opening DevTools and running script...")
    
    main_window.set_focus()
    time.sleep(2)

    # Open command palette
    send_keys("^+p")
    time.sleep(2)

    # Type and execute Developer Tools command
    pyperclip.copy("Developer: Toggle Developer Tools")
    send_keys("^v")
    time.sleep(2)
    send_keys("{ENTER}")
    time.sleep(10)

    # Execute script
    send_keys("{TAB}")
    time.sleep(0.3)
    pyperclip.copy(script)
    send_keys("^v")
    time.sleep(2)
    send_keys("{ENTER}")
    time.sleep(5)

    # Close DevTools
    send_keys("%{F4}")
    time.sleep(2)
    main_window.set_focus()
    time.sleep(1)

def extract_copilot_timings(main_window):
    """Extract and save Copilot timings from DevTools."""
    log("\n--- Opening DevTools to get copilotTimings ---")
    try:
        # Open DevTools
        main_window.set_focus()
        send_keys("^+p")
        time.sleep(2)
        pyperclip.copy("Developer: Toggle Developer Tools")
        send_keys("^v")
        time.sleep(2)
        send_keys("{ENTER}")
        time.sleep(10)

        devtools_window = focus_devtools_window(timeout=long_wait_time)
        if not devtools_window:
            log("❌ Could not find DevTools window for timings.")
            return

        # Execute getCopilotTimings()
        pyperclip.copy("copy(getCopilotTimings())")
        send_keys_safe(devtools_window, "^v")
        time.sleep(0.5)
        send_keys_safe(devtools_window, "{ENTER}")
        time.sleep(2)

        # Read from clipboard and save
        try:
            clipboard_content = pyperclip.paste()
            match = re.search(r'(\[.*\])', clipboard_content, re.DOTALL)
            if match:
                timings_str = match.group(1)
                copilot_timings_json = json.loads(timings_str)
                
                # Ensure all timing entries use "timestamp" field name
                for timing_entry in copilot_timings_json:
                    if 'time' in timing_entry and 'timestamp' not in timing_entry:
                        timing_entry['timestamp'] = timing_entry['time']
                    elif 'ts' in timing_entry and 'timestamp' not in timing_entry:
                        timing_entry['timestamp'] = timing_entry['ts']
                
                timings_filename = os.path.join(output_folder, f"copilot_timings_{llm_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
                with open(timings_filename, "w", encoding="utf-8") as f:
                    json.dump(copilot_timings_json, f, indent=4)
                log(f"Copilot timings saved: {timings_filename}")
        except Exception as e:
            log(f"Error processing copilotTimings: {e}")

        # Close DevTools using Alt+F4 instead of Ctrl+W
        log("Closing DevTools using Alt+F4...")
        send_keys_safe(devtools_window, "%{F4}")
        time.sleep(1)
        main_window.set_focus()
    except Exception as e:
        log(f"Error extracting copilot timings: {e}")

def get_prompt_files():
    """Get list of prompt files from folder."""
    try:
        unique_files = set()
        for ext in prompt_file_extensions:
            found_files = glob.glob(os.path.join(prompt_folder_path, ext))
            unique_files.update(found_files)
        
        files = list(unique_files)
        
        if not files:
            log(f"No files found in folder: {prompt_folder_path}")
            return [prompt_file_path]
        
        log(f"Found {len(files)} prompt files:")
        for i, file in enumerate(files):
            log(f"  {i+1}. {os.path.basename(file)}")
        return files
    except Exception as e:
        log(f"Error searching prompt files: {e}")
        return [prompt_file_path]

def open_vscode_and_get_window(folder_path, timeout=20):
    """Open VS Code and return app, main_window."""
    cmd = f'"{vscode_path}" "{folder_path}"'
    app = Application(backend="uia").start(cmd)
    time.sleep(wait_time * 2)
    
    folder_name = os.path.basename(folder_path)
    try:
        main_window = app.connect(title_re=f".*{folder_name}.*Visual Studio Code.*", timeout=timeout).top_window()
    except ElementNotFoundError:
        main_window = app.connect(title_re=".*Visual Studio Code.*", timeout=timeout).top_window()
    return app, main_window

def automate_vscode():
    """Main automation function for VS Code."""
    global total_files_count, current_file_index
    
    app = None
    main_window = None
    
    prompt_files = get_prompt_files()
    total_files_count = len(prompt_files)
    current_file_index = 0
    
    try:
        log("Starting Visual Studio Code...")
        app, main_window = open_vscode_and_get_window(workspace_folder_path, timeout=long_wait_time)
        log("VS Code started and main window obtained.")

        if not main_window:
            log("Fatal error: Could not find VS Code main window.")
            return

        setup_window(main_window)

        # Execute DevTools script once at startup
        log("\n--- Executing DevTools script ---")
        devtools_script_content = read_file(devtools_script_path)
        open_devtools_and_run_script(main_window, devtools_script_content)
        log("--- DevTools script executed ---\n")

        # Process each prompt file
        for idx, current_prompt_file in enumerate(prompt_files):
            current_file_index = idx + 1
            
            log(f"\n===== Processing file {idx+1}/{len(prompt_files)}: {os.path.basename(current_prompt_file)} =====")
            
            prompt_content = read_file(current_prompt_file)
            log("\n--- Continuing with Chat interaction ---")
            # Focus on chat window using Ctrl+Alt+I
            log("Pressing Ctrl+Alt+I to focus on chat window...")
            send_keys_safe(main_window, "^%i")
            time.sleep(1)  # Pause to allow chat window to focus
            
            # Clear input and type workspace reference
            log("Pressing Ctrl+L to clear input...")
            send_keys_safe(main_window, "^l")
            time.sleep(0.5)  # Small pause after clearing
            
            log("Writing #cypress-realworld-app character by character...")
            text_to_type = workspace_reference
            for char in text_to_type:
                send_keys_safe(main_window, char)
                time.sleep(0.1)  # Small pause between characters

            log("Pressing TAB to select suggestion...")
            send_keys_safe(main_window, "{TAB}")
            time.sleep(wait_time)

            log("Sending prompt content to chat...")
            send_text_via_clipboard(main_window, prompt_content)

            log("Pressing Enter to send message...")
            send_keys_safe(main_window, "{ENTER}")
            # Capture timestamp immediately after pressing Enter
            timestamp_envio = get_timestamp()
            log(f"Send timestamp (Enter pressed): {timestamp_envio}")
            time.sleep(wait_time)

            log(f"Waiting {long_wait_time} seconds for response generation...")
            time.sleep(long_wait_time)

            # Save using /save
            log("Saving content using /save...")
            send_keys_safe(main_window, "/save", with_spaces=True)
            time.sleep(0.5)
            send_keys_safe(main_window, "{ENTER}")
            log("/save command sent.")
            time.sleep(2)
            
            # Select all and copy
            send_keys_safe(main_window, "^a")
            time.sleep(1)
            send_keys_safe(main_window, "^c")
            time.sleep(1.5)
            
            # Save copied content to file
            contenido = pyperclip.paste()
            original_filename = os.path.basename(current_prompt_file)
            filename_without_ext, ext = os.path.splitext(original_filename)
            timestamp_archivo = datetime.now().strftime("%Y%m%d_%H%M%S")
            archivo_salida = os.path.join(output_folder, f"{filename_without_ext}_response_{llm_name}_{timestamp_archivo}{ext}")
            
            try:
                with open(archivo_salida, "w", encoding="utf-8") as f:
                    f.write(contenido)
                log(f"✅ Content saved successfully: {archivo_salida}")
                
                # Add timestamp entry for saved response with full source file path
                # Use the timestamp from when Enter was pressed in chat instead of a new timestamp
                add_timestamp_entry(timestamp_envio, archivo_salida, current_prompt_file)
                
                # Close the file without saving using Ctrl+W
                log("Pressing Ctrl+W to close file without saving...")
                send_keys_safe(main_window, "^w")
                time.sleep(1)  # Brief pause after closing file
                
            except Exception as e:
                log(f"Error saving content to file: {e}")
                traceback.print_exc()
            
            # Close any open save dialogs
            close_save_dialog(timeout=5)
        
        # Extract and save Copilot timings once after all files are processed
        extract_copilot_timings(main_window)
        
        # Final timestamp save
        save_timestamps()
        
        log("Automation completed successfully.")
    except Exception as e:
        log(f"Unexpected error in automation: {e}")
        traceback.print_exc()
    finally:
        # Keep VS Code open - don't kill the application
        log("Script finished. VS Code remains open.")

if __name__ == "__main__":
    automate_vscode()
