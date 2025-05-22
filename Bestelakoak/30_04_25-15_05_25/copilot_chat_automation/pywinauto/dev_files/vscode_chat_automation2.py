import time
import psutil
import subprocess
import traceback
from pywinauto.application import Application
from pywinauto import Desktop
from pywinauto.keyboard import send_keys
import pyperclip

# --- Configuración ---
# Contenido del archivo auth1.spec.txt
auth1_spec_content = """This is the text to be pasted in the chat window. The text in auth1.spec.txt

You are tasked with generating the code inside the 'it' blocks for a Cypress test suite. The test suite is for user sign-up and login functionality. You will be provided with the test suite structure and user information to use in your generated code.

Here is the Cypress test code structure:

<cypress_test_code>
import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";
const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;
describe("User Sign-up and Login", function () {
    beforeEach(function () {
        cy.task("db:seed");
        cy.intercept("POST", "/users").as("signup");
        cy.intercept("POST", apiGraphQL, (req) => {
            const { body } = req;
            if (body.hasOwnProperty("operationName") && body.operationName === "CreateBankAccount") {
                req.alias = "gqlCreateBankAccountMutation";
            }
        });
    });
    it("should redirect unauthenticated user to signin page", () => { });
});

</cypress_test_code>

And here is the user information to use in your tests:

<user_info>
{
  "userInfo": {
    "firstName": "Bob",
    "lastName": "Ross",
    "username": "PainterJoy90",
    "password": "s3cret"
  },
  "bankAccountInfo": {
    "bankName": "The Best Bank",
    "accountNumber": "123456789",
    "routingNumber": "987654321"
  },
  "loginCredentials": {
    "validPassword": "s3cret",
    "invalidUsername": "invalidUserName",
    "invalidPassword": "invalidPa$word",
    "anotherInvalidPassword": "INVALID"
  }
}
</user_info>

Your task is to generate the code inside each 'it' block so that the Cypress test runs and gets positive results. Follow these guidelines:

1. For each 'it' block, write Cypress commands that test the functionality described in the test name.
2. Use the provided user information (firstName, lastName, username, password) in your test commands where appropriate.
3. Ensure that your generated code follows Cypress best practices and conventions.
4. Include appropriate assertions to verify the expected behavior of each test.
5. If a test requires multiple steps, use comments to explain each step.
6. Do not modify the existing code structure or add new 'it' blocks.

When using the user information, refer to it as 'userInfo' followed by the property name, e.g., 'userInfo.firstName'.

If you encounter any scenarios where you need additional information that isn't provided, do not make assumptions. Instead, indicate that more information is needed for that specific test.

For error handling tests, use invalid data that is clearly different from the provided user information.

Place your generated code for each 'it' block within <generated_code> tags, and include the original 'it' block description as a comment before each block of generated code.

Begin generating the code for each 'it' block now.
Dont type it. Paste the whole text at once"""

# Tiempos de espera
wait_time = 2  # Tiempo de espera normal (segundos)
long_wait_time = 60  # Tiempo de espera largo (1 minuto)

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
        send_keys_safely("{ENTER}")
        time.sleep(wait_time)
        
        # 5. Esperar a la respuesta
        print(f"Esperando {long_wait_time} segundos para que se genere la respuesta...")
        time.sleep(long_wait_time)
        
        # 6. Guardar el contenido
        print("Guardando el contenido...")
        save_content(main_window, send_keys_safely)
        
        # 7. Seleccionar y guardar el resultado en un archivo
        save_response_to_file(main_window, send_keys_safely)
        
        # 8. Cerrar la ventana y manejar el diálogo de guardar
        print("Cerrando la ventana actual...")
        send_keys_safely("^w")
        time.sleep(wait_time)
        
        # 9. Manejar el diálogo de guardar cambios
        cerrar_dialogo_guardar_vscode()
        
        # 10. Limpiar el chat
        clear_chat(send_keys_safely)
        
        print("Automatización completada con éxito.")
        
    except Exception as e:
        print(f"Ocurrió un error: {e}")
        traceback.print_exc()
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
    try:
        contenido = pyperclip.paste()
        print(f"Copiados {len(contenido)} caracteres")
        
        archivo_salida = "contenido_guardado.txt"
        with open(archivo_salida, "w", encoding="utf-8") as f:
            f.write(contenido)
        print(f"Contenido guardado en: {archivo_salida}")
    except Exception as e:
        print(f"Error guardando el contenido: {e}")

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

if __name__ == "__main__":
    automate_vscode()
