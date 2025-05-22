import time
import pyperclip
from pywinauto.keyboard import send_keys
from pywinauto.application import Application
from pywinauto.findwindows import ElementNotFoundError
import os

WAIT_TIME_SHORT = 2
WAIT_TIME_MEDIUM = 5

def open_vscode_and_get_window(vscode_executable_path, folder_path, timeout=20):
    """
    Abre VS Code con la carpeta dada y retorna (app, main_window).
    """
    cmd = f'"{vscode_executable_path}" "{folder_path}"'
    app = Application(backend="uia").start(cmd)
    time.sleep(WAIT_TIME_MEDIUM)
    folder_name = os.path.basename(folder_path)
    try:
        main_window = app.connect(title_re=f".*{folder_name}.*Visual Studio Code.*", timeout=timeout).top_window()
    except ElementNotFoundError:
        main_window = app.connect(title_re=".*Visual Studio Code.*", timeout=timeout).top_window()
    return app, main_window

def open_devtools_and_run_script(main_window, script):
    """
    Abre las DevTools en VS Code, pega y ejecuta un script en la consola, y cierra DevTools.
    main_window: pywinauto window object de VS Code.
    script: string con el código JavaScript a ejecutar.
    """
    print("[LOG] Step 1: Focusing main window")
    main_window.set_focus()
    time.sleep(WAIT_TIME_SHORT)

    print("[LOG] Step 2: Opening command palette (Ctrl+Shift+P)")
    send_keys("^+p")  # Ctrl+Shift+P
    time.sleep(WAIT_TIME_SHORT)

    print("[LOG] Step 3: Typing 'Developer: Toggle Developer Tools'")
    pyperclip.copy("Developer: Toggle Developer Tools")
    send_keys("^v")
    time.sleep(WAIT_TIME_SHORT)
    send_keys("{ENTER}")

    print("[LOG] Step 4: Waiting for DevTools to open")
    time.sleep(WAIT_TIME_MEDIUM * 2)  # Esperar a que se abran las DevTools
    
    print("[LOG] Step 5: Sending TAB to move focus")
    send_keys("{TAB}")
    time.sleep(0.3)

    print("[LOG] Step 6: Pasting script and executing (Ctrl+V, Enter)")
    pyperclip.copy(script)
    send_keys("^v")
    time.sleep(WAIT_TIME_SHORT)
    send_keys("{ENTER}")

    print("[LOG] Step 7: Waiting for script to execute")
    time.sleep(WAIT_TIME_MEDIUM)

    print("[LOG] Step 8: Closing DevTools (ESC, Ctrl+Shift+P, ...)")
    #send_keys("{ESC}")
    #time.sleep(WAIT_TIME_SHORT)
    print("[LOG] Step 9: Closing DevTools (Alt + F4)")
    send_keys("%{F4}")  # Alt + F4
    time.sleep(WAIT_TIME_SHORT)
    send_keys("^+i")  # Ctrl+Shift+I como refuerzo
    time.sleep(WAIT_TIME_SHORT)

if __name__ == "__main__":
    # Configura aquí la ruta a tu VS Code y a una carpeta cualquiera
    VSCODE_EXECUTABLE_PATH = r"C:\Users\xabia\AppData\Local\Programs\Microsoft VS Code\Code.exe"
    FOLDER_TO_OPEN = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak"  # Cambia por una carpeta válida

    # Script de ejemplo para ejecutar en la consola DevTools
    JS_SCRIPT = "console.log('Hello from automation!');"

    print("Abriendo VS Code...")
    app, main_window = open_vscode_and_get_window(VSCODE_EXECUTABLE_PATH, FOLDER_TO_OPEN)
    print("Ejecutando script en DevTools...")
    open_devtools_and_run_script(main_window, JS_SCRIPT)
    print("Listo.")
