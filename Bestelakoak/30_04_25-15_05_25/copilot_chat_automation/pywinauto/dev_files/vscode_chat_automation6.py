import time
import psutil
import subprocess
import traceback
import os
import json
from pywinauto.application import Application
from pywinauto import Desktop
from pywinauto.keyboard import send_keys
import pyperclip
from datetime import datetime  # Add this import for timestamp functionality

# --- Configuración ---
# Ruta al archivo de prompt
prompt_file_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\30_04_25-15_05_25\preparePrompts\prompts\auth1.spec.txt"
# Ruta al archivo del script para DevTools
devtools_script_path = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\VsCode\pywinauto\copilotTimer2.js"

# Variable para almacenar los timestamps y nombres de archivos
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
        # Si no se proporciona una ruta, crear una basada en la fecha actual
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
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        print(f"Archivo de prompt leído correctamente: {file_path}")
        return content
    except Exception as e:
        print(f"Error al leer el archivo de prompt: {e}")
        return """Error: No se pudo leer el archivo de prompt."""

# Leer el contenido del archivo al inicio
auth1_spec_content = read_prompt_file(prompt_file_path)

# Tiempos de espera
wait_time = 2  # Tiempo de espera normal (segundos)
long_wait_time = 90  # Tiempo de espera largo (1 minuto)

def automate_vscode():
    """Automatiza tareas en VS Code."""
    app = None
    main_window = None
    try:
        # Iniciar VS Code
        print("Iniciando Visual Studio Code...")
        vscode_path = r"C:\Users\xabia\AppData\Local\Programs\Microsoft VS Code\Code.exe"
        process = subprocess.Popen([vscode_path, "--new-window"])
        vscode_main_pid = process.pid
        print(f"VS Code iniciado con PID: {vscode_main_pid}")
        
        # Esperar a que cargue completamente
        print(f"Esperando {long_wait_time} segundos para que VS Code se cargue...")
        time.sleep(long_wait_time)
        
        # Conectar con la ventana de VS Code usando diferentes estrategias
        main_window = find_vscode_window(vscode_main_pid)
        
        if not main_window:
            print("Error: No se pudo encontrar la ventana de VS Code.")
            return
        
        # Configurar la ventana
        setup_window(main_window)
        
        # Función para enviar teclas de manera segura
        def send_keys_safely(keys_to_send, with_spaces=False, pause=0.05):
            try:
                # Asegurar que tenemos el foco
                main_window.set_focus()
                time.sleep(0.5)
                
                # Reconfirmar el foco si es necesario
                if not main_window.is_active():
                    main_window.set_focus()
                    time.sleep(0.5)
                
                print(f"Enviando teclas: {keys_to_send}")
                send_keys(keys_to_send, with_spaces=with_spaces, pause=pause)
                return True
            except Exception as e:
                print(f"Error al enviar teclas: {e}")
                return False
        
        # NUEVO PASO: Abrir DevTools y ejecutar script
        print("Abriendo Developer Tools y ejecutando script...")
        open_and_execute_devtools_script(main_window, send_keys_safely)
        
        # --- RECONEXIÓN ---
        print("Reconectando con la ventana principal de VS Code tras DevTools...")
        main_window = find_vscode_window(vscode_main_pid)
        if not main_window:
            print("Error: No se pudo reconectar con la ventana de VS Code tras DevTools.")
            return
        setup_window(main_window)
        
        # === SECUENCIA DE AUTOMATIZACIÓN ===
        
        # 1. Abrir la paleta de comandos
        print("Abriendo paleta de comandos (Ctrl+Shift+I)...")
        send_keys_safely("^+I")
        time.sleep(wait_time)
        
        # 2. Escribir el comando para abrir el chat con el modelo
        print("Escribiendo #cypress-realworld-app...")
        send_keys_safely("#cypress-realworld-app ", with_spaces=True)
        time.sleep(0.5)
        
        # 3. Enviar el contenido usando el portapapeles
        print("Enviando contenido al chat...")
        send_text_to_editor(main_window, auth1_spec_content, send_keys_safely)
        
        # 4. Enviar el mensaje
        print("Pulsando Enter para enviar el mensaje...")
        # Add timestamp printing when Enter is pressed
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]  # Format with milliseconds
        print(f"Timestamp de envío (Enter presionado): {timestamp}")
        send_keys_safely("{ENTER}")
        time.sleep(wait_time)
        
        # 5. Esperar a la respuesta
        print(f"Esperando {long_wait_time} segundos para que se genere la respuesta...")
        time.sleep(long_wait_time)
        
        # 6. Guardar el contenido
        print("Guardando el contenido...")
        save_content(main_window, send_keys_safely)
        
        # 7. Seleccionar y guardar el resultado en un archivo
        output_filename = save_response_to_file(main_window, send_keys_safely)
        
        # Registrar el timestamp y el nombre del archivo de salida
        add_timestamp_entry(timestamp, output_filename)
        
        # 8. Cerrar la ventana y manejar el diálogo de guardar
        print("Cerrando la ventana actual...")
        send_keys_safely("^w")
        time.sleep(wait_time)
        
        # 9. Manejar el diálogo de guardar cambios
        cerrar_dialogo_guardar_vscode()
        
        # 10. Limpiar el chat
        clear_chat(send_keys_safely)
        
        # 11. Guardar los timestamps en un archivo JSON
        save_timestamps_to_json()
        
        print("Automatización completada con éxito.")
        
    except Exception as e:
        print(f"Ocurrió un error: {e}")
        traceback.print_exc()
        
        # En caso de error, intentar guardar los timestamps recolectados hasta el momento
        if timestamps_data:
            save_timestamps_to_json()
    finally:
        print("Fin del script.")

