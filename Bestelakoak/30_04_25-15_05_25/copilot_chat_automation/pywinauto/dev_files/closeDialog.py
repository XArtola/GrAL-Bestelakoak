# filepath: c:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\VsCode\pywinauto\closeDialog.py
# Ensure pywinauto is installed: pip install pywinauto

from pywinauto.application import Application
from pywinauto.findwindows import find_windows, ElementNotFoundError
# from pywinauto.keyboard import send_keys # Not directly used for Alt+F4 via .send_keys('%{F4}') on a window object
import time

def close_dialog_and_dont_save(main_dialog_title_regex, confirm_dialog_title_regex, dont_save_button_text):
    """
    Closes a specified dialog by sending Alt+F4, then handles a confirmation
    dialog by clicking a "Don't Save" (or similar) button.

    Args:
        main_dialog_title_regex (str): Regex to find the main dialog to close.
        confirm_dialog_title_regex (str): Regex to find the confirmation dialog.
        dont_save_button_text (str): Text of the "Don't Save" button.
    """
    try:
        # Find the main dialog
        print(f"Looking for main dialog with title regex: '{main_dialog_title_regex}'")
        main_dialog_handles = find_windows(title_re=main_dialog_title_regex, top_level_only=True)
        if not main_dialog_handles:
            print(f"Main dialog with title regex '{main_dialog_title_regex}' not found.")
            return
        
        main_dialog_handle = main_dialog_handles[0]
        # Connect to the application that owns the dialog
        app = Application(backend="uia").connect(handle=main_dialog_handle)
        main_dialog = app.window(handle=main_dialog_handle)

        print(f"Found main dialog: '{main_dialog.window_text()}'")
        if not main_dialog.is_active():
            print("Main dialog is not active, attempting to set focus.")
            try:
                main_dialog.set_focus()
                time.sleep(0.5) # Give a moment for focus
                if not main_dialog.is_active(): # Check again
                    print("Failed to activate main dialog. Sending keys might not work as expected.")
            except Exception as e_focus:
                print(f"Could not set focus on main dialog: {e_focus}")


        # Send Alt+F4 to the main dialog
        print("Sending Alt+F4 to the main dialog...")
        main_dialog.send_keys('%{F4}') # Alt+F4
        
        # Wait for the confirmation dialog to appear
        print(f"Waiting up to 10 seconds for confirmation dialog with title regex: '{confirm_dialog_title_regex}'")
        
        confirm_dialog = None
        # Try to find the confirmation dialog. It might be a child of the current app,
        # or a new top-level window (especially if the original app process terminates quickly).
        for i in range(20): # Retry for 10 seconds (20 * 0.5s)
            try:
                # Check if the original app is still running and has the dialog
                if app.is_process_running():
                    # Try to find the dialog within the same application first
                    # Allow some time for the dialog to be registered by the OS/pywinauto
                    possible_confirm_dialogs = app.windows(title_re=confirm_dialog_title_regex, top_level_only=False, visible_only=True, enabled_only=True)
                    if possible_confirm_dialogs:
                        confirm_dialog = possible_confirm_dialogs[0] # Take the first match
                        print(f"Found confirmation dialog (within app): '{confirm_dialog.window_text()}'")
                        break
                
                # If not found in the app, or app closed, try finding as any top-level window
                # This is crucial if the Alt+F4 causes the original app to spawn a separate process for the dialog
                # or if the original app closes and a system dialog appears.
                confirm_dialog_handles = find_windows(title_re=confirm_dialog_title_regex, top_level_only=True, visible_only=True, enabled_only=True)
                if confirm_dialog_handles:
                    # Connect to the application owning this new dialog
                    confirm_app = Application(backend="uia").connect(handle=confirm_dialog_handles[0], timeout=5)
                    confirm_dialog = confirm_app.window(handle=confirm_dialog_handles[0])
                    if confirm_dialog.exists() and confirm_dialog.is_visible():
                        print(f"Found confirmation dialog (top-level): '{confirm_dialog.window_text()}'")
                        break
                    else:
                        confirm_dialog = None # Reset if not valid
            except (ElementNotFoundError, RuntimeError): # RuntimeError can happen if process dies
                pass # Dialog not found yet or process ended
            except Exception as e_find:
                # Catching other potential pywinauto exceptions during search
                print(f"Minor error during confirmation dialog search iteration: {e_find}")
            
            if confirm_dialog and confirm_dialog.exists() and confirm_dialog.is_visible():
                break # Successfully found
            
            confirm_dialog = None # Ensure it's None if loop continues
            time.sleep(0.5)


        if not (confirm_dialog and confirm_dialog.exists() and confirm_dialog.is_visible()):
            print(f"Confirmation dialog with title regex '{confirm_dialog_title_regex}' not found after sending Alt+F4, or it's not visible/enabled.")
            print("This might be okay if Alt+F4 closed the initial dialog directly without confirmation,")
            print("or if the title regex for the confirmation dialog is incorrect or too slow to appear.")
            return

        print(f"Focusing confirmation dialog: '{confirm_dialog.window_text()}'")
        if not confirm_dialog.is_active():
            try:
                confirm_dialog.set_focus()
                time.sleep(0.5) # Give a moment for focus
            except Exception as e_focus_confirm:
                print(f"Could not set focus on confirmation dialog: {e_focus_confirm}")


        # Find and click the "Don't Save" button
        print(f"Looking for button with text: '{dont_save_button_text}' on dialog '{confirm_dialog.window_text()}'")
        
        try:
            # Try finding by title (exact match) first, common for many buttons
            # Using .child_window() is generally more robust.
            # Ensure the dialog is used as the parent for child_window search.
            dont_save_button = confirm_dialog.child_window(title=dont_save_button_text, control_type="Button", found_index=0)
            
            if not (dont_save_button.exists() and dont_save_button.is_enabled()): 
                 # Fallback to searching by best_match if exact title fails or button is not suitable
                 print(f"Button with exact title '{dont_save_button_text}' not found or not enabled. Trying best_match...")
                 dont_save_button = confirm_dialog.child_window(best_match=dont_save_button_text, control_type="Button", found_index=0)

            if dont_save_button.exists() and dont_save_button.is_enabled():
                print(f"Clicking '{dont_save_button_text}' button...")
                dont_save_button.click_input() # More reliable click
                print(f"Clicked '{dont_save_button_text}'.")
            else:
                print(f"Button '{dont_save_button_text}' not found or not enabled on confirmation dialog.")
                print("Available controls on confirmation dialog:")
                try:
                    confirm_dialog.print_control_identifiers(depth=3) # Increased depth
                except Exception as e_print:
                    print(f"Could not print control identifiers: {e_print}")
        except ElementNotFoundError:
            print(f"Button '{dont_save_button_text}' not found using child_window search.")
            print("Available controls on confirmation dialog:")
            try:
                confirm_dialog.print_control_identifiers(depth=3)
            except Exception as e_print:
                print(f"Could not print control identifiers: {e_print}")
        except Exception as e_button:
            print(f"An error occurred while trying to find or click the button: {e_button}")
            print("Available controls on confirmation dialog:")
            try:
                confirm_dialog.print_control_identifiers(depth=3)
            except Exception as e_print:
                print(f"Could not print control identifiers: {e_print}")


    except ElementNotFoundError as e_main_dialog:
        print(f"Element not found (likely the main dialog): {e_main_dialog}. Ensure the dialog titles and button texts are correct and dialogs are appearing as expected.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        # If an error occurs, try to print control identifiers of the active window for debugging
        try:
            # Attempt to connect to whatever is active to give some context
            active_app_handles = find_windows(active_only=True, top_level_only=True)
            if active_app_handles:
                active_app = Application(backend="uia").connect(handle=active_app_handles[0], timeout=2)
                active_window = active_app.top_window()
                if active_window and active_window.exists():
                    print(f"Controls in the currently active window ('{active_window.window_text()}'):")
                    active_window.print_control_identifiers(depth=2)
            else:
                print("No active window found to print controls from.")
        except Exception as e_active:
            print(f"Could not get active window details for debugging: {e_active}")


if __name__ == "__main__":
    # --- USER: PLEASE CONFIGURE THESE ---
    # Regex for the title of the dialog you want to send Alt+F4 to.
    # This needs to be specific enough to target the correct window.
    # Example: r".*Unsaved.*Notepad" for an unsaved Notepad window.
    # Example: r"My Application - Document1" for a specific application window.
    # Use a tool like "Inspect.exe" (part of Windows SDK) or pywinauto's print_control_identifiers()
    # on a parent window to find the exact title or a good regex.
    TARGET_DIALOG_TITLE_REGEX = r"Visual Studio Code" # Updated based on user input
    
    # Regex for the title of the confirmation dialog that appears after Alt+F4.
    # Example: r"Notepad" (Notepad's save dialog also has "Notepad" in title)
    # Example: r"Save changes.*"
    # Example: r"Confirm Exit"
    # Example: r"Microsoft Excel" (Excel's save dialog often just uses the app name)
    # For Visual Studio Code, this might also be "Visual Studio Code", or relate to the file.
    CONFIRMATION_DIALOG_TITLE_REGEX = r"ENTER_YOUR_CONFIRM_DIALOG_TITLE_REGEX_HERE" # User needs to verify this
    
    # Text of the "Don't Save" button (or "No", "Discard", etc.).
    # This should be the exact visible text on the button.
    DONT_SAVE_BUTTON_TEXT = "Don't Save" # Confirmed based on user input
    # --- END USER CONFIGURATION ---

    if TARGET_DIALOG_TITLE_REGEX == r"ENTER_YOUR_INITIAL_DIALOG_TITLE_REGEX_HERE" or \
       CONFIRMATION_DIALOG_TITLE_REGEX == r"ENTER_YOUR_CONFIRM_DIALOG_TITLE_REGEX_HERE":
        print("\n" + "="*50)
        print("!!! PLEASE CONFIGURE THE SCRIPT !!!")
        print("You need to edit 'closeDialog.py' and set the variables:")
        print(f"  1. TARGET_DIALOG_TITLE_REGEX (currently: '{TARGET_DIALOG_TITLE_REGEX}')")
        print("     Description: Regex for the title of the dialog you want to close.")
        print("     Example: If your dialog is titled 'Unsaved Changes - MyDoc.txt', use r'Unsaved Changes - MyDoc\.txt'")
        print(f"  2. CONFIRMATION_DIALOG_TITLE_REGEX (currently: '{CONFIRMATION_DIALOG_TITLE_REGEX}')")
        print("     Description: Regex for the title of the confirmation pop-up (e.g., 'Save changes?').")
        print("                  For Visual Studio Code, this might also be 'Visual Studio Code' or specific to the unsaved file.")
        print("                  PLEASE VERIFY AND UPDATE THIS VALUE if it's not the placeholder.")
        print("     Example: If the confirmation dialog is 'Confirm Save As', use r'Confirm Save As'")
        print(f"  3. DONT_SAVE_BUTTON_TEXT (currently: '{DONT_SAVE_BUTTON_TEXT}')")
        print("="*50 + "\n")
        print("Script will not run effectively until configured.")
        print("Use a tool like Inspect.exe (from Windows SDK) or another script with")
        print("app.windows() and .print_control_identifiers() to find the correct titles and button texts.")
    else:
        print("Starting dialog closing script...")
        print(f"Attempting to close dialog matching: '{TARGET_DIALOG_TITLE_REGEX}'")
        print(f"Then, looking for confirmation: '{CONFIRMATION_DIALOG_TITLE_REGEX}'")
        print(f"And clicking button: '{DONT_SAVE_BUTTON_TEXT}'")
        print("\nEnsure the target dialog is open. Waiting for 3 seconds to allow you to switch focus if needed...")
        time.sleep(3)
        
        close_dialog_and_dont_save(
            main_dialog_title_regex=TARGET_DIALOG_TITLE_REGEX,
            confirm_dialog_title_regex=CONFIRMATION_DIALOG_TITLE_REGEX,
            dont_save_button_text=DONT_SAVE_BUTTON_TEXT
        )

    print("\nScript finished.")
