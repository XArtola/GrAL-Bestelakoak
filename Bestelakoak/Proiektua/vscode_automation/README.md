# Automatización de VS Code con Copilot Chat

Este proyecto automatiza la interacción con GitHub Copilot Chat en Visual Studio Code para procesar múltiples prompts y guardar las respuestas.

## Estructura del Proyecto

```
vscode_automation/
├── pywinauto_lite/
│   ├── automate_prompt_execution.py    # Script principal de automatización
│   └── copilotTimer.js                 # Script para medir tiempos de respuesta
├── prompts/                            # Carpeta con archivos de prompts (.txt)
├── Hustuta/                           # Workspace de VS Code (proyecto Cypress)
└── output_[llm_name]/                 # Carpetas de salida generadas automáticamente
```

## Requisitos Previos

### Software Necesario
- **Python 3.7+** con las siguientes librerías:
  - `pywinauto`
  - `pyperclip`
  - `psutil`
- **Visual Studio Code** con la extensión de GitHub Copilot instalada
- **Windows** (el script está optimizado para Windows)

### Instalación de Dependencias
```bash
pip install pywinauto pyperclip psutil
```

## Configuración

### 1. Configuración de Rutas
⚠️ **IMPORTANTE**: Debes configurar manualmente la ruta de VS Code en el archivo `automate_prompt_execution.py`:

```python
# En la sección CONFIGURATION VARIABLES, modifica esta línea:
vscode_path = r"C:\Users\TU_USUARIO\AppData\Local\Programs\Microsoft VS Code\Code.exe"
```

Rutas comunes de VS Code:
- **Instalación para usuario**: `C:\Users\[USUARIO]\AppData\Local\Programs\Microsoft VS Code\Code.exe`
- **Instalación del sistema**: `C:\Program Files\Microsoft VS Code\Code.exe`
- **VS Code Insiders**: `C:\Users\[USUARIO]\AppData\Local\Programs\Microsoft VS Code Insiders\Code - Insiders.exe`

### 2. Estructura de Archivos
- Coloca tus archivos de prompts (`.txt`) en la carpeta `prompts/`
- Asegúrate de que el proyecto Cypress esté en la carpeta `Hustuta/`
- El script `copilotTimer.js` debe estar en `pywinauto_lite/`

### 3. Configuración de VS Code
- Inicia sesión en GitHub Copilot
- Asegúrate de que la extensión Copilot Chat esté activa

#### Configuración de Atajo de Teclado (OBLIGATORIO)
⚠️ **REQUERIDO**: Debes configurar un atajo de teclado personalizado para que el script funcione correctamente:

1. Abre VS Code
2. Ve a **File → Preferences → Keyboard Shortcuts** o presiona `Ctrl + K` seguido de `Ctrl + S`
3. En la barra de búsqueda, escribe: `workbench.action.chat.openAsk`
4. Haz clic en el ícono de lápiz (editar) junto al comando
5. Presiona la combinación: `Ctrl + Alt + N`
6. Presiona Enter para confirmar

Este atajo permite al script abrir correctamente el panel de Copilot Chat.

- Cierra cualquier instancia previa de VS Code antes de ejecutar el script

## Uso del Script

### Sintaxis Básica
```bash
python pywinauto_lite/automate_prompt_execution.py <llm_index>
```

### Parámetros
- `llm_index`: Índice del LLM a usar (0-10)
  - 0: claude_3_5_sonnet
  - 1: claude_3_7_sonnet
  - 2: claude_3_7_sonnet_thinking
  - 3: claude_sonnet_4
  - 4: gemini_2_0_flash
  - 5: gemini_2_5_pro_preview
  - 6: GPT_4_1
  - 7: GPT_4o
  - 8: o1_preview
  - 9: o3_mini
  - 10: o4_mini_preview

### Ejemplos de Uso
```bash
# Usar Claude 3.5 Sonnet (índice 0)
python pywinauto_lite/automate_prompt_execution.py 0

# Usar GPT-4o (índice 7)
python pywinauto_lite/automate_prompt_execution.py 7

# Usar Gemini 2.0 Flash (índice 4)
python pywinauto_lite/automate_prompt_execution.py 4
```