def find_vscode_window(main_pid):
    """Busca y conecta con la ventana de VS Code usando diferentes estrategias."""
    # Estrategia 1: Conectar por PID
    try:
        print(f"Intentando conectar con el proceso PID: {main_pid}...")
        app = Application(backend="uia").connect(process=main_pid)
        main_window = app.top_window()
        print(f"Ventana encontrada: '{main_window.window_text()}'")
        return main_window
    except Exception as e:
        print(f"Error conectando por PID: {e}")
    
    # Estrategia 2: Conectar por título
    try:
        for title in ["Welcome - Visual Studio Code", "Visual Studio Code", "- Visual Studio Code"]:
            try:
                app = Application(backend="uia").connect(title=title, timeout=2)
                main_window = app.top_window()
                print(f"Ventana encontrada por título: '{title}'")
                return main_window
            except:
                continue
    except Exception:
        pass
    
    # Estrategia 3: Buscar en procesos activos
    try:
        for proc in psutil.process_iter(['pid', 'name']):
            if proc.info['name'].lower() == "code.exe":
                try:
                    app = Application(backend="uia").connect(process=proc.info['pid'])
                    main_window = app.top_window()
                    print(f"Ventana encontrada por proceso: '{main_window.window_text()}'")
                    return main_window
                except:
                    continue
    except:
        pass
    
    return None

def setup_window(window):
    """Configura la ventana para la interacción."""
    try:
        if not window.is_visible():
            print("Advertencia: Ventana no visible")
        
        # Poner la ventana en primer plano
        window.set_focus()
        
        # Intentar maximizarla si es necesario
        try:
            window.maximize()
            print("Ventana maximizada")
        except:
            print("No se pudo maximizar la ventana")
        
        # Esperar a que esté lista
        time.sleep(2)
    except Exception as e:
        print(f"Error al configurar la ventana: {e}")

def send_text_to_editor(window, text, send_keys_func):
    """Envía texto al editor usando el portapapeles."""
    # Guardar contenido original del portapapeles
    try:
        original_clipboard = pyperclip.paste()
    except:
        original_clipboard = ""
    
    # Método preferido: portapapeles
    try:
        pyperclip.copy(text)
        window.set_focus()
        time.sleep(1)
        send_keys_func("^v")  # Ctrl+V
        time.sleep(2)
        
        # Restaurar portapapeles
        try:
            pyperclip.copy(original_clipboard)
        except:
            pass
            
    except Exception as e:
        print(f"Error usando portapapeles: {e}")
        # Método alternativo: escribir línea por línea
        window.set_focus()
        lines = text.strip().split('\n')
        for line in lines:
            if not window.is_active():
                window.set_focus()
            send_keys_func(line, with_spaces=True, pause=0.05)
            send_keys_func("{ENTER}")
            time.sleep(0.1)

