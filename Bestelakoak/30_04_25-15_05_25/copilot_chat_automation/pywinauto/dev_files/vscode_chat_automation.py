import os
import time
import pyperclip
from pywinauto.application import Application
from pywinauto.findwindows import ElementNotFoundError
from pywinauto.keyboard import send_keys

# --- Añadir nuevas importaciones ---
import cv2
import numpy as np
import pyautogui
from PIL import Image, ImageGrab
import logging

# --- Configuración ---
# Modifica estas rutas según tu configuración
VSCODE_EXECUTABLE_PATH = r"C:\Users\xabia\AppData\Local\Programs\Microsoft VS Code\Code.exe" # Ajusta esta ruta si es diferente
FOLDER_TO_PROCESS = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\30_04_25-15_05_25\preparePrompts\prompts"  # Reemplaza con la ruta a tu carpeta de archivos
OUTPUT_DIR = r"C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\Bestelakoak\30_04_25-15_05_25\preparePrompts\prompts\Sonnet"        # Reemplaza con la ruta donde guardar las respuestas

# Nueva configuración: Carpeta adicional como contexto
ADDITIONAL_CONTEXT_FOLDER = r"C:\ruta\a\carpeta\adicional\de\contexto"  # Reemplaza con la ruta a tu carpeta adicional de contexto
USE_WORKSPACE_FILE = True  # Si es True, creará un archivo .code-workspace para gestionar múltiples carpetas

# Tiempo de espera para diversas operaciones (en segundos)
WAIT_TIME_SHORT = 2
WAIT_TIME_MEDIUM = 5
WAIT_TIME_LONG = 15 # Tiempo para esperar la respuesta del chat

# Añadir tiempo máximo de espera para la respuesta (en segundos)
MAX_RESPONSE_WAIT_TIME = 180  # 3 minutos máximo para esperar una respuesta

# Nuevas configuraciones para mejorar la precisión
# Ruta para guardar capturas de pantalla de diagnóstico
SCREENSHOTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
# Habilitar o deshabilitar capturas de pantalla de diagnóstico
ENABLE_SCREENSHOTS = True
# Habilitar o deshabilitar reconocimiento de imágenes
USE_IMAGE_RECOGNITION = True
# Directorio para imágenes de referencia (botones, campo de entrada, etc.)
REFERENCE_IMAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reference_images")

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(os.path.abspath(__file__)), "automation_log.txt")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Preparar directorio para capturas de pantalla
if ENABLE_SCREENSHOTS and not os.path.exists(SCREENSHOTS_DIR):
    os.makedirs(SCREENSHOTS_DIR)

# Configuración de ventana
MAXIMIZE_WINDOW = True  # Establecer a False si prefieres que no se maximice automáticamente

# Configuración para script en consola DevTools
EXECUTE_DEVTOOLS_SCRIPT = True  # Establecer a False si no quieres ejecutar ningún script en DevTools
# Ruta al archivo JavaScript que se ejecutará en la consola DevTools
DEVTOOLS_SCRIPT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "copilotTimer.js")

def take_screenshot(name="screenshot", main_window=None):
    """
    Toma una captura de pantalla para diagnóstico.
    Si se proporciona main_window, toma una captura de esa ventana específica.
    """
    if not ENABLE_SCREENSHOTS:
        return None
    
    try:
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        filename = f"{name}_{timestamp}.png"
        path = os.path.join(SCREENSHOTS_DIR, filename)
        
        if main_window:
            # Captura la ventana específica
            main_window.capture_as_image().save(path)
        else:
            # Captura toda la pantalla
            ImageGrab.grab().save(path)
        
        logger.info(f"Captura de pantalla guardada: {path}")
        return path
    except Exception as e:
        logger.error(f"Error tomando captura de pantalla: {e}")
        return None