## Funcionamiento del Script

### Proceso Automático
1. **Inicio**: Abre VS Code con el workspace configurado
2. **Configuración**: Maximiza la ventana y configura el entorno
3. **Script de Timing**: Ejecuta `copilotTimer.js` para medir tiempos de respuesta
4. **Procesamiento de Prompts**:
   - Lee cada archivo `.txt` de la carpeta `prompts/`
   - Abre Copilot Chat (`Ctrl+Alt+I`)
   - Limpia el input (`Ctrl+L`)
   - Agrega referencia al workspace (`#cypress-realworld-app`)
   - Envía el contenido del prompt
   - Espera la respuesta (120 segundos por defecto)
   - Guarda la respuesta usando `/save`
   - Copia y guarda el contenido en archivo de salida
5. **Finalización**: Extrae métricas de timing y genera archivos de log

### Archivos de Salida
Para cada ejecución se genera:
- **Carpeta**: `output_[llm_name]/`
- **Respuestas**: `[nombre_prompt]_response_[llm_name]_[timestamp].txt`
- **Timestamps**: `timestamps_[llm_name]_[fecha].json`
- **Métricas de Timing**: `copilot_timings_[llm_name]_[timestamp].json`

## Configuración Avanzada

### Modificar Tiempos de Espera
En `automate_prompt_execution.py`:
```python
wait_time = 2           # Tiempo básico de espera (segundos)
long_wait_time = 120    # Tiempo de espera para respuestas (segundos)
```

### Cambiar Resolución de Pantalla
```python
screen_width = 1920     # Ancho de pantalla
screen_height = 1080    # Alto de pantalla
```

### Agregar Nuevos LLMs
Modifica la lista `LLM_NAMES`:
```python
LLM_NAMES = [
    "claude_3_5_sonnet",
    "nuevo_llm_aqui",
    # ... otros LLMs
]
```

## Solución de Problemas

### Errores Comunes

**"Could not find VS Code main window"**
- Cierra todas las instancias de VS Code antes de ejecutar
- Verifica que la ruta de VS Code sea correcta
- Asegúrate de tener permisos de administrador

**"Target element not found"**
- Verifica que Copilot Chat esté disponible
- Revisa que estés logueado en GitHub Copilot
- Espera unos segundos después de abrir VS Code

**"Error reading file"**
- Verifica que los archivos de prompts existan en `prompts/`
- Confirma que los archivos tengan extensión `.txt`
- Revisa los permisos de lectura

### Tips de Uso
- **No interactúes** con VS Code mientras el script está ejecutándose
- **Mantén la ventana visible** - no minimices ni cambies de ventana
- **Ten paciencia** - cada prompt puede tomar hasta 2 minutos en procesarse
- **Revisa los logs** - el script proporciona información detallada en consola

## Limitaciones

- Solo funciona en Windows
- Requiere que VS Code esté en primer plano
- No maneja errores de red o timeouts de Copilot
- El timing puede variar según la carga del servidor

## Monitoreo

### Logs en Tiempo Real
El script muestra progreso en consola:
```
[1/3] Starting Visual Studio Code...
[1/3] ✅ Main window found: 'Hustuta - Visual Studio Code'
[1/3] Processing file 1/3: auth1.spec.txt
[1/3] Sending prompt content to chat...
[1/3] ✅ Content saved successfully: output_claude_3_5_sonnet/auth1_response_claude_3_5_sonnet_20250115_143022.txt
```

### Archivos de Métricas
Los archivos JSON contienen:
- Timestamps de envío y recepción
- Duración de procesamiento
- Información de archivos procesados

## Soporte

Para problemas o mejoras, revisa:
1. Los logs de consola para errores específicos
2. Los archivos de salida para verificar que se guardaron correctamente
3. Las métricas de timing para optimizar los tiempos de espera

---

**Nota**: Este script está diseñado para uso en investigación y automatización de pruebas. Úsalo responsablemente respetando los términos de servicio de GitHub Copilot.
