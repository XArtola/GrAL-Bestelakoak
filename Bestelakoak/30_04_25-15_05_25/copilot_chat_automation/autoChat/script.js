/**
 * VS Code Explorer Scraper Script - Modificado
 *
 * Este script intenta:
 * 1. Encontrar una carpeta llamada "prompts".
 * 2. Si está colapsada, intenta expandirla y pide re-ejecución.
 * 3. Si está expandida, busca archivos .txt en su interior.
 * 4. Hace clic en los archivos .txt encontrados dentro de "prompts".
 *
 * CÓMO USAR:
 * 1. Abre VS Code.
 * 2. Asegúrate de que la vista del Explorador esté visible.
 * 3. Abre las Herramientas de Desarrollo (Ayuda > Alternar herramientas de desarrollo).
 * 4. Selecciona la pestaña "Consola".
 * 5. Copia y pega este script completo en la consola y presiona Enter.
 *
 * DISCLAIMER:
 * - Depende de la estructura interna del DOM de VS Code, que puede cambiar.
 * - Solo procesa elementos VISIBLES. Si "prompts" o sus .txt no son visibles, no funcionará.
 * - Si "prompts" está colapsada, el script intentará expandirla. Deberás
 * volver a ejecutar el script DESPUÉS de que se haya expandido.
 * - Usar con precaución.
 */
// Modificación para hacer visible el scrollbar antes de interactuar con él
(async function() {
    console.log("Intentando escanear elementos visibles en el Explorador y buscar 'prompts'...");

    const explorerRowsContainerSelector = "#workbench\\.view\\.explorer > div > div > div.monaco-scrollable-element > div.split-view-container > div:nth-child(1) > div > div.pane-body > div > div > div > div.monaco-list-rows";
    const scrollerSelector = "#workbench\\.view\\.explorer > div > div > div.monaco-scrollable-element > div.split-view-container > div:nth-child(1) > div > div.pane-body > div > div > div > div.invisible.scrollbar.vertical.fade > div";

    const rowsContainer = document.querySelector(explorerRowsContainerSelector);
    const scroller = document.querySelector(scrollerSelector);

    if (!rowsContainer || !scroller) {
        console.error("No se pudo encontrar el contenedor de filas o el scroller vertical del Explorador. El selector podría estar desactualizado.");
        console.log("Por favor, asegúrate de que la vista del Explorador esté visible y tenga contenido.");
        return;
    }

    // Hacer visible el scrollbar simulando un evento hover
    const sliderParent = scroller.parentElement;
    if (sliderParent) {
        sliderParent.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    }

    const items = () => Array.from(rowsContainer.querySelectorAll('div[role="treeitem"]'));

    if (items().length === 0) {
        console.log("No se encontraron elementos en el contenedor de filas del Explorador.");
        return;
    }

    let promptsFolderItem = null;
    let promptsFolderLevel = -1;
    let promptsFolderExpanded = false;
    let promptsFolderIndex = -1;

    // Fase 1: Encontrar la carpeta "prompts" y verificar si está expandida
    for (let i = 0; i < items().length; i++) {
        const item = items()[i];
        const name = item.getAttribute('aria-label');
        const isFolder = item.getAttribute('aria-expanded') !== null; // true o false si es carpeta, null si es archivo

        if (isFolder && name && name.toLowerCase() === 'prompts') {
            promptsFolderItem = item;
            promptsFolderLevel = parseInt(item.getAttribute('aria-level')) || 1;
            promptsFolderExpanded = item.getAttribute('aria-expanded') === 'true';
            promptsFolderIndex = i;
            console.log(`Carpeta 'prompts' encontrada. Nivel: ${promptsFolderLevel}, Expandida: ${promptsFolderExpanded}`);
            break;
        }
    }

    if (!promptsFolderItem) {
        console.log("La carpeta 'prompts' no se encontró entre los elementos visibles.");
        return;
    }

    if (!promptsFolderExpanded) {
        console.log("La carpeta 'prompts' está colapsada. Intentando hacer clic para expandirla...");
        promptsFolderItem.click(); // Simula el clic para expandir
        console.log("Se hizo clic en 'prompts'. Por favor, espera a que se expanda y VUELVE A EJECUTAR EL SCRIPT para procesar su contenido.");
        return;
    }

    // Function to programmatically scroll the container
    async function scrollContainer(container, step = 100, delay = 500) {
        let previousScrollTop = -1;
        while (container.scrollTop !== previousScrollTop) {
            previousScrollTop = container.scrollTop;
            container.scrollBy(0, step); // Scroll down by 'step' pixels
            await new Promise(resolve => setTimeout(resolve, delay)); // Wait for 'delay' ms
        }
    }

    // Ensure all elements are visible by scrolling the container
    console.log("Asegurándose de que todos los elementos sean visibles...");
    await scrollContainer(rowsContainer, 100, 300); // Adjusted delay for smoother scrolling

    // Refine logic to detect and process elements
    console.log("Buscando archivos .txt en la carpeta 'prompts'...");
    let foundTxtFiles = false;

    for (let i = promptsFolderIndex + 1; i < items().length; i++) {
        const currentItem = items()[i];
        const currentName = currentItem.getAttribute('aria-label');
        const currentLevel = parseInt(currentItem.getAttribute('aria-level')) || 1;

        if (currentLevel <= promptsFolderLevel) {
            console.log("Se ha salido del ámbito de la carpeta 'prompts'.");
            break;
        }

        if (currentLevel === promptsFolderLevel + 1 && currentName && currentName.endsWith('.txt')) {
            console.log(`Archivo .txt encontrado: ${currentName}. Haciendo clic...`);
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Ensure the item is visible
            currentItem.click(); // Simulate click
            await new Promise(resolve => setTimeout(resolve, 200)); // Pause to ensure the click is processed
            foundTxtFiles = true;
        }
    }

    if (!foundTxtFiles) {
        console.log("No se encontraron archivos .txt visibles dentro de la carpeta 'prompts'.");
    }

    console.log("--------------------------------------------------");
    console.log("Escaneo y acciones en 'prompts' completados.");

})();
