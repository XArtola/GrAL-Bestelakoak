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

# --- Configuración ---
# Ruta al archivo de prompt
prompt_file_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\30_04_25-15_05_25\preparePrompts\prompts\auth1.spec.txt"
# Ruta al archivo del script para DevTools
devtools_script_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\VsCode\pywinauto\copilotTimer2.js"

# Variable global para almacenar los timestamps y nombres de archivos
timestamps_data = []

# Función para agregar datos de timestamp y archivo
def add_timestamp_entry(timestamp, output_file):
    """Agrega una entrada al registro de timestamps."""
    timestamps_data.append({
        "timestamp": timestamp,
        "output_file": output_file
    })

# Función para guardar los timestamps a un archivo JSON
def save_timestamps_to_json(json_file_path=None):
    """Guarda los timestamps registrados en un archivo JSON."""
    if json_file_path is None:
        current_date = datetime.now().strftime("%Y%m%d")
        json_file_path = f"timestamps_{current_date}.json"

    try:
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(timestamps_data, f, indent=4)
        print(f"Timestamps guardados en: {json_file_path}")
    except Exception as e:
        print(f"Error al guardar los timestamps: {e}")

# Función para leer el contenido del archivo
def read_prompt_file(file_path):
    """Lee el contenido de un archivo y lo devuelve como una cadena."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        print(f"Archivo de prompt leído correctamente: {file_path}")
        return content
    except Exception as e:
        print(f"Error al leer el archivo de prompt: {e}")
        return """Error: No se pudo leer el archivo de prompt."""

# Leer el contenido del archivo de prompt al inicio del script
auth1_spec_content = read_prompt_file(prompt_file_path)

# Tiempos de espera
wait_time = 2  # Tiempo de espera normal (segundos)
long_wait_time = 90  # Tiempo de espera largo (1 minuto y 30 segundos)

# --- Funciones de Automatización ---

def send_keys_safely(window, keys_to_send, with_spaces=False, pause=0.05):
    """Envía teclas de manera segura a una ventana específica."""
    try:
        # Asegurar que tenemos el foco en la ventana correcta
        if not window.is_active():
            window.set_focus()
            time.sleep(0.5) # Pequeña pausa para que el foco se establezca

        # Reconfirmar el foco si es necesario (puede que se pierda entre comandos)
        if not window.is_active():
            window.set_focus()
            time.sleep(0.5)

        print(f"Enviando teclas a '{window.window_text() or window.class_name()}': {keys_to_send}")
        send_keys(keys_to_send, with_spaces=with_spaces, pause=pause)
        return True
    except Exception as e: # <-- Bloque except añadido de nuevo
        print(f"Error al enviar teclas a '{window.window_text() or window.class_name()}': {e}")
        return False


def find_vscode_window(main_pid, timeout=30):
    """Busca y conecta con la ventana principal de VS Code usando diferentes estrategias."""
    print(f"🔎 Buscando ventana principal de VS Code durante {timeout} segundos...")
    end_time = time.time() + timeout

    while time.time() < end_time:
        # Estrategia 1: Conectar por PID (más directo si funciona)
        try:
            app = Application(backend="uia").connect(process=main_pid, timeout=1) # Timeout corto para la conexión
            main_window = app.top_window()
            if main_window.window_text() and main_window.class_name() != "#32770":
                print(f"✅ Ventana principal encontrada por PID: '{main_window.window_text()}'")
                try:
                    main_window.wait('ready', timeout=5)
                    print("Ventana principal está lista.")
                except Exception as e_wait:
                    print(f"Advertencia: Ventana principal encontrada pero no lista a tiempo: {e_wait}")
                return main_window
            else:
                pass # No imprimir error si solo no parece principal
        except Exception as e:
            pass # Ignorar errores de conexión y seguir intentando

        # Estrategia 2: Conectar por título (busca ventanas existentes)
        try:
            app = Application(backend="uia").connect(title_re=r".*Visual Studio Code.*", timeout=1, class_name_re="^!#32770$")
            main_window = app.top_window()
            if main_window.window_text() and main_window.class_name() != "#32770":
                print(f"✅ Ventana principal encontrada por título regex: '{main_window.window_text()}'")
                try:
                    main_window.wait('ready', timeout=5)
                    print("Ventana principal está lista.")
                except Exception as e_wait:
                    print(f"Advertencia: Ventana principal encontrada pero no lista a tiempo: {e_wait}")
                return main_window
            else:
                pass
        except Exception as e:
            pass

        # Estrategia 3: Buscar en todos los procesos activos "Code.exe"
        try:
            for proc in psutil.process_iter(['pid', 'name']):
                if proc.info['name'] and proc.info['name'].lower() == "code.exe":
                    try:
                        app = Application(backend="uia").connect(process=proc.info['pid'], timeout=1)
                        main_window = app.top_window()
                        if main_window.window_text() and main_window.class_name() != "#32770":
                            print(f"✅ Ventana principal encontrada por proceso 'Code.exe' (PID: {proc.info['pid']}): '{main_window.window_text()}'")
                            try:
                                main_window.wait('ready', timeout=5)
                                print("Ventana principal está lista.")
                            except Exception as e_wait:
                                print(f"Advertencia: Ventana principal encontrada pero no lista a tiempo: {e_wait}")
                            return main_window
                        else:
                            pass
                    except Exception:
                        pass
        except Exception:
            pass

        print(".", end="", flush=True)
        time.sleep(1)

    print("\n❌ No se pudo conectar con la ventana principal de VS Code tras varios intentos.")
    return None


def setup_window(window):
    """Configura la ventana para la interacción (foco, maximizar)."""
    print(f"Configurando ventana '{window.window_text() or window.class_name()}'...")
    try:
        if not window.is_visible():
            print("Advertencia: Ventana no visible, intentando mostrar...")
            try:
                window.show()
                time.sleep(0.5)
            except Exception as e:
                print(f"No se pudo mostrar la ventana: {e}")

        if window.is_minimized():
            print("Ventana minimizada, restaurando...")
            try:
                window.restore()
                time.sleep(0.5)
            except Exception as e:
                print(f"No se pudo restaurar la ventana: {e}")

        print("Poniendo ventana en primer plano y enfocando...")
        window.set_focus()
        time.sleep(1)

        try:
            if not window.is_maximized():
                window.maximize()
                print("Ventana maximizada.")
                time.sleep(0.5)
        except Exception as e:
            print(f"No se pudo maximizar la ventana o ya estaba maximizada: {e}")

        try:
            window.wait('ready', timeout=5)
            print("Ventana está lista para interacción.")
        except Exception as e:
            print(f"Advertencia: Ventana puede no estar completamente lista: {e}")

        print("Ventana configurada.")
    except Exception as e:
        print(f"Error al configurar la ventana: {e}")
        traceback.print_exc()


def send_text_to_editor(window, text):
    """Envía texto al editor usando el portapapeles."""
    original_clipboard = ""
    try:
        original_clipboard = pyperclip.paste()
    except pyperclip.PyperclipException as e:
        print(f"Advertencia al obtener el contenido del portapapeles: {e}")
        original_clipboard = ""

    try:
        print(f"Usando portapapeles para enviar texto a '{window.window_text() or window.class_name()}'...")
        pyperclip.copy(text)
        send_keys_safely(window, "^v")
        time.sleep(1)
        print("Texto enviado vía portapapeles.")

    except Exception as e:
        print(f"Error usando portapapeles: {e}. Intentando método alternativo (send_keys)...")
        lines = text.strip().split('\n')
        for i, line in enumerate(lines):
            print(f"Escribiendo línea {i+1}/{len(lines)}...")
            escaped_line = line.replace('{', '{{}').replace('}', '{}}').replace('+', '{{+}}').replace('^', '{{^}}').replace('%', '{{%}}').replace('~', '{{}}').replace('(', '{{(}}').replace(')', '{{)}}')
            send_keys_safely(window, escaped_line, with_spaces=True, pause=0.01)
            send_keys_safely(window, "{ENTER}")
            time.sleep(0.05)
        print("Texto enviado línea por línea.")
    finally:
        try:
            current_clipboard = pyperclip.paste()
            if current_clipboard != original_clipboard:
                pyperclip.copy(original_clipboard)
                print("Portapapeles restaurado.")
        except Exception as e:
            print(f"Error al restaurar el portapapeles: {e}")
        except Exception as e:
            print(f"Error al restaurar el portapapeles: {e}")
        except pyperclip.PyperclipException as e:
            print(f"Advertencia al restaurar el portapapeles: {e}")
        except Exception as e_gen:
            print(f"Error inesperado al restaurar el portapapeles: {e_gen}")


def save_content(window):
    """Guarda el contenido usando /save (si aplica)."""
    print("Intentando guardar contenido con /save...")
    send_keys_safely(window, "/save", with_spaces=True)
    time.sleep(0.5)
    send_keys_safely(window, "{ENTER}")
    print("Comando /save enviado.")
    time.sleep(wait_time)

def save_response_to_file(window):
    """Selecciona, copia y guarda el contenido a un archivo local."""
    print("Guardando respuesta a archivo local...")
    send_keys_safely(window, "^a")
    time.sleep(1)

    print("Copiando al portapapeles (Ctrl+C)...")
    send_keys_safely(window, "^c")
    time.sleep(1.5)

    archivo_salida = ""
    try:
        contenido = pyperclip.paste()
        print(f"Copiados {len(contenido)} caracteres del portapapeles.")

        if not contenido.strip():
            print("Advertencia: El portapapeles está vacío o contiene solo espacios. No se guardará nada.")
            return "empty_content.txt"

        original_filename = os.path.basename(prompt_file_path)
        filename_without_ext, ext = os.path.splitext(original_filename)
        timestamp_archivo = datetime.now().strftime("%Y%m%d_%H%M%S")
        archivo_salida = f"{filename_without_ext}_response_{timestamp_archivo}{ext}"

        with open(archivo_salida, "w", encoding="utf-8") as f:
            f.write(contenido)
        print(f"Contenido guardado en: {archivo_salida}")
    except Exception as e:
        print(f"Error guardando el contenido: {e}")
        traceback.print_exc()
        timestamp_error = datetime.now().strftime("%Y%m%d_%H%M%S")
        archivo_salida = f"error_guardado_response_{timestamp_error}.txt"
        try:
            with open(archivo_salida, "w", encoding="utf-8") as f:
                f.write(f"Error during save_response_to_file: {e}\n\n")
                f.write("Content attempted to save:\n")
                f.write(contenido)
            print(f"Error registrado y contenido intentado guardar en: {archivo_salida}")
        except Exception as e2:
            print(f"Fallo catastrófico en el guardado alternativo: {e2}")
            archivo_salida = "fatal_error_no_guardado.txt"

    return archivo_salida

def cerrar_dialogo_guardar_vscode(timeout=15):
    """
    Cierra el diálogo de guardar cambios de VSCode si aparece,
    buscando específicamente el botón 'No guardar'/'Don't Save'.
    """
    print(f"🔎 Buscando diálogo de guardar de VSCode durante hasta {timeout} segundos...")

    end_time = time.time() + timeout
    dialog_found = None

    while time.time() < end_time:
        try:
            dialogs = Desktop(backend="uia").windows(class_name="#32770", title_re=".*Visual Studio Code.*", top_level_only=True)
            for win in dialogs:
                try:
                    if win.child_window(control_type="Button").exists():
                        if win.child_window(title_re=".*Don't Save.*|.*No guardar.*", control_type="Button").exists():
                            dialog_found = win
                            print(f"✅ Diálogo potencial encontrado: '{dialog_found.window_text()}'")
                            break
                except MatchError:
                    continue
                except Exception as e:
                    print(f"⚠️ Error inesperado al procesar ventana candidata '{win.window_text()}': {e}")
                    continue
        except Exception as e:
            print(f"⚠️ Error al buscar diálogos: {e}")
            pass

        if dialog_found:
            break

        print(".", end="", flush=True)
        time.sleep(0.5)

    if not dialog_found:
        print("\n❌ No se detectó el diálogo de guardar tras la espera.")
        return False

    print("\nInteraccionando con el diálogo...")
    dialog_found.set_focus()
    time.sleep(0.5)
    
    # PRIMER INTENTO: Usar Alt+N para "No guardar" directamente (atajo de teclado)
    print("Intentando cerrar diálogo con Alt+N...")
    send_keys("%n")  # Alt+N
    time.sleep(1.5)  # Tiempo suficiente para que responda
    
    # Verificar si el diálogo sigue abierto
    try:
        if not dialog_found.exists() or not dialog_found.is_visible():
            print("✅ Diálogo cerrado exitosamente con Alt+N.")
            return True
    except Exception:
        # Si hay error al verificar, es probable que el diálogo se haya cerrado
        print("✅ Diálogo probablemente cerrado con Alt+N.")
        return True
    
    print("Alt+N no funcionó. Intentando con el método de clic en botón...")

    # SEGUNDO INTENTO: Método original de buscar y hacer clic en el botón
    button_clicked = False
    try:
        buttons = dialog_found.children(control_type="Button")
        print(f"Encontrados {len(buttons)} botones en el diálogo.")

        for button in buttons:
            btn_text = button.window_text()
            print(f"Examinando botón: '{btn_text}'")
            if re.search(r"Don't Save", btn_text, re.IGNORECASE) or re.search(r"No guardar", btn_text, re.IGNORECASE):
                print(f"✅ Encontrado botón 'No guardar'/'Don't Save': '{btn_text}'")
                try:
                    button.wait('visible', timeout=3)
                    button.wait('enabled', timeout=3)
                    print(f"El botón '{btn_text}' está visible y habilitado. Clickeando...")
                    button.click_input()
                    print(f"✅ Clic en botón: '{btn_text}'")
                    button_clicked = True
                    break
                except Exception as e_click:
                    print(f"⚠️ Error al esperar/hacer clic en el botón '{btn_text}': {e_click}")
                    continue

    except Exception as e_general:
        print(f"⚠️ Error general al buscar o interactuar con botones en el diálogo: {e_general}")
        traceback.print_exc()

    if not button_clicked:
        print("❌ No se pudo encontrar ni hacer clic en el botón 'No guardar'/'Don't Save'.")
        try:
            print("Imprimiendo identificadores de controles del diálogo para depuración:")
            dialog_found.print_control_identifiers(depth=3)
        except:
            pass
        return False

    return True

def medir_tiempo_respuesta_enviar(main_window):
    """
    Mide el tiempo que tarda el botón de enviar en volver a estar disponible.
    Asume que el botón se deshabilita durante el procesamiento.
    """
    print("⌛ Midiendo tiempo de respuesta del botón de enviar...")

    try:
        send_button = None
        possible_send_buttons = [
            {"title": "Send", "control_type": "Button"},
            {"title": "Enviar", "control_type": "Button"},
            {"auto_id_re": ".*send.*button.*", "control_type": "Button"},
            {"class_name_re": ".*SendButton.*", "control_type": "Button"},
        ]

        print("Buscando botón de enviar...")
        for criteria in possible_send_buttons:
            try:
                found_control = main_window.child_window(**criteria).wait('visible', timeout=5)
                send_button = found_control
                print(f"✅ Botón de enviar encontrado: '{send_button.window_text() or send_button.class_name()}'")
                break
            except MatchError:
                pass
            except Exception as e:
                print(f"Error al buscar botón con criterios {criteria}: {e}")
                pass

        if not send_button:
            print("❌ No se encontró el botón de enviar.")
            return

        print(f"Esperando a que el botón '{send_button.window_text() or send_button.class_name()}' esté habilitado...")
        if not send_button.wait('enabled', timeout=long_wait_time):
            print(f"❌ El botón de enviar no se habilitó a tiempo ({long_wait_time}s).")
            return
        print("Botón de enviar está habilitado.")

    except Exception as e:
        print(f"❌ Error al medir tiempo de respuesta: {e}")
        traceback.print_exc()


def clear_chat(window):
    """Limpia el chat usando el comando /clear."""
    print("Limpiando el chat...")
    try:
        send_keys_safely(window, "^+p")
        time.sleep(wait_time)
        send_keys_safely(window, ">", with_spaces=True)
        time.sleep(0.5)

        print("Escribiendo /clear...")
        send_keys_safely(window, "/clear", with_spaces=True)
        time.sleep(0.5)

        send_keys_safely(window, "{ENTER}")
        print("Comando /clear enviado.")
        time.sleep(wait_time)
    except Exception as e:
        print(f"Error al intentar limpiar el chat: {e}")
        traceback.print_exc()

def focus_devtools_window(timeout=15):
    """Busca la ventana de Developer Tools y le da foco."""
    print(f"🔎 Buscando ventana de Developer Tools durante hasta {timeout} segundos...")

    end_time = time.time() + timeout
    devtools_window = None

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
                print(f"✅ Ventana de Developer Tools encontrada: '{devtools_window.window_text() or devtools_window.class_name()}'")
                print(f"Tipo del objeto encontrado: {type(devtools_window)}") # Debug: imprimir tipo

                try:
                    # --- MODIFICACIÓN: Remover llamadas explícitas a wait() ---
                    # Confiamos en que si la ventana fue encontrada, está visible y lista para foco
                    devtools_window.set_focus() # ¡Darle foco!
                    print("✅ Foco dado a la ventana de Developer Tools.")
                    time.sleep(1) # Pequeña pausa estática después de dar foco
                    return devtools_window # Devolvemos la ventana encontrada
                except Exception as e_focus:
                    print(f"⚠️ Encontrada pero error al dar foco: {e_focus}")
                    devtools_window = None # Considerarla no encontrada si no se puede dar foco
        except MatchError:
            pass
        except Exception as e:
            print(f"⚠️ Error inesperado durante la búsqueda: {e}")
            pass

        if not devtools_window:
            print(".", end="", flush=True)
            time.sleep(0.5)

    print("\n❌ No se encontró la ventana de Developer Tools tras la espera.")
    return None


def open_and_execute_devtools_script(main_window, script_path):
    """Abre las herramientas de desarrollo, les da foco, abre la consola y ejecuta un script."""
    print("--- Iniciando secuencia de Developer Tools ---")
    devtools_window = None

    try:
        print("En ventana principal: Abriendo paleta de comandos (Ctrl+Shift+P)...")
        send_keys_safely(main_window, "^+p")
        time.sleep(wait_time)

        devtools_command = "Developer: Toggle Developer Tools"
        print(f"En ventana principal: Escribiendo '{devtools_command}'...")
        send_keys_safely(main_window, devtools_command, with_spaces=True)
        time.sleep(wait_time)

        print("En ventana principal: Pulsando Enter para abrir DevTools...")
        send_keys_safely(main_window, "{ENTER}")
        time.sleep(wait_time)

        print("Esperando y enfocando la ventana de DevTools...")
        devtools_window = focus_devtools_window(timeout=long_wait_time)
        if not devtools_window:
            print("❌ No se pudo encontrar o enfocar la ventana de Developer Tools.")
            return False

        print("✅ Ventana de Developer Tools enfocada.")

        print("En ventana DevTools: Abriendo paleta de comandos (Ctrl+Shift+P)...")
        send_keys_safely(devtools_window, "^+p")
        time.sleep(1)
        print("En ventana DevTools: Escribiendo 'Show Console Panel'...")
        console_command = "Show Console Panel"
        send_keys_safely(devtools_window, console_command, with_spaces=True)
        time.sleep(1)
        send_keys_safely(devtools_window, "{ENTER}")
        time.sleep(1)

        devtools_script_content = ""
        try:
            with open(script_path, 'r', encoding='utf-8') as file:
                devtools_script_content = file.read()
            print(f"Script de DevTools leído correctamente: {script_path}")
        except Exception as e:
            print(f"❌ Error al leer el script de DevTools: {e}")
            return False

        original_clipboard = ""
        try:
            original_clipboard = pyperclip.paste()
        except pyperclip.PyperclipException as e:
            print(f"Advertencia al obtener portapapeles original: {e}")

        pyperclip.copy(devtools_script_content)
        print("Script copiado al portapapeles.")
        time.sleep(0.5)

        print("En ventana DevTools: Pegando script en la consola...")
        send_keys_safely(devtools_window, "^v")
        time.sleep(1)

        print("En ventana DevTools: Ejecutando script...")
        send_keys_safely(devtools_window, "{ENTER}")
        time.sleep(wait_time)

        try:
            pyperclip.copy(original_clipboard)
            print("Portapapeles restaurado.")
        except pyperclip.PyperclipException as e:
            print(f"Advertencia al restaurar portapapeles: {e}")

        print("En ventana DevTools: Cerrando ventana (Ctrl+W)...")
        send_keys_safely(devtools_window, "^w")
        time.sleep(wait_time)

        print("Volviendo a la ventana principal de VS Code...")
        main_window.set_focus()
        time.sleep(1)

        print("--- Secuencia de Developer Tools completada ---")
        return True

    except Exception as e:
        print(f"❌ Error durante la secuencia de Developer Tools: {e}")
        traceback.print_exc()
        if devtools_window:
            try:
                print("Intentando cerrar ventana de DevTools tras error...")
                devtools_window.set_focus()
                time.sleep(0.5)
                send_keys(devtools_window, "^w")
                time.sleep(1)
            except:
                pass
        if main_window:
            try:
                main_window.set_focus()
                time.sleep(1)
            except:
                pass
        return False


def automate_vscode():
    """Automatiza tareas en VS Code."""
    process = None
    main_window = None
    try:
        print("Iniciando Visual Studio Code...")
        vscode_path = r"C:\Users\xabia\AppData\Local\Programs\Microsoft VS Code\Code.exe"
        process = subprocess.Popen([vscode_path, "--new-window"])
        vscode_main_pid = process.pid
        print(f"VS Code iniciado con PID: {vscode_main_pid}")

        main_window = find_vscode_window(vscode_main_pid, timeout=long_wait_time)

        if not main_window:
            print("Error fatal: No se pudo encontrar la ventana principal de VS Code después de esperar.")
            return

        setup_window(main_window)

        print("\n--- Ejecutando secuencia de Developer Tools ---")
        devtools_success = open_and_execute_devtools_script(main_window, devtools_script_path)

        if not devtools_success:
            print("Advertencia: La secuencia de Developer Tools no se completó con éxito. Continuando con el chat si es posible...")
            # Intentar asegurar foco en la ventana principal aunque la secuencia de DevTools fallara
        if main_window and main_window.exists():
            main_window.set_focus()
            time.sleep(1)
        else:
            print("Error: La ventana principal de VS Code no está disponible después del fallo en DevTools.")
            return

        print("\n--- Continuando con la interacción del Chat ---")

        print("Abriendo paleta de comandos...")
        send_keys_safely(main_window, "^+p")
        time.sleep(wait_time)

        print("Escribiendo #cypress-realworld-app...")
        send_keys_safely(main_window, "#cypress-realworld-app ", with_spaces=True)
        time.sleep(wait_time)

        print("Enviando contenido del prompt al chat...")
        send_text_to_editor(main_window, auth1_spec_content)

        print("Pulsando Enter para enviar el mensaje...")
        timestamp_envio = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        print(f"Timestamp de envío (Enter presionado): {timestamp_envio}")
        send_keys_safely(main_window, "{ENTER}")
        time.sleep(wait_time)

        print(f"Esperando {long_wait_time} segundos para que se genere la respuesta...")
        time.sleep(long_wait_time)

        # print("Guardando el contenido usando /save...")
        # save_content(main_window)

        output_filename = save_response_to_file(main_window)

        add_timestamp_entry(timestamp_envio, output_filename)

        print("Cerrando la ventana/panel actual (Ctrl+W)...")
        send_keys_safely(main_window, "^w")
        time.sleep(wait_time)

        print("Verificando y cerrando el diálogo de guardar si aparece...")
        if cerrar_dialogo_guardar_vscode():
            print("Diálogo de guardar cerrado con éxito.")
        else:
            print("No apareció el diálogo de guardar o no se pudo cerrar automáticamente.")

        # clear_chat(main_window) # Comentado

        save_timestamps_to_json()

        print("Automatización completada con éxito.")

    except Exception as e:
        print(f"Ocurrió un error durante la automatización: {e}")
        traceback.print_exc()

        if timestamps_data:
            save_timestamps_to_json()

    finally:
        print("Fin del script.")


if __name__ == "__main__":
    automate_vscode()