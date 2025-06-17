flowchart TD
    A[Inicio] --> B[Recibir directorio objetivo como argumento]
    B --> C{¿Existe directorio 'cypress'?}
    C -->|No| D[Error: cypress no encontrado]
    C -->|Sí| E[Buscar archivos recursivamente]
    E --> F{¿Es archivo .spec.ts/.spec.js?}
    F -->|No| G[Continuar con siguiente archivo]
    F -->|Sí| H[Crear SourceFile con TypeScript API]
    H --> I[Aplicar transformación AST]
    I --> J[Buscar llamadas a función 'it()']
    J --> K[Reemplazar contenido con bloque vacío]
    K --> L[Generar código modificado]
    L --> M[Sobrescribir archivo original]
    M --> N[Log: archivo procesado]
    N --> O{¿Más archivos?}
    O -->|Sí| E
    O -->|No| P[Fin]
    G --> O
    D --> Q[Exit 1]


flowchart TD
    A[Nodo AST actual] --> B{¿Es CallExpression?}
    B -->|No| C[Visitar nodos hijos]
    B -->|Sí| D{¿Es Identifier?}
    D -->|No| C
    D -->|Sí| E{¿Texto = 'it'?}
    E -->|No| C
    E -->|Sí| F{¿>= 2 argumentos?}
    F -->|No| C
    F -->|Sí| G[BLOQUE IT ENCONTRADO]
    G --> H[Extraer descripción arg[0]]
    H --> I[Crear bloque vacío {}]
    I --> J[Crear nueva arrow function]
    J --> K[Crear nueva CallExpression]
    K --> L[Retornar nodo transformado]
    C --> M[Continuar recorrido AST]
    L --> M