def save_content(window, send_keys_func):
    """Guarda el contenido usando /save."""
    # Asegurar foco
    window.set_focus()
    time.sleep(0.5)
    
    # Escribir comando /save
    send_keys_func("/save", with_spaces=True)
    time.sleep(0.5)
    send_keys_func("{ENTER}")
    time.sleep(wait_time)

def save_response_to_file(window, send_keys_func):
    """Selecciona, copia y guarda el contenido a un archivo."""
    # Seleccionar todo el texto
    send_keys_func("^a")
    time.sleep(0.2)
    
    # Copiar al portapapeles
    send_keys_func("^c")
    time.sleep(0.5)
    
    # Guardar a archivo
    archivo_salida = ""
    try:
        contenido = pyperclip.paste()
        print(f"Copiados {len(contenido)} caracteres")
        
        # Extraer el nombre base del archivo original
        original_filename = os.path.basename(prompt_file_path)
        filename_without_ext, ext = os.path.splitext(original_filename)
        
        # Crear nuevo nombre con "response" antes de la extensión
        archivo_salida = f"{filename_without_ext}_response{ext}"
        
        with open(archivo_salida, "w", encoding="utf-8") as f:
            f.write(contenido)
        print(f"Contenido guardado en: {archivo_salida}")
    except Exception as e:
        print(f"Error guardando el contenido: {e}")
        # En caso de error, usar un nombre de archivo genérico con timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archivo_salida = f"response_{timestamp}.txt"
        try:
            with open(archivo_salida, "w", encoding="utf-8") as f:
                f.write(contenido)
            print(f"Contenido guardado con nombre alternativo: {archivo_salida}")
        except Exception as e2:
            print(f"Error en el guardado alternativo: {e2}")
            archivo_salida = "error_no_guardado.txt"
    
    # Devolver el nombre del archivo de salida para el registro de timestamps
    return archivo_salida

def cerrar_dialogo_guardar_vscode(timeout=5):
    """Cierra el diálogo de guardar cambios de VSCode si aparece."""
    from pywinauto import Desktop, mouse
    import time

    print("🔎 Buscando diálogo de guardar de VSCode...")

    end_time = time.time() + timeout
    dialog = None

    while time.time() < end_time:
        windows = Desktop(backend="win32").windows(class_name="#32770")
        for win in windows:
            title = win.window_text().strip()
            if title == "Visual Studio Code":
                dialog = win
                break
        if dialog:
            break
        time.sleep(0.2)

    if not dialog:
        print("❌ No se detectó el diálogo de guardar.")
        return False

    print("✅ Diálogo detectado:", dialog.window_text())

    # Intento 1: Enviar teclas {RIGHT}{ENTER}
    try:
        dialog.set_focus()
        dialog.type_keys("{RIGHT}{ENTER}")
        print("✅ Cerrado con teclas {RIGHT}{ENTER}")
        return True
    except Exception as e:
        print("⚠️ type_keys falló:", e)

    # Intento 2: Buscar botón “Don’t Save” o “No guardar” y hacer clic
    try:
        for btn in dialog.descendants(control_type="Button"):
            btn_text = btn.window_text()
            if "Don't Save" in btn_text or "No guardar" in btn_text:
                btn.click()
                print(f"✅ Click en botón: {btn_text}")
                return True
    except Exception as e:
        print("⚠️ Fallo al hacer clic en el botón:", e)

    # Intento 3: Click en coordenadas (último recurso)
    try:
        rect = dialog.rectangle()
        x = rect.left + 250
        y = rect.top + 100
        mouse.click(coords=(x, y))
        print("✅ Click en coordenadas ({}, {})".format(x, y))
        return True
    except Exception as e:
        print("❌ No se pudo cerrar el diálogo:", e)

    return False

