\
import time
import re
from pywinauto import Application, Desktop, keyboard
from pywinauto.timings import wait_until_passes, TimeoutError as PywinautoTimeoutError
from pywinauto.findwindows import find_windows, ElementNotFoundError
from pywinauto.findbestmatch import MatchError

# --- Configuración Global (Ajusta según sea necesario) ---
VSCODE_TITLE_REGEX = r".*Visual Studio Code.*"
CONFIRM_DIALOG_TITLE_REGEX = r".*Visual Studio Code.*" # Puede ser el mismo o más específico
DONT_SAVE_BUTTON_TEXT_ES = "No guardar"
DONT_SAVE_BUTTON_TEXT_EN = "Don't Save"
# Regex para encontrar el botón en varios idiomas dentro de los diálogos
DISCOVERY_BUTTON_TEXT_PATTERN = r".*(Don't Save|No guardar).*"


def connect_to_vscode_instance():
    #"Intenta conectarse a una instancia activa de VSCode.\"\"\"
    try:
        print("Intentando conectar a VSCode...")
        app = Application(backend='uia').connect(title_re=VSCODE_TITLE_REGEX, active_only=True, timeout=10)
        main_window = app.window(title_re=VSCODE_TITLE_REGEX)
        if main_window.exists() and main_window.is_visible():
            print(f"Conectado a la ventana de VSCode: '{main_window.window_text()}'")
            main_window.set_focus()
            time.sleep(0.5)
            return app, main_window
        else:
            print("No se encontró una ventana principal de VSCode activa o visible.")
            return None, None
    except Exception as e:
        print(f"Error al conectar con VSCode: {e}")
        return None, None

# --- Método 1: Basado en proba.py ---
def close_active_tab_and_handle_dialog_proba_style():
    """
    Cierra la pestaña activa en VSCode enviando Ctrl+F4 y maneja el diálogo de 'No Guardar'.
    """
    print("\\n--- Probando Método 1: Estilo proba.py ---")
    app, main_window = connect_to_vscode_instance()
    if not main_window:
        print("Método 1: No se pudo conectar a VSCode.")
        return

    try:
        print("Método 1: Enviando Ctrl+F4 para cerrar la pestaña activa...")
        main_window.type_keys('^{F4}') # Ctrl + F4
        time.sleep(1) # Dar tiempo a que aparezca el diálogo

        def find_dont_save_button_proba():
            # El diálogo puede ser una nueva ventana o una ventana hija de la app principal
            # Intentamos buscar en el escritorio para mayor generalidad
            desktop = Desktop(backend='uia')
            # El título del diálogo de guardado en VSCode suele ser también "Visual Studio Code"
            dlg = desktop.window(title_re=CONFIRM_DIALOG_TITLE_REGEX, class_name="#32770") # #32770 es común para diálogos modales
            if dlg.exists():
                print(f"Método 1: Diálogo encontrado: '{dlg.window_text()}'")
                # Intentar encontrar el botón por texto en inglés o español
                button_en = dlg.child_window(title=DONT_SAVE_BUTTON_TEXT_EN, control_type="Button")
                if button_en.exists():
                    return button_en
                button_es = dlg.child_window(title=DONT_SAVE_BUTTON_TEXT_ES, control_type="Button")
                if button_es.exists():
                    return button_es
            return None

        print("Método 1: Esperando el diálogo de confirmación y el botón 'No Guardar'...")
        dont_save_button = wait_until_passes(
            timeout=10,
            retry_interval=0.5,
            func=find_dont_save_button_proba
        )

        if dont_save_button and dont_save_button.exists():
            print(f"Método 1: Botón '{dont_save_button.window_text()}' encontrado. Haciendo clic...")
            dont_save_button.click_input()
            print("Método 1: ✅ Botón pulsado exitosamente.")
        else:
            print("Método 1: ❌ No se encontró el botón 'No Guardar' en el tiempo esperado.")

    except PywinautoTimeoutError:
        print("Método 1: ❌ Timeout esperando el diálogo o el botón.")
    except Exception as e:
        print(f"Método 1: ❌ Error: {e}")
    finally:
        if main_window and main_window.exists():
            main_window.set_focus() # Devolver el foco si es posible

