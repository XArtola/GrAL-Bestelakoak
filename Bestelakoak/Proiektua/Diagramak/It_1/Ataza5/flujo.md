flowchart TD
    A[Inicio del script] --> B[Validar argumentos CLI]
    B --> C{¿3 argumentos válidos?}
    C -->|No| D[Error: Mostrar uso correcto]
    C -->|Sí| E[Resolver rutas absolutas]
    E --> F[Cargar información de usuarios JSON]
    F --> G{¿Archivo JSON existe?}
    G -->|No| H[Advertencia: USER_INFO vacío]
    G -->|Sí| I[Parsear JSON]
    I --> J[Crear directorio de salida]
    H --> J
    J --> K[Buscar archivos .spec.ts]
    K --> L{¿Archivos encontrados?}
    L -->|No| M[Info: No hay archivos]
    L -->|Sí| N[Procesar cada archivo]
    N --> O[Leer contenido del archivo]
    O --> P[Determinar clave userInfo]
    P --> Q[Buscar datos de usuario]
    Q --> R[Sustituir placeholders en template]
    R --> S[Generar archivo .spec.txt]
    S --> T{¿Más archivos?}
    T -->|Sí| N
    T -->|No| U[Fin del proceso]
    D --> V[Exit 1]