def medir_tiempo_respuesta_enviar(main_window):
    """Mide el tiempo que tarda el botón de enviar en volver a estar disponible."""
    print("⌛ Midiendo tiempo de respuesta...")

    try:
        # Buscar el botón de enviar por nombre o automation_id
        send_button = main_window.child_window(title="Send", control_type="Button")
        if not send_button.exists():
            print("❌ No se encontró el botón de enviar.")
            return

        # Esperar a que esté habilitado antes de pulsarlo
        while not send_button.is_enabled():
            time.sleep(0.1)

        # Guardar estado inicial
        print("📨 Enviando mensaje...")
        start_time = time.time()

        # Pulsar botón
        send_button.click_input()

        # Esperar a que se deshabilite (inicio del procesamiento)
        while send_button.is_enabled():
            time.sleep(0.05)

        # Esperar a que se re-habilite (fin del procesamiento)
        while not send_button.is_enabled():
            time.sleep(0.1)

        end_time = time.time()
        elapsed = end_time - start_time
        print(f"✅ Tiempo de respuesta del chat: {elapsed:.2f} segundos")

    except Exception as e:
        print(f"❌ Error al medir tiempo de respuesta: {e}")


def clear_chat(send_keys_func):
    """Limpia el chat."""
    # Abrir paleta
    send_keys_func("^+i")
    time.sleep(wait_time)
    
    # Escribir comando de limpieza
    send_keys_func("/clear", with_spaces=True)
    time.sleep(0.5)
    
    # Confirmar
    send_keys_func("{ENTER}")
    time.sleep(wait_time)

def open_and_execute_devtools_script(window, send_keys_func):
    """Abre las herramientas de desarrollo y ejecuta un script JavaScript."""
    try:
        # 1. Abrir la paleta de comandos con Ctrl+Shift+P
        print("Abriendo paleta de comandos (Ctrl+Shift+P)...")
        send_keys_func("^+p")
        time.sleep(wait_time)
        
        # 2. Escribir el comando para abrir DevTools
        print("Escribiendo 'Developer: Toggle Developer Tools'...")
        send_keys_func("Developer: Toggle Developer Tools", with_spaces=True)
        time.sleep(wait_time)
        
        # 3. Presionar Enter para abrir DevTools
        print("Abriendo DevTools...")
        send_keys_func("{ENTER}")
        time.sleep(long_wait_time)  # Esperar a que se abran las herramientas de desarrollo
        
        # 4. Enfocarse en la consola (presionar Esc para asegurarse de que está abierta)
        send_keys_func("{ESC}")
        time.sleep(1)
        
        # 5. Leer el contenido del archivo JavaScript
        devtools_script = ""
        try:
            with open(devtools_script_path, 'r', encoding='utf-8') as file:
                devtools_script = file.read()
            print(f"Script de DevTools leído correctamente: {devtools_script_path}")
        except Exception as e:
            print(f"Error al leer el script de DevTools: {e}")
            return
        
        # 6. Copiar el script al portapapeles
        original_clipboard = pyperclip.paste()
        pyperclip.copy(devtools_script)
        
        # 7. Pegar el script en la consola
        print("Pegando script en la consola de DevTools...")
        send_keys_func("^v")  # Ctrl+V
        time.sleep(1)
        
        # 8. Ejecutar el script presionando Enter
        print("Ejecutando script en la consola...")
        send_keys_func("{ENTER}")
        time.sleep(2)
        
        # 9. Restaurar el portapapeles original
        pyperclip.copy(original_clipboard)
        
        # 10. Volver a la ventana principal (Alt+Tab)
        print("Volviendo a la ventana principal...")
        send_keys_func("%{TAB}")
        time.sleep(1)
        
        # 11. Asegurar que la ventana principal tiene el foco
        window.set_focus()
        time.sleep(1)
        
        print("Script de DevTools ejecutado correctamente.")
    except Exception as e:
        print(f"Error al ejecutar el script de DevTools: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    automate_vscode()