# --- Método 2: Basado en closeDialog.py ---
def close_window_alt_f4_and_handle_dialog_closedialog_style():
    """
    Cierra la ventana principal (o una específica) con Alt+F4 y maneja el diálogo.
    """
    print("\\n--- Probando Método 2: Estilo closeDialog.py ---")
    # Para este método, asumimos que queremos cerrar la ventana principal de VSCode
    # o un diálogo específico si se configura TARGET_DIALOG_TITLE_REGEX de forma diferente.
    target_dialog_title_regex = VSCODE_TITLE_REGEX # Cerrar la ventana principal de VSCode
    
    try:
        print(f"Método 2: Buscando diálogo principal con título regex: '{target_dialog_title_regex}'")
        main_dialog_handles = find_windows(title_re=target_dialog_title_regex, top_level_only=True, visible_only=True, enabled_only=True)
        if not main_dialog_handles:
            print(f"Método 2: No se encontró el diálogo principal '{target_dialog_title_regex}'.")
            return
        
        main_dialog_handle = main_dialog_handles[0]
        app_instance = Application(backend="uia").connect(handle=main_dialog_handle)
        main_dialog = app_instance.window(handle=main_dialog_handle)

        print(f"Método 2: Diálogo principal encontrado: '{main_dialog.window_text()}'. Intentando enfocar.")
        main_dialog.set_focus()
        time.sleep(0.5)

        print("Método 2: Enviando Alt+F4 al diálogo principal...")
        main_dialog.send_keys('%{F4}') # Alt+F4
        time.sleep(1) # Dar tiempo a que aparezca el diálogo de confirmación

        confirm_dialog = None
        print(f"Método 2: Esperando diálogo de confirmación (título regex: '{CONFIRM_DIALOG_TITLE_REGEX}')...")
        
        # Búsqueda robusta del diálogo de confirmación
        end_time = time.time() + 10 # Esperar hasta 10 segundos
        while time.time() < end_time:
            # Buscar como ventana de la app actual o como ventana de nivel superior
            possible_confirm_dialogs = app_instance.windows(title_re=CONFIRM_DIALOG_TITLE_REGEX, class_name="#32770", top_level_only=False)
            if possible_confirm_dialogs:
                confirm_dialog = possible_confirm_dialogs[0]
                break
            
            # Buscar como ventana de nivel superior (podría ser de otra app o del sistema)
            desktop_dialog_handles = find_windows(title_re=CONFIRM_DIALOG_TITLE_REGEX, class_name="#32770", top_level_only=True)
            if desktop_dialog_handles:
                try:
                    confirm_app = Application(backend="uia").connect(handle=desktop_dialog_handles[0], timeout=1)
                    confirm_dialog = confirm_app.window(handle=desktop_dialog_handles[0])
                    if confirm_dialog.exists() and confirm_dialog.is_visible():
                        break
                    else:
                        confirm_dialog = None
                except Exception:
                    confirm_dialog = None # No pudo conectar o la ventana no es válida
            time.sleep(0.5)


        if not (confirm_dialog and confirm_dialog.exists() and confirm_dialog.is_visible()):
            print(f"Método 2: No se encontró el diálogo de confirmación '{CONFIRM_DIALOG_TITLE_REGEX}'.")
            return

        print(f"Método 2: Diálogo de confirmación encontrado: '{confirm_dialog.window_text()}'. Intentando enfocar.")
        confirm_dialog.set_focus()
        time.sleep(0.5)

        print(f"Método 2: Buscando botón '{DONT_SAVE_BUTTON_TEXT_EN}' o '{DONT_SAVE_BUTTON_TEXT_ES}'...")
        button_to_click = None
        try:
            # Intentar por título exacto (inglés)
            btn_en = confirm_dialog.child_window(title=DONT_SAVE_BUTTON_TEXT_EN, control_type="Button", found_index=0)
            if btn_en.exists() and btn_en.is_enabled():
                button_to_click = btn_en
            else:
                # Intentar por título exacto (español)
                btn_es = confirm_dialog.child_window(title=DONT_SAVE_BUTTON_TEXT_ES, control_type="Button", found_index=0)
                if btn_es.exists() and btn_es.is_enabled():
                    button_to_click = btn_es
                else: # Fallback a best_match si el título exacto falla
                    print(f"Método 2: Botón con título exacto no encontrado. Intentando best_match con '{DONT_SAVE_BUTTON_TEXT_EN}'...")
                    button_to_click = confirm_dialog.child_window(best_match=DONT_SAVE_BUTTON_TEXT_EN, control_type="Button", found_index=0)
                    if not (button_to_click.exists() and button_to_click.is_enabled()):
                         print(f"Método 2: best_match con '{DONT_SAVE_BUTTON_TEXT_EN}' falló. Intentando best_match con '{DONT_SAVE_BUTTON_TEXT_ES}'...")
                         button_to_click = confirm_dialog.child_window(best_match=DONT_SAVE_BUTTON_TEXT_ES, control_type="Button", found_index=0)


            if button_to_click and button_to_click.exists() and button_to_click.is_enabled():
                print(f"Método 2: Botón '{button_to_click.window_text()}' encontrado. Haciendo clic...")
                button_to_click.click_input()
                print("Método 2: ✅ Botón pulsado exitosamente.")
            else:
                print(f"Método 2: ❌ No se encontró o no está habilitado el botón en el diálogo de confirmación.")
                confirm_dialog.print_control_identifiers(depth=2)
        except ElementNotFoundError:
            print(f"Método 2: ❌ Botón no encontrado mediante child_window.")
            confirm_dialog.print_control_identifiers(depth=2)
        except Exception as e_button:
            print(f"Método 2: ❌ Error al interactuar con el botón: {e_button}")
            confirm_dialog.print_control_identifiers(depth=2)

    except ElementNotFoundError as e_main_dialog:
        print(f"Método 2: ❌ Elemento no encontrado (probablemente el diálogo principal): {e_main_dialog}")
    except Exception as e:
        print(f"Método 2: ❌ Error inesperado: {e}")

