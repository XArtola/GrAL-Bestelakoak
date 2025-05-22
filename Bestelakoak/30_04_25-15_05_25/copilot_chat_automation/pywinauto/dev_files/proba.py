import time
from pywinauto import Application, keyboard
from pywinauto.timings import wait_until_passes

# Conectarse a la ventana principal de VSCode
app = Application(backend='uia').connect(title_re=".*Visual Studio Code.*", active_only=True)
main_window = app.window(title_re=".*Visual Studio Code.*")

# Enviar Ctrl + F4 para cerrar la pestaña activa
keyboard.send_keys('^{F4}')  # Ctrl + F4

# Esperar a que aparezca el diálogo de confirmación
try:
    # Función para buscar el botón "Don't Save"
    def find_dont_save_button():
        dlg = app.window(title_re=".*Visual Studio Code.*")
        return dlg.child_window(title="Don't Save", control_type="Button")

    # Espera hasta 5 segundos a que aparezca
    dont_save_button = wait_until_passes(
        timeout=5,
        retry_interval=0.5,
        func=find_dont_save_button
    )

    # Hacer clic en "Don't Save"
    dont_save_button.click_input()
    print("✅ Botón 'Don't Save' pulsado exitosamente.")

except Exception as e:
    print("❌ No se encontró el botón 'Don't Save':", e)
