import time
import psutil
import traceback
import os
import json
import re
from pywinauto.application import Application
from pywinauto import Desktop, mouse
from pywinauto.keyboard import send_keys
import pyperclip
from datetime import datetime
from pywinauto.findbestmatch import MatchError
from pywinauto.findwindows import ElementNotFoundError
import argparse
import glob

# --- Configuración ---
# Ruta al archivo de prompt individual (se usará como fallback si no hay carpeta)
prompt_file_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\30_04_25-15_05_25\preparePrompts\prompts\auth1.spec.txt"
# Ruta a la carpeta que contiene múltiples archivos de prompt
prompt_folder_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\30_04_25-15_05_25\preparePrompts\prompts"
# Ruta al workspace de VSCode
workspace_folder_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\01_04_25-15_04_25\Hustuta"
# Ruta al archivo del script para DevTools
devtools_script_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\VsCode\pywinauto\copilotTimer2.js"

# --- LLM Names and Output Directory Setup ---
LLM_NAMES = [
    "claude_3_5_sonnet", "claude_3_7_sonnet", "claude_3_7_sonnet_thinking","claude_sonnet_4", "gemini_2_0_flash", "gemini_2_5_pro_preview", 
    "GPT_4_1", "GPT_4o", "o1_preview", "o3_mini", "o4_mini_preview"
]

def get_llm_name(index):
    try:
        return LLM_NAMES[index]
    except (IndexError, ValueError):
        return f"llm{index}"

# Parse argument for LLM index
parser = argparse.ArgumentParser(description="Automatiza VSCode y guarda resultados con sufijo de LLM.")
parser.add_argument("llm_index", type=int, choices=range(0, 10), help="Índice del LLM a usar (0-9)")
args = parser.parse_args()
llm_index = args.llm_index
llm_name = get_llm_name(llm_index)

# Output folder setup
current_date = datetime.now().strftime("%Y%m%d")
output_folder = f"output_{llm_name}"
os.makedirs(output_folder, exist_ok=True)

# --- Variables para contar archivos ---
current_file_index = 0
total_files_count = 1

# --- Función para mostrar logs con formato de contador de archivos ---
def log_with_counter(message):
    """Muestra un mensaje de log con el formato [actual_file_number/number_of_total_files]."""
    if current_file_index > 0 and total_files_count > 0:
        print(f"[{current_file_index}/{total_files_count}] {message}")
    else:
        print(message)

# Variable global para almacenar los timestamps y nombres de archivos
timestamps_data = []

# Función para agregar datos de timestamp y archivo
def add_timestamp_entry(timestamp, output_file, source_file=None):
    """Agrega una entrada al registro de timestamps."""
    entry = {
        "timestamp": timestamp,
        "output_file": output_file
    }
    
    # Añadir el archivo fuente si está disponible
    if source_file:
        entry["source_file"] = source_file
        
    timestamps_data.append(entry)

# Función para guardar los timestamps a un archivo JSON
def save_timestamps_to_json(json_file_path=None):
    """Guarda los timestamps registrados en un archivo JSON en la carpeta de salida."""
    if json_file_path is None:
        json_file_path = os.path.join(output_folder, f"timestamps_{llm_name}_{current_date}.json")
    try:
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(timestamps_data, f, indent=4)
        log_with_counter(f"Timestamps guardados en: {json_file_path}")
    except Exception as e:
        log_with_counter(f"Error al guardar los timestamps: {e}")