def find_image_on_screen(template_path, confidence=0.8):
    """
    Busca una imagen de referencia en la pantalla.
    Retorna: (x, y, w, h) si se encuentra, None en caso contrario
    """
    if not USE_IMAGE_RECOGNITION:
        return None
    
    try:
        # Tomar captura de pantalla
        screenshot = pyautogui.screenshot()
        screenshot = np.array(screenshot)
        screenshot = cv2.cvtColor(screenshot, cv2.COLOR_RGB2BGR)
        
        # Cargar imagen de referencia
        template = cv2.imread(template_path)
        
        if template is None:
            logger.error(f"No se pudo cargar la imagen de referencia: {template_path}")
            return None
        
        # Buscar coincidencia
        result = cv2.matchTemplate(screenshot, template, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
        
        if max_val >= confidence:
            w, h = template.shape[1], template.shape[0]
            return (max_loc[0], max_loc[1], w, h)
        else:
            return None
    except Exception as e:
        logger.error(f"Error en reconocimiento de imagen: {e}")
        return None

def click_image_if_found(template_path, confidence=0.8, click_offset=(0, 0)):
    """
    Busca una imagen en la pantalla y hace clic si la encuentra.
    """
    result = find_image_on_screen(template_path, confidence)
    if result:
        x, y, w, h = result
        # Calcular el centro de la imagen + offset
        center_x = x + w//2 + click_offset[0]
        center_y = y + h//2 + click_offset[1]
        # Hacer clic
        pyautogui.click(center_x, center_y)
        logger.info(f"Clic en imagen encontrada: {template_path} en ({center_x}, {center_y})")
        return True
    else:
        logger.warning(f"No se encontró la imagen: {template_path}")
        return False

def wait_for_chat_response(main_window):
    """
    Espera a que el chat termine de responder comprobando el estado del botón de enviar.
    Verifica si el botón dice "Send (Enter)" o "Cancel (Alt + Backspace)".
    """
    print("Esperando respuesta del chat...")
    max_wait_time = time.time() + MAX_RESPONSE_WAIT_TIME
    
    while time.time() < max_wait_time:
        # Intenta localizar el botón de enviar por su texto (puede variar según la configuración de idioma de VS Code)
        try:
            # Buscar botones en la interfaz que contengan "Send" o "Cancel"
            send_button = main_window.child_window(title_re=".*Send.*Enter.*", control_type="Button")
            # Si encontramos el botón "Send", significa que el chat ha terminado
            if send_button.exists():
                print("Respuesta completada (botón 'Send' detectado)")
                return True
        except:
            # Intenta verificar si hay un botón de cancelar en su lugar
            try:
                cancel_button = main_window.child_window(title_re=".*Cancel.*Backspace.*", control_type="Button")
                if cancel_button.exists():
                    # Si hay un botón de cancelar, el chat sigue generando respuesta
                    print("Chat aún procesando... (botón 'Cancel' detectado)")
                    time.sleep(1)
                    continue
            except:
                # Si no encontramos ninguno de los dos botones, esperamos un poco
                pass
        
        # Si no podemos determinar el estado, simplemente esperamos
        time.sleep(1)
    
    print("Tiempo máximo de espera alcanzado. Continuando...")
    return False

def add_context_to_chat(main_window):
    """
    Añade el contexto 'cypress-realworld-app' al chat usando reconocimiento de imágenes
    para encontrar el botón "Add Context...", luego:
    1. Teclear "Files & Folders..." y presionar Enter
    2. Teclear "cypress-realworld-app" y presionar Enter
    """
    logger.info("Añadiendo contexto al chat...")
    take_screenshot("antes_add_context", main_window)
    
    # Asegurar primero que la ventana de chat está activa
    try:
        logger.info("Verificando que la ventana de chat está activa...")
        # Intentar encontrar elementos relacionados con la vista de chat
        chat_elements = [
            main_window.child_window(title_re=".*[Cc]hat.*", control_type="Pane"),
            main_window.child_window(title_re=".*[Cc]opilot.*", control_type="Pane"),
            main_window.child_window(title_re=".*[Cc]hat.*", control_type="Document"),
            main_window.child_window(title_re=".*[Cc]hat.*", control_type="Edit"),
        ]
        
        chat_active = False
        for element in chat_elements:
            try:
                if element.exists():
                    element.click_input()
                    logger.info(f"Hecho clic en elemento de chat: {element.window_text()}")
                    time.sleep(WAIT_TIME_SHORT)
                    chat_active = True
                    break
            except:
                pass
        
        if not chat_active:
            # Si no encontramos elementos específicos, intentar reactivar la vista de chat
            logger.info("No se encontraron elementos específicos de chat, intentando reactivar la vista...")
            main_window.set_focus()
            # Presionar Ctrl+Alt+I de nuevo para asegurarse que el chat está activo
            send_keys("^%i")
            time.sleep(WAIT_TIME_MEDIUM)
    
    except Exception as e:
        logger.warning(f"Error al verificar/activar la ventana de chat: {e}")
        
    # Método directo: usar reconocimiento de imagen para encontrar el botón "Add Context..."
    try:
        logger.info("Usando reconocimiento de imágenes para añadir contexto...")
        
        # Asegurarnos de que la ventana de VS Code tiene el foco
        main_window.set_focus()
        time.sleep(WAIT_TIME_SHORT)
        
        # 1. Abrir el menú de contexto usando la imagen de referencia (prioridad máxima)
        add_context_button_path = os.path.join(REFERENCE_IMAGES_DIR, "add_context_button.png")
        
        # Hacemos hasta 3 intentos con diferentes niveles de confianza
        context_menu_opened = False
        confidence_levels = [0.8, 0.7, 0.6]  # Probamos primero con alta confianza, luego reducimos
        
        logger.info("Buscando botón 'Add Context' mediante reconocimiento de imagen...")
        for confidence in confidence_levels:
            if click_image_if_found(add_context_button_path, confidence=confidence):
                logger.info(f"Botón 'Add Context' encontrado y clickeado con confianza {confidence}")
                context_menu_opened = True
                time.sleep(WAIT_TIME_SHORT)
                break
        
        # Si no pudimos encontrar el botón con reconocimiento de imagen, intentar métodos alternativos
        if not context_menu_opened:
            logger.info("No se encontró la imagen del botón, usando métodos alternativos...")
            
            # Intentar primero con el atajo Ctrl+Ç
            send_keys("^{VK_OEM_2}")  # Ctrl+Ç
            time.sleep(WAIT_TIME_SHORT)
            context_menu_opened = any([main_window.child_window(title_re=".*[Ff]iles.*", control_type="MenuItem").exists() for _ in range(1)])
            
            # Si el atajo no funcionó, intentar encontrar y hacer clic en el botón por texto
            if not context_menu_opened:
                logger.info("Atajo de teclado no funcionó, intentando con botón por texto...")
                try:
                    context_button = main_window.child_window(title="Add Context...", control_type="Button")
                    if context_button.exists():
                        context_button.click_input()
                        context_menu_opened = True
                        time.sleep(WAIT_TIME_SHORT)
                except:
                    logger.warning("No se encontró el botón por texto.")
        
        # Si aún no hemos abierto el menú de contexto, usar el método directo de entrada
        if not context_menu_opened:
            logger.warning("No se pudo abrir el menú de contexto con ningún método.")
            # Intentamos directamente escribir los comandos esperados
        
        # 2. Seleccionar "Files & Folders..." y presionar Enter
        # Intentar primero con reconocimiento de imagen si existe la referencia
        files_folders_option_path = os.path.join(REFERENCE_IMAGES_DIR, "files_folders_option.png")
        files_folders_selected = False
        
        if os.path.exists(files_folders_option_path):
            logger.info("Buscando opción 'Files & Folders' mediante reconocimiento de imagen...")
            if click_image_if_found(files_folders_option_path, confidence=0.7):
                logger.info("Opción 'Files & Folders' encontrada y clickeada")
                files_folders_selected = True
                time.sleep(WAIT_TIME_SHORT)
        
        # Si no se pudo seleccionar con imagen, usar método de texto o teclado
        if not files_folders_selected:
            # Intentar encontrar y hacer clic en la opción por texto
            try:
                files_option = main_window.child_window(title_re=".*[Ff]iles.*[Ff]olders.*", control_type="MenuItem")
                if files_option.exists():
                    files_option.click_input()
                    files_folders_selected = True
                    logger.info("Opción 'Files & Folders' seleccionada por texto")
                    time.sleep(WAIT_TIME_SHORT)
            except:
                pass
            
            # Si aún no se ha seleccionado, usar entrada directa
            if not files_folders_selected:
                logger.info("Escribiendo 'Files & Folders...' y presionando Enter")
                send_keys("Files & Folders{ENTER}")
        
        time.sleep(WAIT_TIME_MEDIUM)  # Esperar a que se abra el siguiente diálogo
        
        # 3. Escribir "cypress-realworld-app" y presionar Enter
        logger.info("Escribiendo 'cypress-realworld-app' y presionando Enter")
        send_keys("cypress-realworld-app{ENTER}")
        time.sleep(WAIT_TIME_MEDIUM)  # Esperar a que se complete la adición de contexto
        
        take_screenshot("despues_add_context", main_window)
        return True
        
    except Exception as e:
        logger.error(f"Error usando método con reconocimiento de imagen: {e}")
        logger.info("Intentando con el método tradicional...")
        
        # Si todos los métodos anteriores fallan, volver al método tradicional
        try:
            # Método tradicional (abrir menú de contexto explícitamente)
            # ...existing code for opening context menu and selecting Files & Folders...
            
            # 2. Seleccionar "Files & Folders" del menú desplegable
            files_option = main_window.child_window(title_re=".*[Ff]iles.*[Ff]olders.*", control_type="MenuItem")
            if files_option.exists():
                files_option.click_input()
                logger.info("Opción 'Files & Folders' seleccionada")
                time.sleep(WAIT_TIME_SHORT)
            else:
                # Intentar con método de navegación por teclado
                send_keys("{DOWN}{DOWN}{ENTER}")  # Asume que es la segunda o tercera opción
                logger.info("Navegación por teclado: DOWN,DOWN,ENTER")
                time.sleep(WAIT_TIME_SHORT)
            
            # 3. Escribir "cypress-realworld-app" y pulsar Enter
            # Buscar un campo de texto donde escribir
            input_field = main_window.child_window(control_type="Edit")
            if input_field.exists():
                input_field.click_input()
                input_field.type_keys("cypress-realworld-app")
                time.sleep(WAIT_TIME_SHORT)
                input_field.type_keys("{ENTER}")
                logger.info("'cypress-realworld-app' escrito y Enter pulsado")
            else:
                # Escribir directamente si no se encuentra campo específico
                send_keys("cypress-realworld-app{ENTER}")
                logger.info("'cypress-realworld-app' escrito con método alternativo")
            
            time.sleep(WAIT_TIME_MEDIUM)
            take_screenshot("despues_add_context_tradicional", main_window)
            return True
            
        except Exception as e:
            logger.error(f"Error con método tradicional: {e}")
            return False

def try_copy_code_blocks(main_window):
    """
    Intenta encontrar y copiar bloques de código en la respuesta del chat
    usando los botones de copia que aparecen en la esquina de los bloques de código.
    
    Retorna: (bool, str) - Éxito de la operación y texto copiado
    """
    print("Buscando bloques de código con botones de copia...")
    
    try:
        # Buscar botones que podrían ser de copiar código
        # La etiqueta puede variar: "Copy", "Copy code", etc.
        copy_buttons = main_window.children(title_re=".*[Cc]opy.*", control_type="Button")
        
        if not copy_buttons:
            # Si no encuentra con ese título, buscar por clasificación
            copy_buttons = main_window.children(class_name_re=".*copy.*", control_type="Button")
        
        if copy_buttons:
            print(f"Encontrados {len(copy_buttons)} posibles botones de copia.")
            
            # Si hay múltiples bloques de código, necesitamos intentar copiarlos todos
            all_code = []
            
            # Intentar hacer scroll hacia arriba para encontrar todos los bloques de código
            main_window.set_focus()
            send_keys("{HOME}")  # Ir al inicio de la respuesta
            time.sleep(WAIT_TIME_SHORT)
            
            # Intenta copiar cada bloque de código encontrado
            for i, button in enumerate(copy_buttons):
                try:
                    print(f"Intentando hacer clic en botón de copia {i+1}/{len(copy_buttons)}")
                    # Podríamos necesitar hacer scroll para ver el botón
                    button.scroll("visible") if hasattr(button, "scroll") else None
                    time.sleep(0.5)
                    button.click_input()
                    time.sleep(WAIT_TIME_SHORT)
                    
                    # Capturar lo que se ha copiado
                    code_block = pyperclip.paste()
                    if code_block and code_block.strip():
                        print(f"Copiado bloque de código {i+1}")
                        all_code.append(code_block)
                except Exception as e:
                    print(f"Error al copiar bloque {i+1}: {e}")
                    continue
            
            if all_code:
                # Unir todos los bloques de código con separadores
                combined_code = "\n\n=== BLOQUE DE CÓDIGO ===\n\n".join(all_code)
                return True, combined_code
                
        return False, ""
    
    except Exception as e:
        print(f"Error al buscar botones de copiar código: {e}")
        return False, ""

def copy_chat_response(main_window):
    """
    Intenta copiar la respuesta del chat usando diferentes estrategias.
    Primero intenta copiar bloques de código si existen, luego recurre a métodos alternativos.
    """
    print("Copiando respuesta del chat...")
    
    # Estrategia 1: Intentar copiar bloques de código si existen
    success, code_blocks = try_copy_code_blocks(main_window)
    if success and code_blocks:
        print("Respuesta copiada exitosamente usando botones de copia de código.")
        return code_blocks
    
    # Estrategia 2: Intentar seleccionar la respuesta específica
    try:
        print("Intentando copiar usando área de respuesta específica...")
        chat_output = main_window.child_window(title_re=".*response.*", control_type="Text", found_index=0)
        chat_output.click_input()
        send_keys("^a")  # Seleccionar todo
        send_keys("^c")  # Copiar
        time.sleep(WAIT_TIME_SHORT)
        response = pyperclip.paste()
        if response and response.strip():
            print("Respuesta copiada usando área específica.")
            return response
    except Exception as e:
        print(f"No se pudo copiar usando área específica: {e}")
    
    # Estrategia 3: Método genérico - intentar seleccionar todo y copiar
    try:
        print("Usando método genérico para copiar respuesta...")
        main_window.set_focus()
        # Primero intenta ir al inicio de la respuesta
        send_keys("{HOME}")
        time.sleep(0.5)
        send_keys("^a")  # Seleccionar todo
        time.sleep(0.5)
        send_keys("^c")  # Copiar
        time.sleep(WAIT_TIME_SHORT)
        response = pyperclip.paste()
        if response and response.strip():
            print("Respuesta copiada usando método genérico.")
            return response
    except Exception as e:
        print(f"Error en método genérico: {e}")
    
    print("No se pudo copiar la respuesta.")
    return ""

def create_workspace_file(folders):
    """
    Crea un archivo .code-workspace temporal que incluye múltiples carpetas.
    Retorna la ruta al archivo creado.
    """
    import json
    import tempfile
    
    workspace_data = {
        "folders": [{"path": folder} for folder in folders],
        "settings": {}
    }
    
    # Crear archivo temporal con extensión .code-workspace
    fd, workspace_path = tempfile.mkstemp(suffix='.code-workspace', 
                                         prefix='vscode_automation_')
    with os.fdopen(fd, 'w') as f:
        json.dump(workspace_data, f, indent=2)
    
    logger.info(f"Archivo workspace creado en: {workspace_path}")
    return workspace_path

def open_folder_in_vscode(folder_path, additional_folder=None):
    """
    Abre VS Code con una o varias carpetas.
    Retorna la instancia de la aplicación.
    """
    if additional_folder and USE_WORKSPACE_FILE:
        # Crear archivo workspace con ambas carpetas
        workspace_path = create_workspace_file([folder_path, additional_folder])
        cmd = f'"{VSCODE_EXECUTABLE_PATH}" "{workspace_path}"'
        logger.info(f"Abriendo VS Code con archivo workspace: {workspace_path}")
    elif additional_folder:
        # Abrir múltiples carpetas usando los argumentos de línea de comandos
        cmd = f'"{VSCODE_EXECUTABLE_PATH}" "{folder_path}" --add "{additional_folder}"'
        logger.info(f"Abriendo VS Code con carpetas: {folder_path} y {additional_folder}")
    else:
        # Abrir una sola carpeta
        cmd = f'"{VSCODE_EXECUTABLE_PATH}" "{folder_path}"'
        logger.info(f"Abriendo VS Code con carpeta: {folder_path}")
    
    return Application(backend="uia").start(cmd)

def read_devtools_script():
    """
    Lee el contenido del archivo JavaScript para ejecutar en DevTools.
    Retorna el contenido del archivo o un mensaje de error si no se puede leer.
    """
    try:
        if not os.path.exists(DEVTOOLS_SCRIPT_PATH):
            logger.error(f"El archivo de script DevTools no existe: {DEVTOOLS_SCRIPT_PATH}")
            return f"console.error('Error: No se encontró el archivo de script {DEVTOOLS_SCRIPT_PATH}');"
        
        with open(DEVTOOLS_SCRIPT_PATH, 'r', encoding='utf-8') as f:
            script_content = f.read()
        
        logger.info(f"Script DevTools leído correctamente desde {DEVTOOLS_SCRIPT_PATH}")
        return script_content
    except Exception as e:
        logger.error(f"Error al leer el archivo de script DevTools: {e}")
        return f"console.error('Error al leer el archivo de script: {e}');"

def open_devtools_and_run_script(main_window):
    """
    Abre las herramientas de desarrollador (DevTools) en VS Code
    y ejecuta un script JavaScript personalizado en la consola.
    """
    if not EXECUTE_DEVTOOLS_SCRIPT:
        logger.info("Ejecución de script en DevTools deshabilitada. Continuando...")
        return True

    logger.info("Intentando abrir DevTools y ejecutar script...")
    try:
        # Leer el script JavaScript del archivo
        devtools_script = read_devtools_script()
        
        # 1. Abrir DevTools con la paleta de comandos
        main_window.set_focus()
        time.sleep(WAIT_TIME_SHORT)
        
        # Presionar Ctrl+Shift+P para abrir la paleta de comandos
        send_keys("^+p")
        logger.info("Paleta de comandos abierta (Ctrl+Shift+P)")
        time.sleep(WAIT_TIME_SHORT)
        
        # Escribir el comando para abrir DevTools
        pyperclip.copy("Developer: Toggle Developer Tools")
        send_keys("^v")  # Pegar el comando
        time.sleep(WAIT_TIME_SHORT)
        
        # Presionar Enter para ejecutar el comando
        send_keys("{ENTER}")
        logger.info("Comando 'Developer: Toggle Developer Tools' ejecutado")
        time.sleep(WAIT_TIME_MEDIUM * 2)  # Mayor tiempo de espera para que se abran las DevTools
        
        # 2. Esperar a que las DevTools estén disponibles
        take_screenshot("devtools_opened", main_window)
        
        # 3. Cambiar a la pestaña Console con múltiples métodos
        logger.info("Intentando navegar a la pestaña Console...")
        
        # Método 1: Buscar la pestaña Console visualmente y hacer clic
        console_found = False
        for _ in range(3):
            try:
                # Capturar todos los elementos tipo pestaña
                tabs = main_window.children(control_type="TabItem")
                for tab in tabs:
                    tab_text = tab.window_text() if hasattr(tab, "window_text") else ""
                    if "console" in tab_text.lower():
                        tab.click_input()
                        logger.info(f"Pestaña de consola encontrada y seleccionada: '{tab_text}'")
                        console_found = True
                        break
                
                if console_found:
                    break
                
                # Si no encontramos la pestaña, intentar con atajos de teclado
                send_keys("^2")  # En algunos navegadores, Ctrl+2 selecciona la 2ª pestaña (Console)
                time.sleep(0.5)
            except Exception as e:
                logger.warning(f"Intento de seleccionar pestaña de consola falló: {e}")
                time.sleep(0.5)
        
        # Método 2: Si no se encuentra visualmente, intentar con combinaciones de teclas
        if not console_found:
            logger.info("Intentando seleccionar consola usando atajos de teclado...")
            # Atajo de teclado específico en DevTools de Chrome/Edge para ir a la consola
            send_keys("{ESC}")  # Primero ESC para cerrar cualquier diálogo
            time.sleep(0.5)
            send_keys("^+j")  # Ctrl+Shift+J - Atajo para ir directamente a la consola en DevTools
            time.sleep(WAIT_TIME_SHORT)
        
        # 4. Enfoque mejorado y ejecución directa del código
        logger.info("Enfocando la consola e insertando código directamente...")
        
        # Variable para rastrear si tuvimos éxito en insertar el código
        script_inserted = False
        
        # 4.1 Estrategia: Probar diferentes posiciones de clic hasta encontrar la consola
        screen_rect = pyautogui.size()
        devtools_bottom_half_y = screen_rect.height * 3 // 4
        
        # Posiciones donde probar: parte inferior central, varios puntos en la mitad inferior
        test_positions = [
            (screen_rect.width // 2, devtools_bottom_half_y),                   # Centro inferior
            (screen_rect.width // 2, devtools_bottom_half_y - 50),              # Centro, un poco arriba
            (screen_rect.width // 2, devtools_bottom_half_y - 100),             # Centro, más arriba
            (screen_rect.width // 4, devtools_bottom_half_y - 50),              # Izquierda 
            (3 * screen_rect.width // 4, devtools_bottom_half_y - 50)           # Derecha
        ]
        
        for pos_x, pos_y in test_positions:
            if script_inserted:
                break
                
            logger.info(f"Probando posición: ({pos_x}, {pos_y})")
            
            # Hacer clic en la posición de prueba
            pyautogui.click(pos_x, pos_y)
            time.sleep(0.5)
            
            # Presionar Tab un par de veces para intentar llegar al campo de entrada
            for _ in range(2):
                send_keys("{TAB}")
                time.sleep(0.3)
            
            # Intentar limpiar cualquier texto existente
            send_keys("^a")  # Seleccionar todo
            time.sleep(0.2)
            send_keys("{DEL}")  # Borrar
            time.sleep(0.3)
            
            # INSERCIÓN DIRECTA DEL CÓDIGO REAL: Ya que observamos que funcionó con el mensaje de prueba
            logger.info("Insertando código JavaScript directamente...")
            
            # Comprobar si el script es muy largo, si lo es, usar portapapeles
            if len(devtools_script) > 100:
                # Usar el portapapeles para scripts largos
                pyperclip.copy(devtools_script)
                send_keys("^v")
            else:
                # Para scripts cortos, escribir directamente carácter por carácter
                for char in devtools_script:
                    send_keys(char)
                    time.sleep(0.01)  # Pequeña pausa entre caracteres
            
            time.sleep(WAIT_TIME_SHORT)
            
            # Ejecutar el script presionando Enter
            send_keys("{ENTER}")
            logger.info("Script insertado y ejecutado")
            script_inserted = True
            
            # Tomar captura después de ejecutar
            take_screenshot(f"script_ejecutado_pos_{pos_x}_{pos_y}", main_window)
            time.sleep(WAIT_TIME_MEDIUM)
        
        # Si ninguna de las posiciones funcionó, intentar un método alternativo como último recurso
        if not script_inserted:
            logger.info("Intentando método alternativo de ejecución...")
            
            # Presionar algunas combinaciones adicionales para enfocar la consola
            send_keys("+{TAB}")  # Shift+Tab puede moverse al campo anterior
            time.sleep(0.3)
            send_keys("{TAB}")  # Tab para avanzar
            time.sleep(0.3)
            
            # Ejecutar un comando JavaScript más sencillo como fallback
            simple_script = "console.log('Método alternativo: Script de DevTools ejecutado');"
            
            # Escribir el script carácter por carácter
            for char in simple_script:
                send_keys(char)
                time.sleep(0.01)
            
            send_keys("{ENTER}")
            logger.info("Script alternativo ejecutado")
            take_screenshot("script_alternativo_ejecutado", main_window)
        
        # 5. Esperar un momento para que el script se ejecute completamente
        time.sleep(WAIT_TIME_MEDIUM)
        
        # 6. Cerrar DevTools
        logger.info("Cerrando DevTools...")
        send_keys("{ESC}")
        time.sleep(WAIT_TIME_SHORT)
        
        # En caso de que ESC no funcione, intentar con el comando de la paleta
        try:
            send_keys("^+p")
            time.sleep(WAIT_TIME_SHORT)
            pyperclip.copy("Developer: Toggle Developer Tools")
            send_keys("^v")
            time.sleep(WAIT_TIME_SHORT)
            send_keys("{ENTER}")
        except Exception as e:
            logger.warning(f"Error al cerrar DevTools con paleta de comandos: {e}")
        
        # --- NUEVO: Pulsar Ctrl+Shift+I tras cerrar DevTools ---
        logger.info("Pulsando Ctrl+Shift+I tras cerrar DevTools...")
        send_keys("^+i")
        time.sleep(WAIT_TIME_SHORT)
        
        logger.info("Proceso de ejecución de script en DevTools completado")
        return True
        
    except Exception as e:
        logger.error(f"Error al ejecutar script en DevTools: {e}")
        # Intentar cerrar DevTools en caso de error
        try:
            send_keys("{ESC}")
        except:
            pass
        return False

def automate_vscode_chat():
    """
    Automatiza la tarea de leer archivos, enviarlos a un chat en VS Code,
    y guardar las respuestas.
    """
    if not os.path.exists(VSCODE_EXECUTABLE_PATH):
        print(f"Error: No se encontró el ejecutable de VS Code en '{VSCODE_EXECUTABLE_PATH}'")
        return

    if not os.path.isdir(FOLDER_TO_PROCESS):
        print(f"Error: La carpeta de entrada '{FOLDER_TO_PROCESS}' no existe.")
        return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Directorio de salida '{OUTPUT_DIR}' creado.")

    app = None
    main_window = None

    try:
        # 1. Lanzar VS Code con la carpeta especificada y la carpeta adicional de contexto
        print(f"Lanzando VS Code con carpeta principal: {FOLDER_TO_PROCESS}")
        if ADDITIONAL_CONTEXT_FOLDER and os.path.isdir(ADDITIONAL_CONTEXT_FOLDER):
            print(f"Incluyendo carpeta adicional de contexto: {ADDITIONAL_CONTEXT_FOLDER}")
            app = open_folder_in_vscode(FOLDER_TO_PROCESS, ADDITIONAL_CONTEXT_FOLDER)
        else:
            print("Sin carpeta adicional de contexto.")
            app = open_folder_in_vscode(FOLDER_TO_PROCESS)
        
        time.sleep(WAIT_TIME_MEDIUM) # Esperar a que VS Code se cargue

        # 2. Conectarse a la ventana principal de VS Code
        folder_name = os.path.basename(FOLDER_TO_PROCESS)
        try:
            print(f"Intentando conectar a la ventana de VS Code (título que contiene '{folder_name}')...")
            main_window = app.connect(title_re=f".*{folder_name}.*Visual Studio Code.*", timeout=20).top_window()
        except ElementNotFoundError:
            print("No se pudo conectar a la ventana principal con el nombre de la carpeta.")
            print("Intentando conectar a cualquier ventana de VS Code...")
            main_window = app.connect(title_re=".*Visual Studio Code.*", timeout=20).top_window()
        
        # Maximizar la ventana de VS Code para una interfaz más consistente
        if MAXIMIZE_WINDOW:
            logger.info("Maximizando la ventana de VS Code...")
            try:
                if not main_window.is_maximized():
                    main_window.maximize()
            except Exception as e:
                logger.warning(f"No se pudo maximizar la ventana: {e}")

        # NUEVO: Ejecutar script en DevTools antes de continuar
        if EXECUTE_DEVTOOLS_SCRIPT:
            print("Ejecutando script en consola DevTools...")
            open_devtools_and_run_script(main_window)
            print("Script en DevTools completado.")

        # 3. Abrir la vista de Chat (ej. Copilot Chat)
        print("Intentando abrir la vista de chat (Ctrl+Alt+I)...")
        main_window.type_keys("^%i") # Ctrl+Alt+I - Atajo común para Copilot Chat
        time.sleep(WAIT_TIME_MEDIUM)

        # Descomenta la siguiente línea para ver todos los controles de la ventana
        # y encontrar los identificadores correctos para tu interfaz de VS Code
        # main_window.print_control_identifiers()

        # 4. Iterar sobre los archivos en la carpeta
        print(f"Procesando archivos en: {FOLDER_TO_PROCESS}")
        for filename in os.listdir(FOLDER_TO_PROCESS):
            filepath = os.path.join(FOLDER_TO_PROCESS, filename)
            if os.path.isfile(filepath):
                print(f"\nProcesando archivo: {filename}")

                try:
                    # a. Leer contenido del archivo
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if not content.strip():
                        print("Archivo vacío, saltando.")
                        continue

                    # b. Añadir contexto al chat (nuevo paso)
                    if not add_context_to_chat(main_window):
                        print("No se pudo añadir contexto. Continuando sin contexto...")

                    # c. Pegar contenido en el chat y enviar
                    pyperclip.copy(content)
                    print("Contenido copiado al portapapeles. Pegando en el chat...")
                    main_window.set_focus()
                    time.sleep(WAIT_TIME_SHORT)
                    
                    # Buscar el área de entrada del chat
                    # Esta parte puede necesitar ajustes según tu interfaz específica
                    try:
                        # Intenta primero encontrar un campo de edición específico para el chat
                        chat_input = main_window.child_window(title_re=".*chat.*", control_type="Edit", found_index=0)
                        chat_input.click_input()
                    except:
                        print("No se encontró un campo específico de chat, usando método genérico...")
                        # Si no podemos encontrar un control específico, simplemente intentamos pegar
                        # asumiendo que el focus ya está en el lugar correcto después de abrir el chat
                        pass
                    
                    # Pegar el contenido y enviar
                    send_keys("^v") # Ctrl+V para pegar
                    time.sleep(WAIT_TIME_SHORT)
                    send_keys("{ENTER}")
                    print("Contenido enviado. Esperando respuesta...")
                    
                    # d. Esperar respuesta (método mejorado)
                    wait_for_chat_response(main_window)
                    time.sleep(WAIT_TIME_SHORT)  # Espera adicional para asegurar que todo el texto se ha cargado

                    # e. Copiar la respuesta (método mejorado)
                    response_text = copy_chat_response(main_window)

                    if not response_text or response_text.strip() == content.strip():
                        print("No se pudo obtener una respuesta diferente del contenido original.")
                        response_text = "No se pudo obtener respuesta."
                    else:
                        print("Respuesta copiada correctamente.")

                    # f. Guardar respuesta
                    output_filename = os.path.join(OUTPUT_DIR, f"respuesta_{os.path.splitext(filename)[0]}.txt")
                    with open(output_filename, 'w', encoding='utf-8') as f:
                        f.write(response_text)
                    print(f"Respuesta guardada en: {output_filename}")
                    time.sleep(WAIT_TIME_SHORT)  # Espera adicional para asegurar que todo el texto se ha cargado
                except Exception as e:
                    print(f"Error procesando el archivo {filename}: {e}")
                    continue

        print("\nProceso completado.")
    except ElementNotFoundError as e:
        print(f"Error: No se pudo encontrar la ventana de VS Code o un elemento esencial: {e}")
    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}")

def create_reference_images_guide():
    """
    Crea un archivo HTML con instrucciones sobre cómo capturar y guardar
    imágenes de referencia para mejorar la precisión del script.
    """
    guide_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reference_images_guide.html")
    guide_content = """<!DOCTYPE html>
    <html>
    <head>
        <title>Guía para crear imágenes de referencia</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1, h2 { color: #333; }
            .step { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
            .note { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffd700; }
            code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            img { max-width: 100%; border: 1px solid #ddd; margin: 10px 0; }
        </style>
    </head>
    <body>
        <h1>Guía para crear imágenes de referencia para la automatización</h1>
        <div class="note">
            <p>Esta guía te ayudará a capturar imágenes de referencia de elementos UI de VS Code
            que pueden mejorar la precisión del script de automatización mediante reconocimiento de imágenes.</p>
        </div>
        <h2>Elementos que necesitas capturar:</h2>
        <div class="step">
            <h3>1. Botón "Add Context..."</h3>
            <p>Captura una imagen clara del botón "Add Context..." en la interfaz de chat de VS Code.</p>
            <p>Guarda la imagen como: <code>add_context_button.png</code></p>
        </div>
        <div class="step">
            <h3>2. Opción de menú "Files & Folders"</h3>
            <p>Después de hacer clic en "Add Context...", captura la opción de menú "Files & Folders".</p>
            <p>Guarda la imagen como: <code>files_folders_option.png</code></p>
        </div>
        <div class="step">
            <h3>3. Campo de entrada de chat</h3>
            <p>Captura el campo de entrada donde se escribe en el chat.</p>
            <p>Guarda la imagen como: <code>chat_input_field.png</code></p>
        </div>
        <div class="step">
            <h3>4. Botón "Send" (cuando está activo)</h3>
            <p>Captura el botón de envío cuando está listo para enviar un mensaje.</p>
            <p>Guarda la imagen como: <code>send_button.png</code></p>
        </div>
        <div class="step">
            <h3>5. Botón "Cancel" (cuando está generando respuesta)</h3>
            <p>Captura el botón cuando cambia a "Cancel" durante la generación.</p>
            <p>Guarda la imagen como: <code>cancel_button.png</code></p>
        </div>
        <div class="step">
            <h3>6. Botón "Copy code" en bloques de código</h3>
            <p>Captura el botón que aparece en la esquina de los bloques de código para copiarlos.</p>
            <p>Guarda la imagen como: <code>copy_code_button.png</code></p>
        </div>
        <h2>Cómo capturar estas imágenes:</h2>
        <ol>
            <li>Usa la herramienta de recorte de Windows (<code>Win + Shift + S</code>) para capturar solo el elemento UI específico.</li>
            <li>Asegúrate de capturar con suficiente contexto visual para que sea identificable, pero no demasiado.</li>
            <li>Guarda las imágenes en la carpeta <code>reference_images</code>.</li>
            <li>Para mejores resultados, haz las capturas con VS Code en el mismo tema/apariencia que usarás durante la automatización.</li>
        </ol>
        <div class="note">
            <p><strong>Importante:</strong> Para que el reconocimiento de imágenes funcione correctamente, 
            VS Code debe tener exactamente la misma apariencia (tema, tamaño) durante la automatización
            que cuando capturaste las imágenes de referencia.</p>
        </div>
    </body>
    </html>
    """
    with open(guide_path, "w", encoding="utf-8") as f:
        f.write(guide_content)
    return guide_path

# Al final del archivo, añadir la opción de generar la guía para imágenes de referencia
if __name__ == "__main__":
    print("--- Iniciando automatización de VS Code Chat ---")
    print("IMPORTANTE: Ajusta las rutas en la sección de configuración antes de ejecutar.")
    print("Para encontrar los identificadores correctos de los elementos de la UI, puedes usar:")
    print("main_window.print_control_identifiers()")

    # Verificar si las rutas predeterminadas han sido modificadas
    if FOLDER_TO_PROCESS == r"C:\ruta\a\tu\carpeta\de\entrada" or \
       OUTPUT_DIR == r"C:\ruta\a\tu\carpeta\de\salida":
        print("\n¡ATENCIÓN! Las rutas predeterminadas no han sido cambiadas.")
        print("Por favor, edita el script y actualiza las siguientes variables:")
        print("- FOLDER_TO_PROCESS: ruta a la carpeta con los archivos a procesar")
        print("- OUTPUT_DIR: ruta donde guardar las respuestas")
        choice = input("¿Deseas continuar de todos modos? (s/N): ")
        if choice.lower() != 's':
            print("Script abortado. Actualiza las rutas e inténtalo de nuevo.")
            exit()
    
    # Verificar si el archivo de script DevTools existe
    if EXECUTE_DEVTOOLS_SCRIPT and not os.path.exists(DEVTOOLS_SCRIPT_PATH):
        print(f"\n¡ADVERTENCIA! El archivo de script DevTools no existe: {DEVTOOLS_SCRIPT_PATH}")
        print("Se esperaba un archivo JavaScript para ejecutar en la consola DevTools.")
        choice = input("¿Deseas continuar sin ejecutar el script DevTools? (s/N): ")
        if choice.lower() != 's':
            print("Script abortado. Crea el archivo de script e inténtalo de nuevo.")
            exit()
        EXECUTE_DEVTOOLS_SCRIPT = False
    
    # Asegurar que exista el directorio para imágenes de referencia
    if USE_IMAGE_RECOGNITION and not os.path.exists(REFERENCE_IMAGES_DIR):
        os.makedirs(REFERENCE_IMAGES_DIR)
        guide_path = create_reference_images_guide()
        print(f"\nSe ha creado una guía para capturar imágenes de referencia en: {guide_path}")
        print("Por favor, sigue las instrucciones para mejorar la precisión del script.")
    
    automate_vscode_chat()
