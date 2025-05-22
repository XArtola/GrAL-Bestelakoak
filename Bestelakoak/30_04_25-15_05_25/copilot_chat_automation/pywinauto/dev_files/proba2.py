import time
from pywinauto import Application, keyboard
from pywinauto.timings import wait_until_passes

# Conectarse a la ventana principal de VSCode
app = Application(backend='uia').connect(title_re=".*Visual Studio Code$", class_name="Chrome_WidgetWin_1", top_level_only=True, visible_only=True)
main_window = app.window(title_re=".*Visual Studio Code$", class_name="Chrome_WidgetWin_1", top_level_only=True, visible_only=True)

# Enviar Ctrl + F4 para cerrar la pestaña activa
keyboard.send_keys('^{{F4}}')  # Ctrl + F4

# Esperar a que aparezca el diálogo de confirmación
try:
    # Función para buscar el botón "Don't Save"
    def find_dont_save_button():
        # The "Don't Save" dialog is expected to be the top-most window of the app
        save_dialog = app.top_window()
        return save_dialog.child_window(title="Don't Save", control_type="Button")

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