# --- Método 3: Basado en vscode_chat_automation_*.py (Manejo de diálogo de guardado de VSCode) ---
def close_vscode_save_dialog_robustly():
   
   # Busca y cierra el diálogo de guardar de VSCode usando múltiples estrategias.
   
    print("\\n--- Probando Método 3: Estilo vscode_chat_automation (Robusto) ---")
    dialog_found = None
    
    print(f"Método 3: Buscando diálogo de guardar de VSCode (título: '{CONFIRM_DIALOG_TITLE_REGEX}', clase: '#32770')...")
    end_time = time.time() + 10 # Esperar hasta 10 segundos
    while time.time() < end_time:
        try:
            # Buscar diálogos de VSCode que sean modales (#32770)
            dialogs = Desktop(backend="uia").windows(
                class_name="#32770",
                title_re=CONFIRM_DIALOG_TITLE_REGEX, # Asegurarse que es un diálogo de VSCode
                top_level_only=True,
                visible_only=True,
                enabled_only=True
            )
            for win in dialogs:
                # Verificar si este diálogo contiene un botón de "No Guardar" (o similar)
                # Esto ayuda a distinguir el diálogo de guardado de otros diálogos de VSCode
                try:
                    if win.child_window(title_re=DISCOVERY_BUTTON_TEXT_PATTERN, control_type="Button").exists(timeout=0.1):
                        dialog_found = win
                        print(f"Método 3: Diálogo potencial encontrado: '{dialog_found.window_text()}'")
                        break
                except MatchError: # child_window no encontró el botón
                    continue 
                except Exception: # Otra excepción durante la comprobación del botón
                    continue
            if dialog_found:
                break
        except Exception as e_find_dialog:
            print(f"Método 3: Error menor durante la búsqueda de diálogos: {e_find_dialog}")
        
        if not dialog_found:
            print(".", end="", flush=True)
            time.sleep(0.5)

    if not dialog_found:
        print("\\nMétodo 3: ❌ No se detectó el diálogo de guardar de VS Code.")
        return False

    print(f"\\nMétodo 3: Interactuando con el diálogo: '{dialog_found.window_text()}'")
    try:
        dialog_found.set_focus()
        time.sleep(0.3)

        # Intento 1: Alt+N (Común para "No guardar" o "Don't Save" si tiene acelerador)
        print("Método 3: Intentando cerrar con Alt+N...")
        try:
            dialog_found.type_keys("%n", pause=0.1) # Alt+N
            time.sleep(1.0) 
            if not dialog_found.exists(timeout=0.2):
                print("Método 3: ✅ Diálogo cerrado después de Alt+N.")
                return True
            else:
                print("Método 3: Diálogo aún existe después de Alt+N.")
        except Exception as e_alt_n:
            print(f"Método 3: Advertencia al enviar Alt+N: {e_alt_n}")

        # Intento 2: Tab + Enter (Navegar y aceptar opción por defecto o la que quede seleccionada)
        print("Método 3: Intentando cerrar con Tab + Enter...")
        try:
            dialog_found.set_focus() # Re-enfocar
            time.sleep(0.2)
            dialog_found.type_keys("{TAB}", pause=0.1) 
            time.sleep(0.3) 
            dialog_found.type_keys("{ENTER}", pause=0.1)
            time.sleep(1.0)
            if not dialog_found.exists(timeout=0.2):
                print("Método 3: ✅ Diálogo cerrado después de Tab + Enter.")
                return True
            else:
                print("Método 3: Diálogo aún existe después de Tab + Enter.")
        except Exception as e_tab_enter:
            print(f"Método 3: Advertencia al enviar Tab + Enter: {e_tab_enter}")

        print("Método 3: Intentos con atajos de teclado no cerraron el diálogo. Buscando botón específico...")
        dialog_found.set_focus() # Asegurar foco en el diálogo
        dialog_found.wait('active', timeout=5, retry_interval=0.5) # Esperar a que esté activo

        target_button = None
        buttons_in_dialog = dialog_found.children(control_type="Button")
        print(f"Método 3: Buscando botón con texto que coincida con '{DISCOVERY_BUTTON_TEXT_PATTERN}'...")
        
        for btn in buttons_in_dialog:
            btn_text = btn.window_text()
            if btn_text and (re.search(DONT_SAVE_BUTTON_TEXT_EN, btn_text, re.IGNORECASE) or \
                             re.search(DONT_SAVE_BUTTON_TEXT_ES, btn_text, re.IGNORECASE)):
                target_button = btn
                print(f"Método 3: Botón de acción ('{target_button.window_text()}') encontrado.")
                break
        
        if not target_button or not target_button.exists():
            print(f"Método 3: ❌ No se localizó el botón 'No Guardar'/'Don't Save'.")
            dialog_found.print_control_identifiers(depth=2)
            return False

        print(f"Método 3: Intentando interactuar con el botón: '{target_button.window_text()}'")
        target_button.wait('visible', timeout=3)
        target_button.wait('enabled', timeout=3)
        target_button.set_focus() # Enfocar el botón antes de interactuar

        # Intento de Clic A: .invoke()
        try:
            print(f"Método 3: Intentando .invoke() en '{target_button.window_text()}'...")
            target_button.invoke()
            time.sleep(1.0)
            if not dialog_found.exists(timeout=0.2):
                 print(f"Método 3: ✅ Diálogo cerrado con .invoke().")
                 return True
        except Exception as e_invoke:
            print(f"Método 3: .invoke() falló: {e_invoke}")

        # Intento de Clic B: .click_input()
        target_button.set_focus() # Re-enfocar
        time.sleep(0.1)
        try:
            print(f"Método 3: Intentando .click_input() en '{target_button.window_text()}'...")
            target_button.click_input()
            time.sleep(1.0)
            if not dialog_found.exists(timeout=0.2):
                print(f"Método 3: ✅ Diálogo cerrado con .click_input().")
                return True
        except Exception as e_click_input:
            print(f"Método 3: .click_input() falló: {e_click_input}")
        
        # Intento de Clic C: .click()
        target_button.set_focus() # Re-enfocar
        time.sleep(0.1)
        try:
            print(f"Método 3: Intentando .click() en '{target_button.window_text()}'...")
            target_button.click()
            time.sleep(1.0)
            if not dialog_found.exists(timeout=0.2):
                print(f"Método 3: ✅ Diálogo cerrado con .click().")
                return True
        except Exception as e_click:
            print(f"Método 3: .click() falló: {e_click}")

        print(f"Método 3: ❌ Todos los métodos de interacción con el botón fallaron.")
        if dialog_found.exists():
            dialog_found.print_control_identifiers(depth=2)
        return False

    except PywinautoTimeoutError:
        print("Método 3: ❌ Timeout esperando que el diálogo se active.")
        if dialog_found and dialog_found.exists(): dialog_found.print_control_identifiers(depth=2)
        return False
    except ElementNotFoundError:
        print("Método 3: ❌ Elemento no encontrado (probablemente el diálogo o un botón).")
        return False
    except Exception as e_main_interact:
        print(f"Método 3: ❌ Error general al interactuar con el diálogo: {e_main_interact}")
        if dialog_found and dialog_found.exists(): dialog_found.print_control_identifiers(depth=2)
        return False


