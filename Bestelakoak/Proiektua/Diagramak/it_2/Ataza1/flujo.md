flowchart TD
    A[Script Initialization] --> B[Wait for Target Element]
    B --> C{Target Found?}
    C -->|No| D[Retry After Interval]
    D --> C
    C -->|Yes| E[Create Timer Display]
    E --> F[Setup MutationObserver]
    F --> G[Monitor DOM Changes]
    
    G --> H{Copilot State Change?}
    H -->|No| G
    H -->|Yes| I{Working State Detected?}
    
    I -->|Yes| J[Start Timer]
    J --> K[Record Start Time]
    K --> L[Update Display Every 60ms]
    L --> M[Monitor for State Change]
    
    I -->|No| N{Timer Running?}
    N -->|Yes| O[Stop Timer]
    O --> P[Calculate Duration]
    P --> Q[Store Session Data]
    Q --> R[Reset Timer State]
    R --> G
    
    N -->|No| G
    M --> S{Still Working?}
    S -->|Yes| L
    S -->|No| O
    
    T[Console Access] --> U[getCopilotTimings Function]
    U --> V[Display Stored Data]