# Función para leer el contenido del archivo
def read_prompt_file(file_path):
    """Lee el contenido de un archivo y lo devuelve como una cadena."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        log_with_counter(f"Archivo de prompt leído correctamente: {file_path}")
        return content
    except Exception as e:
        log_with_counter(f"Error al leer el archivo de prompt: {e}")
        return """Error: No se pudo leer el archivo de prompt."""

# Leer el contenido del archivo de prompt al inicio del script
auth1_spec_content = read_prompt_file(prompt_file_path)

# Tiempos de espera
wait_time = 2  # Tiempo de espera normal (segundos)
long_wait_time = 120 # Tiempo de espera largo (1 minuto y 30 segundos)

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

        log_with_counter(f"Enviando teclas a '{window.window_text() or window.class_name()}': {keys_to_send}")
        send_keys(keys_to_send, with_spaces=with_spaces, pause=pause)
        return True
    except Exception as e: # <-- Bloque except añadido de nuevo
        log_with_counter(f"Error al enviar teclas a '{window.window_text() or window.class_name()}': {e}")
        return False


def find_vscode_window(main_pid, timeout=30):
    """Busca y conecta con la ventana principal de VS Code usando diferentes estrategias."""
    log_with_counter(f"🔎 Buscando ventana principal de VS Code durante {timeout} segundos...")
    end_time = time.time() + timeout

    while time.time() < end_time:
        # Estrategia 1: Conectar por PID (más directo si funciona)
        try:
            app = Application(backend="uia").connect(process=main_pid, timeout=1) # Timeout corto para la conexión
            main_window = app.top_window()
            if (main_window.window_text() and main_window.class_name() != "#32770"):
                log_with_counter(f"✅ Ventana principal encontrada por PID: '{main_window.window_text()}'")
                try:
                    main_window.wait('ready', timeout=5)
                    log_with_counter("Ventana principal está lista.")
                except Exception as e_wait:
                    log_with_counter(f"Advertencia: Ventana principal encontrada pero no lista a tiempo: {e_wait}")
                return main_window
            else:
                pass # No imprimir error si solo no parece principal
        except Exception as e:
            pass # Ignorar errores de conexión y seguir intentando        # Estrategia 2: Conectar por título (busca ventanas existentes)
        try:
            app = Application(backend="uia").connect(title_re=r".*Visual Studio Code.*", timeout=1, class_name_re="^!#32770$")
            main_window = app.top_window()
            if (main_window.window_text() and main_window.class_name() != "#32770"):
                log_with_counter(f"✅ Ventana principal encontrada por título regex: '{main_window.window_text()}'")
                try:
                    main_window.wait('ready', timeout=5)
                    log_with_counter("Ventana principal está lista.")
                except Exception as e_wait:
                    log_with_counter(f"Advertencia: Ventana principal encontrada pero no lista a tiempo: {e_wait}")
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
                        if (main_window.window_text() and main_window.class_name() != "#32770"):
                            log_with_counter(f"✅ Ventana principal encontrada por proceso 'Code.exe' (PID: {proc.info['pid']}): '{main_window.window_text()}'")
                            try:
                                main_window.wait('ready', timeout=5)
                                log_with_counter("Ventana principal está lista.")
                            except Exception as e_wait:
                                log_with_counter(f"Advertencia: Ventana principal encontrada pero no lista a tiempo: {e_wait}")
                            return main_window
                        else:
                            pass
                    except Exception:
                        pass
        except Exception:
            pass

        print(".", end="", flush=True)
        time.sleep(1)

    log_with_counter("\n❌ No se pudo conectar con la ventana principal de VS Code tras varios intentos.")
    return None


def setup_window(window):
    """Configura la ventana para la interacción (foco, maximizar)."""
    log_with_counter(f"Configurando ventana '{window.window_text() or window.class_name()}'...")
    try:
        if not window.is_visible():
            log_with_counter("Advertencia: Ventana no visible, intentando mostrar...")
            try:
                window.show()
                time.sleep(0.5)
            except Exception as e:
                log_with_counter(f"No se pudo mostrar la ventana: {e}")

        if window.is_minimized():
            log_with_counter("Ventana minimizada, restaurando...")
            try:
                window.restore()
                time.sleep(0.5)
            except Exception as e:
                log_with_counter(f"No se pudo restaurar la ventana: {e}")

        log_with_counter("Poniendo ventana en primer plano y enfocando...")
        try:
            window.set_foreground()
            time.sleep(0.2)  # Slightly longer pause for foreground
            window.wait_for_idle(timeout=5) # Wait for the application to be ready for input
            window.set_focus()
            time.sleep(0.2)  # Pause after focus
            if not window.is_active():
                log_with_counter("Advertencia: La ventana no está activa después del primer set_focus(). Intentando de nuevo...")
                window.set_foreground()  # Re-attempt bringing to foreground
                time.sleep(0.2)
                window.wait_for_idle(timeout=3) # Shorter timeout for retry
                window.set_focus()
                time.sleep(0.1) # Brief pause
                if not window.is_active():
                    log_with_counter("ERROR CRÍTICO: La ventana sigue sin estar activa después de múltiples intentos de enfoque.")
                else:
                    log_with_counter("✅ Ventana activada en el segundo intento.")
            else:
                log_with_counter("✅ Ventana principal activa después del primer intento de enfoque.")
        except Exception as e_focus_fg:
            log_with_counter(f"⚠️ Error durante la secuencia de set_foreground/wait_for_idle/set_focus: {e_focus_fg}")
            # import traceback; traceback.print_exc() # Consider uncommenting for debugging

        time.sleep(0.5) # General pause for UI to settle after focus operations

        try:
            if not window.is_maximized():
                window.maximize()
                log_with_counter("Ventana maximizada.")
                time.sleep(0.5)
        except Exception as e:
            log_with_counter(f"No se pudo maximizar la ventana o ya estaba maximizada: {e}")

        try:
            window.wait('ready', timeout=5)
            log_with_counter("Ventana está lista para interacción.")
        except Exception as e:
            log_with_counter(f"Advertencia: Ventana puede no estar completamente lista: {e}")

        log_with_counter("Ventana configurada.")
    except Exception as e:
        log_with_counter(f"Error al configurar la ventana: {e}")
        traceback.print_exc()


def send_text_to_editor(window, text):
    """Envía texto al editor usando el portapapeles."""
    original_clipboard = ""
    try:
        original_clipboard = pyperclip.paste()
    except pyperclip.PyperclipException as e:
        log_with_counter(f"Advertencia al obtener el contenido del portapapeles: {e}")
        original_clipboard = ""

    try:
        log_with_counter(f"Usando portapapeles para enviar texto a '{window.window_text() or window.class_name()}'...")
        pyperclip.copy(text)
        send_keys_safely(window, "^v")
        time.sleep(1)
        log_with_counter("Texto enviado vía portapapeles.")

    except Exception as e:
        log_with_counter(f"Error usando portapapeles: {e}. Intentando método alternativo (send_keys)...")
        lines = text.strip().split('\n')
        for i, line in enumerate(lines):
            log_with_counter(f"Escribiendo línea {i+1}/{len(lines)}...")
            escaped_line = line.replace('{', '{{}').replace('}', '{}}').replace('+', '{{+}}').replace('^', '{{^}}').replace('%', '{{%}}').replace('~', '{{}}').replace('(', '{{(}}').replace(')', '{{)}}')
            send_keys_safely(window, escaped_line, with_spaces=True, pause=0.01)
            send_keys_safely(window, "{ENTER}")
            time.sleep(0.05)
        log_with_counter("Texto enviado línea por línea.")
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
    log_with_counter("Intentando guardar contenido con /save...")
    send_keys_safely(window, "/save", with_spaces=True)
    time.sleep(0.5)
    send_keys_safely(window, "{ENTER}")
    log_with_counter("Comando /save enviado.")
    time.sleep(wait_time)

def save_response_to_file(window):
    """Selecciona, copia y guarda el contenido a un archivo local en la carpeta de salida."""
    print("Guardando respuesta a archivo local...")
    
    # Verificar si hay diálogos abiertos y cerrarlos antes de continuar
    if cerrar_dialogo_guardar_vscode():
        print("Se cerró un diálogo de guardar antes de intentar copiar.")
        time.sleep(1)  # Esperar a que el diálogo se cierre completamente
    
    # Asegurar el foco en la ventana principal y el área de chat
    try:
        window.set_focus()
        time.sleep(1)
        
        # Intentar encontrar y hacer clic en el área de chat
        chat_selectors = [
            {"automation_id": "chatEditor"},
            {"name": "Chat", "control_type": "Edit"},
            {"class_name": "ChatBox"},
            {"title_re": ".*Chat.*", "control_type": "Edit"}
        ]
        
        chat_found = False
        for selector in chat_selectors:
            try:
                chat_control = window.child_window(**selector)
                if chat_control.exists():
                    print(f"Área de chat encontrada con selector: {selector}")
                    chat_control.click_input()
                    time.sleep(1)
                    chat_found = True
                    break
            except Exception as e:
                print(f"No se pudo seleccionar con {selector}: {e}")
        
        if not chat_found:
            print("No se encontró el área de chat específica. Intentando click general en la ventana.")
            window.click_input(coords=(400, 400))  # Click en el centro aproximado
            time.sleep(1)
    except Exception as e:
        print(f"Error al enfocar el área de chat: {e}")
    
    # Intentar seleccionar todo el contenido
    try:
        print("Seleccionando todo el contenido (Ctrl+A)...")
        send_keys_safely(window, "^a")
        time.sleep(1.5)
    except Exception as e:
        print(f"Error al seleccionar contenido: {e}")
    
    # Copiar al portapapeles
    try:
        # Limpiar el portapapeles antes de copiar
        pyperclip.copy("")
        time.sleep(0.5)
        
        print("Copiando selección al portapapeles (Ctrl+C)...")
        send_keys_safely(window, "^c")
        time.sleep(2)  # Tiempo extra para el copiado
    except Exception as e:
        print(f"Error al copiar: {e}")
    
    # Verificar el contenido del portapapeles
    contenido = pyperclip.paste()
    if "[Window Title]" in contenido and "Do you want to save" in contenido:
        print("ADVERTENCIA: Se ha copiado un diálogo en lugar del contenido del chat.")
        try:
            # Intentar cerrar el diálogo nuevamente
            if cerrar_dialogo_guardar_vscode():
                print("Diálogo cerrado. Intentando copiar nuevamente...")
                window.set_focus()
                time.sleep(1)
                send_keys_safely(window, "^a")
                time.sleep(1)
                send_keys_safely(window, "^c")
                time.sleep(2)
                contenido = pyperclip.paste()
                if "[Window Title]" in contenido:
                    print("ERROR: Sigue capturando el diálogo. Contenido no válido.")
        except Exception as e:
            print(f"Error al intentar recuperarse del diálogo: {e}")
    
    # Guardar contenido a archivo
    archivo_salida = ""
    try:
        print(f"Copiados {len(contenido)} caracteres del portapapeles.")
        
        if not contenido.strip():
            print("Advertencia: El portapapeles está vacío. No se guardará nada.")
            return os.path.join(output_folder, f"empty_content_{llm_name}.txt")
        
        original_filename = os.path.basename(prompt_file_path)
        filename_without_ext, ext = os.path.splitext(original_filename)
        timestamp_archivo = datetime.now().strftime("%Y%m%d_%H%M%S")
        archivo_salida = os.path.join(output_folder, f"{filename_without_ext}_response_{llm_name}_{timestamp_archivo}{ext}")
        
        with open(archivo_salida, "w", encoding="utf-8") as f:
            f.write(contenido)
        print(f"Contenido guardado en: {archivo_salida}")
    except Exception as e:
        print(f"Error guardando el contenido: {e}")
        traceback.print_exc()
        timestamp_error = datetime.now().strftime("%Y%m%d_%H%M%S")
        archivo_salida = os.path.join(output_folder, f"error_guardado_response_{llm_name}_{timestamp_error}.txt")
        
        try:
            with open(archivo_salida, "w", encoding="utf-8") as f:
                f.write(f"Error during save_response_to_file: {e}\n\n")
                f.write("Content attempted to save:\n")
                f.write(contenido)
            print(f"Error registrado en: {archivo_salida}")
        except Exception as e2:
            print(f"Fallo catastrófico en el guardado alternativo: {e2}")
            archivo_salida = os.path.join(output_folder, f"fatal_error_no_guardado_{llm_name}.txt")
    
    return archivo_salida

def cerrar_dialogo_guardar_vscode(timeout=15):
    """
    Cierra el diálogo de guardar cambios de VSCode si aparece,
    usando una combinación de métodos win32 y UIA con múltiples estrategias
    de focalización y click.
    """
    log_with_counter(f"🔎 Buscando diálogo de guardar de VSCode durante hasta {timeout} segundos...")
    end_time = time.time() + timeout
    dialog = None

    # Intentar primero con win32 (como en vscode_chat_automation5.py)
    while time.time() < end_time and not dialog:
        try:
            windows = Desktop(backend="win32").windows(class_name="#32770")
            for win in windows:
                title = win.window_text().strip()
                if title == "Visual Studio Code":
                    dialog = win
                    log_with_counter(f"✅ Diálogo potencial encontrado por título '{title}' (win32).")
                    break
        except Exception as e:
            log_with_counter(f"⚠️ Error buscando con win32: {e}")
            pass
              # Si no encontramos con win32, intentar con UIA
        if not dialog:
            try:
                dialogs = Desktop(backend="uia").windows(
                    class_name="#32770",
                    title_re=".*Visual Studio Code.*",
                    top_level_only=True
                )
                for win in dialogs:
                    try:
                        if win.child_window(title_re=".*(Don't Save|No guardar).*", control_type="Button").exists(timeout=0.1):
                            dialog = win
                            log_with_counter(f"✅ Diálogo potencial encontrado: '{dialog.window_text()}' (UIA).")
                            break
                    except Exception:
                        continue
            except Exception:
                pass
        
        if not dialog:
            print(".", end="", flush=True)
            time.sleep(0.5)

    if not dialog:
        log_with_counter("\n❌ No se detectó el diálogo de guardar de VS Code.")
        return False

    log_with_counter(f"\n✅ Diálogo detectado: '{dialog.window_text()}'")
    dialog_closed = False
      # ESTRATEGIA 1: Click en el centro del diálogo para asegurar el foco
    try:
        log_with_counter("Haciendo click en el centro del diálogo para asegurar el foco...")
        rect = dialog.rectangle()
        center_x = rect.left + rect.width() // 2
        center_y = rect.top + rect.height() // 2
        mouse.click(coords=(center_x, center_y))
        time.sleep(0.5)
    except Exception as e:
        log_with_counter(f"⚠️ Error al hacer click en el centro: {e}")

    try:
        dialog.set_focus()
        time.sleep(0.5)  # Pausa más larga para asegurar el foco
    except Exception as e:
        log_with_counter(f"⚠️ Error al enfocar el diálogo: {e}")

    # ESTRATEGIA 2: Usar {RIGHT}{ENTER} (método de vscode_chat_automation5.py)
    log_with_counter("Intentando cerrar con teclas {RIGHT}{ENTER}...")
    try:
        send_keys("{RIGHT}{ENTER}", pause=0.2)  # Usar send_keys global
        time.sleep(1.5)
        try:
            if not dialog.exists(timeout=0.2):
                log_with_counter("✅ Diálogo cerrado después de {RIGHT}{ENTER}.")
                dialog_closed = True
        except:
            # Si falla el exists, puede que se haya cerrado
            log_with_counter("✅ Posible cierre después de {RIGHT}{ENTER} (error al verificar).")
            dialog_closed = True
    except Exception as e:
        log_with_counter(f"⚠️ '{{RIGHT}}{{ENTER}}' falló: {e}")    # ESTRATEGIA 3: Usar Alt+N (para "No guardar" / "Don't Save")
    if not dialog_closed:
        log_with_counter("Intentando cerrar con Alt+N...")
        try:
            send_keys("%n", pause=0.2)  # Alt+N
            time.sleep(1.5)
            try:
                if not dialog.exists(timeout=0.2):
                    log_with_counter("✅ Diálogo cerrado después de Alt+N.")
                    dialog_closed = True
            except:
                log_with_counter("✅ Posible cierre después de Alt+N (error al verificar).")
                dialog_closed = True
        except Exception as e:
            log_with_counter(f"⚠️ Alt+N falló: {e}")

    # ESTRATEGIA 4: Buscar y hacer click en el botón "Don't Save"/"No guardar"
    if not dialog_closed:
        log_with_counter("Buscando botón 'Don't Save'/'No guardar'...")
        try:
            buttons = []
            try:
                # Intentar obtener botones con win32
                buttons = dialog.descendants(control_type="Button")
            except:
                try:
                    # Si falla, intentar con UIA children
                    buttons = dialog.children(control_type="Button")
                except:
                    log_with_counter("⚠️ No se pudieron obtener botones del diálogo.")            
            target_button = None
            for btn in buttons:
                try:
                    btn_text = btn.window_text()
                    if re.search(r"Don't Save", btn_text, re.IGNORECASE) or \
                       re.search(r"No guardar", btn_text, re.IGNORECASE):
                        target_button = btn
                        log_with_counter(f"✅ Botón encontrado: '{btn_text}'")
                        break
                except:
                    continue
            
            if target_button:
                log_with_counter(f"Intentando click en botón: '{target_button.window_text()}'")
                try:
                    target_button.click()
                    time.sleep(1.5)
                    dialog_closed = True
                except:
                    try:
                        target_button.click_input()
                        time.sleep(1.5)
                        dialog_closed = True
                    except:
                        log_with_counter("⚠️ Fallo en click y click_input.")
        except Exception as e:
            log_with_counter(f"⚠️ Error buscando botones: {e}")    # ESTRATEGIA 5: Click en coordenadas conocidas para "Don't Save" (último recurso)
    if not dialog_closed:
        log_with_counter("Último recurso: Click en coordenadas para 'Don't Save'...")
        try:
            rect = dialog.rectangle()
            # Probar varias posiciones comunes para "Don't Save"
            positions = [
                (rect.left + rect.width() * 0.7, rect.top + rect.height() * 0.7),  # Abajo-derecha
                (rect.left + 250, rect.top + 100),  # Posición fija de vscode_chat_automation5.py
                (rect.left + rect.width() * 0.7, rect.top + rect.height() * 0.5),  # Centro-derecha
            ]
            
            for i, (x, y) in enumerate(positions):
                log_with_counter(f"Intento #{i+1}: Click en ({int(x)}, {int(y)})")
                mouse.click(coords=(int(x), int(y)))
                time.sleep(1.5)
                try:
                    if not dialog.exists(timeout=0.2):
                        log_with_counter(f"✅ Diálogo cerrado después de click en posición #{i+1}.")
                        dialog_closed = True
                        break
                except:
                    log_with_counter(f"✅ Posible cierre después de click en posición #{i+1} (error al verificar).")
                    dialog_closed = True
                    break
        except Exception as e:
            log_with_counter(f"❌ Click en coordenadas falló: {e}")    # Si se cerró el diálogo, hacer clic en el centro de la ventana principal de VS Code para recuperar el foco
    if dialog_closed:
        log_with_counter("Diálogo cerrado. Haciendo clic en el centro de la ventana principal para recuperar el foco...")
        try:
            # Buscar la ventana principal de VS Code
            vscode_windows = Desktop(backend="uia").windows(title_re=".*Visual Studio Code.*")
            main_window = None
            
            # Filtrar ventanas de diálogo y encontrar la ventana principal
            for win in vscode_windows:
                if win.class_name() != "#32770" and "Visual Studio Code" in win.window_text():
                    main_window = win
                    break
            
            if main_window:
                # Hacer clic en el centro de la ventana principal
                rect = main_window.rectangle()
                center_x = rect.left + rect.width() // 2
                center_y = rect.top + rect.height() // 2
                
                log_with_counter(f"Haciendo clic en el centro de VS Code: ({center_x}, {center_y})")
                mouse.click(coords=(center_x, center_y))
                time.sleep(1.0)  # Aumentar pausa después del clic
                
                # Intentar dar foco explícitamente también
                try:
                    main_window.set_focus()
                    time.sleep(1.0)  # Aumentar pausa después de set_focus
                except Exception as e:
                    print(f"Advertencia al dar foco a la ventana principal: {e}")
                
                # Enfocar la ventana de Copilot Chat mediante método alternativo
                # En lugar de Ctrl+Shift+I, que puede causar problemas con Ctrl+.
                print("Enfocando la ventana de Copilot Chat mediante método alternativo...")
                try:
                    # Método 1: Buscar y hacer clic directamente en el panel de chat
                    chat_selectors = [
                        {"title_re": ".*Copilot Chat.*", "control_type": "Document"},
                        {"title_re": ".*Chat.*", "control_type": "Document"},
                        {"automation_id": "chatEditor"}
                    ]
                    
                    chat_found = False
                    for selector in chat_selectors:
                        try:
                            chat_area = main_window.child_window(**selector)
                            if chat_area.exists():
                                print(f"✅ Panel de Copilot Chat encontrado con selector: {selector}")
                                chat_area.click_input()
                                time.sleep(1.0)
                                chat_found = True
                                break
                        except Exception as e_find:
                            pass
                    
                    # Si no se encontró el panel directamente, intentar método alternativo
                    if not chat_found:
                        print("No se encontró panel de chat directamente. Usando método de teclado seguro...")
                        # Método 2: Usar teclas por separado con pausas entre ellas para evitar combinaciones accidentales
                        send_keys("{CTRL down}")  # Presionar Ctrl
                        time.sleep(0.3)
                        send_keys("%{DOWN}")  # Presionar Alt (cambiado de SHIFT)
                        time.sleep(0.3)
                        send_keys("n")  # Presionar n (cambiado de i)
                        time.sleep(0.3)
                        send_keys("%{UP}")  # Soltar Alt (cambiado de SHIFT)
                        time.sleep(0.3)
                        send_keys("{CTRL up}")  # Soltar Ctrl
                        time.sleep(1.0)
                        print("Teclas Ctrl+Alt+N enviadas individualmente para enfocar el chat")
                        
                        # Añadir Ctrl+. después de Ctrl+Alt+N para mejorar el enfoque del chat
                        print("Enviando Ctrl+. para enfocar completamente el chat...")
                        time.sleep(0.5)  # Pausa antes de enviar nueva combinación
                        send_keys("{CTRL down}")  # Presionar Ctrl
                        time.sleep(0.3)
                        send_keys(".")  # Presionar punto
                        time.sleep(0.3)
                        send_keys("{CTRL up}")  # Soltar Ctrl
                        time.sleep(1.0)
                        print("Teclas Ctrl+. enviadas para completar el enfoque del chat")
                except Exception as e:
                    print(f"Error al intentar enfocar la ventana de chat: {e}")
            else:
                print("No se encontró la ventana principal de VS Code para hacer clic en el centro")
        except Exception as e:            log_with_counter(f"Error al intentar hacer clic en el centro de la ventana principal: {e}")
            
    if not dialog_closed:
        log_with_counter("❌ Todos los métodos para cerrar el diálogo fallaron.")
    
    return dialog_closed

def medir_tiempo_respuesta_enviar(main_window):
    """
    Mide el tiempo que tarda el botón de enviar en volver a estar disponible.
    Asume que el botón se deshabilita durante el procesamiento.
    """
    log_with_counter("⌛ Midiendo tiempo de respuesta del botón de enviar...")

    try:
        send_button = None
        possible_send_buttons = [
            {"title": "Send", "control_type": "Button"},
            {"title": "Enviar", "control_type": "Button"},
            {"auto_id_re": ".*send.*button.*", "control_type": "Button"},
            {"class_name_re": ".*SendButton.*", "control_type": "Button"},
        ]

        log_with_counter("Buscando botón de enviar...")
        for criteria in possible_send_buttons:
            try:
                found_control = main_window.child_window(**criteria).wait('visible', timeout=5)
                send_button = found_control
                log_with_counter(f"✅ Botón de enviar encontrado: '{send_button.window_text() or send_button.class_name()}'")
                break
            except MatchError:
                pass
            except Exception as e:
                log_with_counter(f"Error al buscar botón con criterios {criteria}: {e}")
                pass

        if not send_button:
            log_with_counter("❌ No se encontró el botón de enviar.")
            return

        log_with_counter(f"Esperando a que el botón '{send_button.window_text() or send_button.class_name()}' esté habilitado...")
        if not send_button.wait('enabled', timeout=long_wait_time):
            log_with_counter(f"❌ El botón de enviar no se habilitó a tiempo ({long_wait_time}s).")
            return
        log_with_counter("Botón de enviar está habilitado.")

    except Exception as e:
        log_with_counter(f"❌ Error al medir tiempo de respuesta: {e}")
        traceback.print_exc()


def clear_chat(window):
    """Limpia el chat usando el comando /clear."""
    log_with_counter("Limpiando el chat...")
    try:
        send_keys_safely(window, "^+p")
        time.sleep(wait_time)
        send_keys_safely(window, ">", with_spaces=True)
        time.sleep(0.5)

        log_with_counter("Escribiendo /clear...")
        send_keys_safely(window, "/clear", with_spaces=True)
        time.sleep(0.5)

        send_keys_safely(window, "{ENTER}")
        log_with_counter("Comando /clear enviado.")
        time.sleep(wait_time)
    except Exception as e:
        log_with_counter(f"Error al intentar limpiar el chat: {e}")
        traceback.print_exc()

def focus_devtools_window(timeout=15):
    """Busca la ventana de Developer Tools y le da foco."""
    log_with_counter(f"🔎 Buscando ventana de Developer Tools durante hasta {timeout} segundos...")

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
                log_with_counter(f"✅ Ventana de Developer Tools encontrada: '{devtools_window.window_text() or devtools_window.class_name()}'")
                log_with_counter(f"Tipo del objeto encontrado: {type(devtools_window)}") # Debug: imprimir tipo

                try:
                    # --- MODIFICACIÓN: Remover llamadas explícitas a wait() ---
                    # Confiamos en que si la ventana fue encontrada, está visible y lista para foco
                    devtools_window.set_focus() # ¡Darle foco!
                    log_with_counter("✅ Foco dado a la ventana de Developer Tools.")
                    time.sleep(1) # Pequeña pausa estática después de dar foco
                    return devtools_window # Devolvemos la ventana encontrada
                except Exception as e_focus:
                    log_with_counter(f"⚠️ Encontrada pero error al dar foco: {e_focus}")
                    devtools_window = None # Considerarla no encontrada si no se puede dar foco
        except MatchError:
            pass
        except Exception as e:
            log_with_counter(f"⚠️ Error inesperado durante la búsqueda: {e}")
            pass

        if not devtools_window:
            print(".", end="", flush=True)
            time.sleep(0.5)

    log_with_counter("\n❌ No se encontró la ventana de Developer Tools tras la espera.")
    return None


def open_and_execute_devtools_script(main_window, script_path):
    """Abre las herramientas de desarrollo, les da foco, abre la consola y ejecuta un script."""
    log_with_counter("--- Iniciando secuencia de Developer Tools ---")
    devtools_window = None

    try:
        log_with_counter("En ventana principal: Abriendo paleta de comandos (Ctrl+Shift+P)...")
        send_keys_safely(main_window, "^+p")
        time.sleep(wait_time)

        devtools_command = "Developer: Toggle Developer Tools"
        log_with_counter(f"En ventana principal: Escribiendo '{devtools_command}'...")
        send_keys_safely(main_window, devtools_command, with_spaces=True)
        time.sleep(wait_time)

        log_with_counter("En ventana principal: Pulsando Enter para abrir DevTools...")
        send_keys_safely(main_window, "{ENTER}")
        time.sleep(wait_time)

        log_with_counter("Esperando y enfocando la ventana de DevTools...")
        devtools_window = focus_devtools_window(timeout=long_wait_time)
        if not devtools_window:
            log_with_counter("❌ No se pudo encontrar o enfocar la ventana de Developer Tools.")
            return False

        log_with_counter("✅ Ventana de Developer Tools enfocada.")

        log_with_counter("En ventana DevTools: Abriendo paleta de comandos (Ctrl+Shift+P)...")
        send_keys_safely(devtools_window, "^+p")
        time.sleep(1)
        log_with_counter("En ventana DevTools: Escribiendo 'Show Console Panel'...")
        console_command = "Show Console Panel"
        send_keys_safely(devtools_window, console_command, with_spaces=True)
        time.sleep(1)
        send_keys_safely(devtools_window, "{ENTER}")
        time.sleep(1)

        devtools_script_content = ""
        try:
            with open(script_path, 'r', encoding='utf-8') as file:
                devtools_script_content = file.read()
            log_with_counter(f"Script de DevTools leído correctamente: {script_path}")
        except Exception as e:
            log_with_counter(f"❌ Error al leer el script de DevTools: {e}")
            return False

        original_clipboard = ""
        try:
            original_clipboard = pyperclip.paste()
        except pyperclip.PyperclipException as e:
            log_with_counter(f"Advertencia al obtener portapapeles original: {e}")

        pyperclip.copy(devtools_script_content)
        log_with_counter("Script copiado al portapapeles.")
        time.sleep(0.5)

        log_with_counter("En ventana DevTools: Pegando script en la consola...")
        send_keys_safely(devtools_window, "^v")
        time.sleep(1)

        log_with_counter("En ventana DevTools: Ejecutando script...")
        send_keys_safely(devtools_window, "{ENTER}")
        time.sleep(wait_time)

        try:
            pyperclip.copy(original_clipboard)
            log_with_counter("Portapapeles restaurado.")
        except pyperclip.PyperclipException as e:
            log_with_counter(f"Advertencia al restaurar portapapeles: {e}")

        log_with_counter("En ventana DevTools: Cerrando ventana (Ctrl+W)...")
        send_keys_safely(devtools_window, "^w")
        time.sleep(wait_time)

        log_with_counter("Volviendo a la ventana principal de VS Code...")
        main_window.set_focus()
        time.sleep(1)

        log_with_counter("--- Secuencia de Developer Tools completada ---")
        return True

    except Exception as e:
        log_with_counter(f"❌ Error durante la secuencia de Developer Tools: {e}")
        traceback.print_exc()
        if devtools_window:
            try:
                log_with_counter("Intentando cerrar ventana de DevTools tras error...")
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


def open_devtools_and_run_script(main_window, script):
    """
    Abre las DevTools en VS Code, pega y ejecuta un script en la consola, y cierra DevTools.
    main_window: pywinauto window object de VS Code.
    script: string con el código JavaScript a ejecutar.
    """
    log_with_counter("Step 1: Focusing main window")
    main_window.set_focus()
    time.sleep(2)

    log_with_counter("Step 2: Opening command palette (Ctrl+Shift+P)")
    send_keys("^+p")
    time.sleep(2)

    log_with_counter("Step 3: Typing 'Developer: Toggle Developer Tools'")
    pyperclip.copy("Developer: Toggle Developer Tools")
    send_keys("^v")
    time.sleep(2)
    send_keys("{ENTER}")

    log_with_counter("Step 4: Waiting for DevTools to open")
    time.sleep(10)

    log_with_counter("Step 5: Sending TAB to move focus")
    send_keys("{TAB}")
    time.sleep(0.3)

    log_with_counter("Step 6: Pasting script and executing (Ctrl+V, Enter)")
    pyperclip.copy(script)
    send_keys("^v")
    time.sleep(2)
    send_keys("{ENTER}")

    log_with_counter("Step 7: Waiting for script to execute")
    time.sleep(5)

    log_with_counter("Step 8: Closing DevTools (Alt + F4)")
    send_keys("%{F4}")  # Alt + F4
    time.sleep(2)
    
    log_with_counter("Step 9: Returning focus to main window")
    main_window.set_focus()
    time.sleep(1)
    
    # Click in the chat area (optional if needed)
    try:
        chat_area = main_window.child_window(title_re="Chat.*", control_type="Edit")
        if (chat_area.exists()):
            chat_area.click_input()
            log_with_counter("Clicked on chat area")
    except Exception as e:
        log_with_counter(f"Could not find or click chat area: {e}")
        # No additional keypresses that could cause Ctrl+.
        pass

# Add this function to format timestamps exactly like the JavaScript version
def get_local_timestamp_string():
    """Returns a timestamp string in the same format as the JavaScript version (YYYY-MM-DD HH:MM:SS.mmm)"""
    now = datetime.now()
    return now.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]  # Match the JS format exactly

def open_vscode_and_get_window(vscode_executable_path, folder_path, timeout=20):
    """
    Abre VS Code con la carpeta dada y retorna (app, main_window).
    """
    cmd = f'"{vscode_executable_path}" "{folder_path}"'
    app = Application(backend="uia").start(cmd)
    time.sleep(wait_time * 2)
    folder_name = os.path.basename(folder_path)
    try:
        main_window = app.connect(title_re=f".*{folder_name}.*Visual Studio Code.*", timeout=timeout).top_window()
    except ElementNotFoundError:
        main_window = app.connect(title_re=".*Visual Studio Code.*", timeout=timeout).top_window()
    return app, main_window

def extract_and_save_copilot_timings(main_window):
    """
    Abre DevTools, ejecuta getCopilotTimings() en la consola y guarda el resultado en un archivo JSON en la carpeta de salida.
    """
    log_with_counter("\n--- Abriendo DevTools para obtener copilotTimings ---")
    try:
        open_devtools(main_window, "")  # Solo abrir DevTools, no ejecutar script

        log_with_counter("Esperando y enfocando la ventana de DevTools para obtener timings...")
        devtools_window = focus_devtools_window(timeout=long_wait_time)
        if not devtools_window:
            log_with_counter("❌ No se pudo encontrar o enfocar la ventana de Developer Tools para timings.")
            return

        # Escribir y ejecutar copy(getCopilotTimings())
        pyperclip.copy("copy(getCopilotTimings())")
        send_keys_safely(devtools_window, "^v")
        time.sleep(0.5)
        send_keys_safely(devtools_window, "{ENTER}")
        time.sleep(2)

        # Leer del portapapeles
        copilot_timings_json = None
        try:
            clipboard_content = pyperclip.paste()
            match = re.search(r'(\[.*\])', clipboard_content, re.DOTALL)
            if (match):
                timings_str = match.group(1)
                copilot_timings_json = json.loads(timings_str)
                timings_filename = os.path.join(output_folder, f"copilot_timings_{llm_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
                with open(timings_filename, "w", encoding="utf-8") as f:
                    json.dump(copilot_timings_json, f, indent=4)
                print(f"Copilot timings guardados en: {timings_filename}")
            else:
                print("No se pudo extraer el array de timings del portapapeles.")
        except Exception as e:
            print(f"Error al procesar/copiar los copilotTimings: {e}")

        # Cerrar DevTools
        send_keys_safely(devtools_window, "^w")
        time.sleep(1)
        main_window.set_focus()
        time.sleep(1)
    except Exception as e:
        print(f"Error al intentar obtener y guardar copilotTimings: {e}")

# Función para obtener la lista de archivos de prompt de la carpeta
def get_prompt_files():
    """Obtiene la lista de archivos de prompt de la carpeta configurada."""
    try:
        # Usar un conjunto (set) para evitar duplicados
        unique_files = set()
        
        # Buscar archivos con extensiones comunes de texto
        for ext in ['*.txt', '*.md', '*.spec', '*.spec.txt']:
            found_files = glob.glob(os.path.join(prompt_folder_path, ext))
            for file in found_files:
                unique_files.add(file)
        
        # Convertir de vuelta a lista
        files = list(unique_files)
        
        if not files:
            log_with_counter(f"No se encontraron archivos en la carpeta: {prompt_folder_path}")
            log_with_counter(f"Usando archivo individual configurado: {prompt_file_path}")
            return [prompt_file_path]
        
        log_with_counter(f"Se encontraron {len(files)} archivos de prompt (sin duplicados):")
        for i, file in enumerate(files):
            log_with_counter(f"  {i+1}. {os.path.basename(file)}")
        return files
    except Exception as e:
        log_with_counter(f"Error al buscar archivos de prompt: {e}")
        log_with_counter(f"Usando archivo individual configurado: {prompt_file_path}")
        return [prompt_file_path]

# Modificar la función automate_vscode para procesar múltiples archivos
def automate_vscode():
    """Automatiza tareas en VS Code para múltiples archivos de prompt."""
    app = None
    main_window = None
    
    # Obtener la lista de archivos de prompt
    prompt_files = get_prompt_files()
    
    # Actualizar el conteo total de archivos
    global total_files_count, current_file_index
    total_files_count = len(prompt_files)
    current_file_index = 0
    
    try:
        log_with_counter("Iniciando Visual Studio Code...")
        vscode_path = r"C:\Users\xabia\AppData\Local\Programs\Microsoft VS Code\Code.exe"
        folder_to_open = workspace_folder_path
        log_with_counter(f"Abrir VS Code en carpeta: {folder_to_open}")
        app, main_window = open_vscode_and_get_window(vscode_path, folder_to_open, timeout=long_wait_time)
        log_with_counter("VS Code iniciado y ventana principal obtenida.")

        if not main_window:
            log_with_counter("Error fatal: No se pudo encontrar la ventana principal de VS Code después de esperar.")
            return

        setup_window(main_window)

        # --- INTEGRACIÓN: Ejecutar script en DevTools solo una vez al inicio ---
        log_with_counter("\n--- Ejecutando script en DevTools (integrado) ---")
        # Leer el script JS
        devtools_script_content = ""
        try:
            with open(devtools_script_path, 'r', encoding='utf-8') as file:
                devtools_script_content = file.read()
            log_with_counter(f"Script de DevTools leído correctamente: {devtools_script_path}")
        except Exception as e:
            log_with_counter(f"❌ Error al leer el script de DevTools: {e}")
            devtools_script_content = "console.log('No se pudo leer el script');"

        open_devtools_and_run_script(main_window, devtools_script_content)
        log_with_counter("--- Script DevTools ejecutado y DevTools cerradas ---\n")

        # Procesar cada archivo de prompt
        for idx, current_prompt_file in enumerate(prompt_files):
            current_file_index = idx + 1  # Actualizar índice del archivo actual (1-based index)
            
            log_with_counter(f"\n===== Procesando archivo {idx+1}/{len(prompt_files)}: {os.path.basename(current_prompt_file)} =====")
            
            # Leer el contenido del archivo de prompt actual
            prompt_content = read_prompt_file(current_prompt_file)
            
            # Si es el segundo archivo o posterior, limpiar el chat primero
            if idx > 0:
                #clear_chat(main_window)
                time.sleep(wait_time)
            
            log_with_counter("\n--- Continuando con la interacción del Chat ---")
            
            # Press Ctrl+L to clear the input field before typing
            log_with_counter("Presionando Ctrl+L para limpiar la entrada...")
            send_keys_safely(main_window, "^l")
            time.sleep(0.5)  # Small pause after clearing
            
            log_with_counter("Escribiendo #cypress-realworld-app caracter por caracter...")
            text_to_type = "#cypress-realworld-app"
            for char in text_to_type:
                send_keys_safely(main_window, char)
                time.sleep(0.1)  # pequeña pausa entre caracteres
            
            log_with_counter("Presionando TAB para seleccionar la sugerencia...")
            send_keys_safely(main_window, "{TAB}")
            time.sleep(wait_time)

            log_with_counter("Enviando contenido del prompt al chat...")
            send_text_to_editor(main_window, prompt_content)

            log_with_counter("Pulsando Enter para enviar el mensaje...")
            timestamp_envio = get_local_timestamp_string()
            log_with_counter(f"Timestamp de envío (Enter presionado): {timestamp_envio}")
            send_keys_safely(main_window, "{ENTER}")
            time.sleep(wait_time)

            log_with_counter(f"Esperando {long_wait_time} segundos para que se genere la respuesta...")
            time.sleep(long_wait_time)

            # Guardamos usando /save
            log_with_counter("Guardando el contenido usando /save...")
            save_content(main_window)
            time.sleep(2)
            
            # Seleccionamos y copiamos
            log_with_counter("Seleccionando todo el contenido guardado (Ctrl+A)...")
            send_keys_safely(main_window, "^a")
            time.sleep(1)
            
            log_with_counter("Copiando la selección (Ctrl+C)...")
            send_keys_safely(main_window, "^c")
            time.sleep(1.5)
            
            # Guardar el contenido copiado a un archivo
            log_with_counter("Guardando respuesta copiada a archivo local...")
            contenido = pyperclip.paste()
            
            original_filename = os.path.basename(current_prompt_file)
            filename_without_ext, ext = os.path.splitext(original_filename)
            timestamp_archivo = datetime.now().strftime("%Y%m%d_%H%M%S")
            archivo_salida = os.path.join(output_folder, f"{filename_without_ext}_response_{llm_name}_{timestamp_archivo}{ext}")
            
            try:
                with open(archivo_salida, "w", encoding="utf-8") as f:
                    f.write(contenido)
                log_with_counter(f"✅ Contenido guardado con éxito en: {archivo_salida}")
            except Exception as e:
                log_with_counter(f"Error guardando contenido: {e}")
                timestamp_error = datetime.now().strftime("%Y%m%d_%H%M%S")
                error_file_path = os.path.join(output_folder, f"error_guardado_{llm_name}_{timestamp_error}.txt")
                try:
                    # Intentar guardar el contenido en un archivo alternativo
                    with open(error_file_path, "w", encoding="utf-8") as f:
                        f.write(f"Error durante guardado original: {e}\n\n")
                        f.write(f"Contenido original que se intentó guardar:\n")
                        f.write(contenido)
                    log_with_counter(f"✅ Contenido guardado en archivo alternativo: {error_file_path}")
                    archivo_salida = error_file_path  # Actualizar la ruta para el registro de timestamps
                except Exception as e2:
                    log_with_counter(f"❌ Error crítico al guardar, incluso en archivo alternativo: {e2}")
                    archivo_salida = os.path.join(output_folder, f"error_guardado_sin_contenido_{llm_name}_{timestamp_error}.txt")
            
            # Almacenar el timestamp con el nombre del archivo original
            add_timestamp_entry(timestamp_envio, archivo_salida, current_prompt_file)

            # Cerrar la ventana/pestaña actual (Ctrl+F4)
            log_with_counter("Cerrando la ventana/panel actual (Ctrl+F4)...")
            send_keys_safely(main_window, "^{F4}")
            time.sleep(wait_time + 1)

            # Manejar diálogo de guardar si aparece
            log_with_counter("Verificando y cerrando el diálogo de guardar si apareció...")
            cerrar_dialogo_guardar_vscode()
            time.sleep(1)

            # Enfocar el chat después de guardar
            log_with_counter("Enfocando el chat (Ctrl+Shift+I)...")
            send_keys_safely(main_window, "^+i")
            time.sleep(1)

            log_with_counter("Abriendo el panel de chat (Ctrl+Alt+N)...")
            send_keys_safely(main_window, "^%n")
            time.sleep(1)
            
            log_with_counter(f"✅ Archivo {idx+1}/{len(prompt_files)} procesado correctamente.")
            
            # Pequeña pausa entre archivos
            time.sleep(wait_time)
        
        # Al finalizar todos los archivos, obtener y guardar timestamps
        log_with_counter("\n===== Procesamiento de todos los archivos completado =====")
        save_timestamps_to_json()

        # Obtener y guardar los timings de Copilot desde DevTools
        extract_and_save_copilot_timings(main_window)

    except Exception as e:
        log_with_counter(f"Ocurrió un error durante la automatización: {e}")
        traceback.print_exc()

        if timestamps_data:
            save_timestamps_to_json()

    finally:
        log_with_counter("Fin del script.")

def capture_chat_content(window):
    """
    Captura el contenido del chat de forma más confiable, asegurando que obtenemos
    el contenido real y no diálogos o texto de interfaz.
    """
    log_with_counter("Capturando contenido del chat de forma confiable...")
    
    # 1. Asegurar que tenemos el foco en la ventana principal
    window.set_focus()
    time.sleep(1)
    
    # 2. Buscar cualquier diálogo abierto y cerrarlo antes de continuar
    dialogs = Desktop(backend="uia").windows(class_name="#32770")
    if dialogs:
        log_with_counter("⚠️ Detectados diálogos antes de copiar. Intentando cerrarlos...")
        for dialog in dialogs:
            try:
                if "save" in dialog.window_text().lower():
                    log_with_counter(f"Cerrando diálogo: {dialog.window_text()}")
                    dialog.set_focus()
                    time.sleep(0.5)
                    send_keys("{ESC}")
                    time.sleep(1)
            except Exception as e:
                log_with_counter(f"Error intentando cerrar diálogo: {e}")
    
    # 3. Buscar y enfocar el área de chat específicamente
    chat_area = None
    try:
        log_with_counter("Buscando área específica del chat...")
        chat_selectors = [
            # Intentar con varios selectores específicos del panel de chat
            {"title_re": ".*GitHub Copilot Chat.*", "control_type": "Document"},
            {"title_re": ".*Chat.*", "control_type": "Edit"},
            {"title_re": ".*Chat.*", "control_type": "Document"},
            {"title_re": ".*Copilot.*", "control_type": "Document"},
            {"automation_id": "chatEditor"},
            {"class_name_re": ".*CodeEditor.*"}
        ]
        
        for selector in chat_selectors:
            try:
                potential_chat = window.child_window(**selector)
                if potential_chat.exists():
                    chat_area = potential_chat
                    log_with_counter(f"✅ Área de chat encontrada con selector: {selector}")
                    break
            except Exception:
                continue
        
        if chat_area:
            log_with_counter("Haciendo clic en el área de chat encontrada...")
            chat_area.click_input()
            time.sleep(1)
        else:
            log_with_counter("No se encontró un área de chat específica. Haciendo clic en la parte central...")
            # Clic en el área central donde probablemente está el chat
            window_rect = window.rectangle()
            center_x = (window_rect.left + window_rect.right) // 2
            center_y = (window_rect.top + window_rect.bottom) // 2
            window.click_input(coords=(center_x, center_y))
            time.sleep(1)
    
    except Exception as e:
        log_with_counter(f"Error al localizar área de chat: {e}")
        # Continuar con el enfoque general
        window.set_focus()
        time.sleep(1)
    
    # 4. Limpiar el portapapeles antes de copiar
    try:
        pyperclip.copy("")
        time.sleep(0.5)
    except Exception as e:
        log_with_counter(f"Error al limpiar portapapeles: {e}")
    
    # 5. Intentar seleccionar todo con múltiples métodos
    contenido = ""
    methods = [
        # Método 1: Ctrl+A estándar
        lambda: send_keys_safely(window, "^a", pause=0.1),
        
        # Método 2: Ctrl+Home seguido de Shift+Ctrl+End (selección desde inicio a fin)
        lambda: (send_keys_safely(window, "^{HOME}", pause=0.1), 
                 time.sleep(0.5), 
                 send_keys_safely(window, "+^{END}", pause=0.1)),
        
        # Método 3: Click + Ctrl+A
        lambda: (window.click_input() if chat_area is None else chat_area.click_input(), 
                 time.sleep(0.5), 
                 send_keys_safely(window, "^a", pause=0.1))
    ]
    
    for i, method in enumerate(methods):
        log_with_counter(f"Intento #{i+1} de selección...")
        try:
            method()
            time.sleep(1)
            
            log_with_counter(f"Copiando selección (intento #{i+1})...")
            send_keys_safely(window, "^c", pause=0.1)
            time.sleep(1.5)
            
            contenido = pyperclip.paste()
            log_with_counter(f"Contenido copiado: {len(contenido)} caracteres")
            
            # Verificar si el contenido parece un diálogo
            if not es_dialogo(contenido) and len(contenido.strip()) > 10:
                log_with_counter("✅ Contenido válido copiado.")
                break 
            else:
                log_with_counter("⚠️ Contenido parece ser un diálogo o es muy corto. Reintentando...")
                contenido = "" # Resetear si no es válido
        except Exception as e:
            log_with_counter(f"Error en intento #{i+1}: {e}")
    
    # 6. Guardar el contenido capturado
    archivo_salida = ""
    try:
        if not contenido.strip():
            log_with_counter("❌ ERROR: No se pudo capturar contenido válido después de múltiples intentos")
            archivo_salida = os.path.join(output_folder, f"empty_content_{llm_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
            with open(archivo_salida, "w", encoding="utf-8") as f:
                f.write("Error: No se pudo capturar contenido del chat")
        elif es_dialogo(contenido):
            log_with_counter("⚠️ Se capturó texto de diálogo en lugar del contenido del chat")
            archivo_salida = os.path.join(output_folder, f"dialog_content_{llm_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
            with open(archivo_salida, "w", encoding="utf-8") as f:
                f.write(contenido)
                f.write("\n\n# NOTA: Este contenido parece ser de un diálogo, no del chat de Copilot")
        else:
            original_filename = os.path.basename(prompt_file_path)
            filename_without_ext, ext = os.path.splitext(original_filename)
            timestamp_archivo = datetime.now().strftime("%Y%m%d_%H%M%S")
            archivo_salida = os.path.join(output_folder, f"{filename_without_ext}_response_{llm_name}_{timestamp_archivo}{ext}")
            
            with open(archivo_salida, "w", encoding="utf-8") as f:
                f.write(contenido)
            log_with_counter(f"✅ Contenido guardado con éxito en: {archivo_salida}")
    except Exception as e:
        log_with_counter(f"Error al guardar contenido: {e}")
        traceback.print_exc()
        timestamp_error = datetime.now().strftime("%Y%m%d_%H%M%S")
        archivo_salida = os.path.join(output_folder, f"error_guardado_{llm_name}_{timestamp_error}.txt")
    
    return archivo_salida

def es_dialogo(texto):
    """Detecta si el texto copiado parece ser de un diálogo en lugar del contenido real."""
    if not texto:
        return False # Added return for empty string case
    
    indicadores_dialogo = [
        "[Window Title]",
        "[Save]",
        "[Don't Save]", # Corrected: No backslash needed here for single quote inside double quotes
        "[Cancel]",
        "Do you want to save",
        "Your changes will be lost"
    ]
    
    return any(indicador in texto for indicador in indicadores_dialogo) # Corrected syntax

if __name__ == "__main__":
    automate_vscode()