if __name__ == "__main__":
    print("--- INICIO DE PRUEBAS DE CIERRE DE DIÁLOGOS ---")
    print("Por favor, asegúrate de que VSCode está abierto y tiene una pestaña con cambios sin guardar.")
    print("El script intentará cerrar la pestaña/ventana y manejar el diálogo de 'No Guardar'.")
    
    # --- Preparación: Abrir una pestaña y modificarla para que aparezca el diálogo ---
    # Esto es un ejemplo, necesitarás tener una pestaña con cambios sin guardar manualmente
    # o adaptar esta parte para que cree una situación de prueba.
    # Por simplicidad, este script asume que ya existe tal situación.
    
    print("\\nEsperando 5 segundos para que prepares la situación de prueba (pestaña con cambios sin guardar)...")
    time.sleep(5)

    # --- Ejecutar los métodos de prueba ---
    
    # Prueba 1: Cerrar pestaña activa con Ctrl+F4 y manejar diálogo
    # Asegúrate de que una pestaña con cambios está activa en VSCode
    # input("Prepara una pestaña con cambios sin guardar y pulsa Enter para probar el Método 1...")
    # close_active_tab_and_handle_dialog_proba_style()
    # print("\\nEsperando 5 segundos antes de la siguiente prueba...")
    # time.sleep(5)

    # Prueba 2: Cerrar ventana con Alt+F4 y manejar diálogo
    # Esto intentará cerrar la ventana principal de VSCode.
    # input("Prepara VSCode (puede ser la ventana principal con cambios) y pulsa Enter para probar el Método 2...")
    # close_window_alt_f4_and_handle_dialog_closedialog_style()
    # print("\\nEsperando 5 segundos antes de la siguiente prueba...")
    # time.sleep(5)
    
    # Prueba 3: Buscar y cerrar diálogo de guardado de VSCode robustamente
    # Este método es más genérico para cuando un diálogo de "No Guardar" ya está presente.
    # Para probarlo, primero provoca que aparezca el diálogo (ej. cerrando una pestaña con cambios)
    # y luego ejecuta esta función.
    print("Para el Método 3, provoca manualmente que aparezca un diálogo de 'No Guardar' en VSCode.")
    input("Una vez el diálogo esté visible, pulsa Enter para que el Método 3 intente cerrarlo...")
    if close_vscode_save_dialog_robustly():
        print("\\nMétodo 3: Parece que el diálogo se cerró correctamente.")
    else:
        print("\\nMétodo 3: No se pudo cerrar el diálogo o no se encontró.")

    print("\\n--- FIN DE PRUEBAS ---")
    print("Revisa la salida para ver qué métodos fueron efectivos.")
    print("Puede que necesites ajustar los selectores (títulos, regex) en el script para tu entorno específico.")

