import nvdaapi
import webbrowser


url = "https://www.example.com"  # Reemplazar con la URL de la página web
encontrar_elementos_interactuables(url)

def encontrar_elementos_interactuables(url):
    # Abrir la página web en el navegador
    webbrowser.open(url)

    # Obtener la aplicación de NVDA
    app = nvdaapi.Application()

    # Obtener el objeto raíz de la interfaz de usuario
    root_object = app.objects.root

    # Lista para almacenar los elementos interactuables
    elementos_interactuables = []

    # Recorrer los objetos de la interfaz de usuario
    for obj in root_object.children:
        # Verificar si el objeto es interactuable
        if obj.role == nvdaapi.Role.ROLE_BUTTON or \
           obj.role == nvdaapi.Role.ROLE_LINK or \
           obj.role == nvdaapi.Role.ROLE_EDITABLE_TEXT:
            # Obtener el nombre del elemento
            nombre_elemento = obj.name

            # Obtener la descripción del elemento
            descripcion_elemento = obj.description

            # Añadir el elemento a la lista
            elementos_interactuables.append({
                "nombre": nombre_elemento,
                "descripcion": descripcion_elemento
            })

    # Imprimir la lista de elementos interactuables
    for elemento in elementos_interactuables:
        print(f"Nombre: {elemento['nombre']}")
        print(f"Descripción: {elemento['descripcion']}")
        print("---------------------------------")
