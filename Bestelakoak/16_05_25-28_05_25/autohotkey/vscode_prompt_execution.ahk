#Requires AutoHotkey v2.0

#SingleInstance Force
SendMode("Input")
SetWorkingDir(A_ScriptDir)

; === Configuration ===
; Paths
PromptFile := "C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\30_04_25-15_05_25\preparePrompts\prompts\auth1.spec.txt"
PromptFolder := "C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\30_04_25-15_05_25\preparePrompts\prompts"
WorkspaceFolder := "C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\01_04_25-15_04_25\Hustuta"
DevToolsScript := "C:\Users\xabia\OneDrive\Documentos\4.Maila\TFG-Bestelakoak\Bestelakoak\VsCode\pywinauto\copilotTimer2.js"
VSCodePath := "C:\Users\xabia\AppData\Local\Programs\Microsoft VS Code\Code.exe"

; LLM Names
LLMNames := ["claude_3_5_sonnet", "claude_3_7_sonnet", "claude_3_7_sonnet_thinking", "claude_sonnet_4", "gemini_2_0_flash", "gemini_2_5_pro_preview", "GPT_4_1", "GPT_4o", "o1_preview", "o3_mini", "o4_mini_preview"]

; Global Variables
CurrentFileIndex := 0
TotalFilesCount := 1
TimestampsData := []
WaitTime := 2000 ; milliseconds
LongWaitTime := 120000 ; 2 minutes
LLMIndex := 0
LLMName := ""
OutputFolder := ""

; Parse command line arguments
if (A_Args.Length > 0) {
    LLMIndex := A_Args[1]
    if (LLMIndex >= 1 && LLMIndex <= LLMNames.Length) {
        LLMName := LLMNames[LLMIndex]
    } else {
        LLMName := "llm" . LLMIndex
    }
} else {
    LLMName := "claude_3_5_sonnet"
}

OutputFolder := "output_" . LLMName
DirCreate(OutputFolder)

; === Utility Functions ===
Log(message) {
    global CurrentFileIndex, TotalFilesCount
    prefix := CurrentFileIndex > 0 ? "[" . CurrentFileIndex . "/" . TotalFilesCount . "] " : ""
    OutputDebug(prefix . message)
    FileAppend(prefix . message . "`n", "automation_log.txt")
}

GetTimestamp() {
    return FormatTime(, "yyyy-MM-dd HH:mm:ss.fff")
}

ReadFile(filepath) {
    try {
        return FileRead(filepath)
    } catch {
        Log("Error reading file: " . filepath)
        return "Error: Could not read file."
    }
}

WriteFile(filepath, content) {
    try {
        FileDelete(filepath)
        FileAppend(content, filepath)
        return true
    } catch {
        Log("Error writing file: " . filepath)
        return false
    }
}

AddTimestampEntry(timestamp, outputFile, sourceFile := "") {
    global TimestampsData
    entry := {timestamp: timestamp, output_file: outputFile}
    if (sourceFile != "") {
        entry.source_file := sourceFile
    }
    TimestampsData.Push(entry)
}

SaveTimestamps() {
    global TimestampsData, OutputFolder, LLMName
    dateStr := FormatTime(, "yyyyMMdd")
    jsonFile := OutputFolder . "\timestamps_" . LLMName . "_" . dateStr . ".json"
    
    jsonContent := "["
    for index, entry in TimestampsData {
        if (index > 1) {
            jsonContent .= ","
        }
        jsonContent .= "`n  {"
        jsonContent .= "`n    `"timestamp`": `"" . entry.timestamp . "`","
        jsonContent .= "`n    `"output_file`": `"" . entry.output_file . "`""
        if (entry.HasProp("source_file")) {
            jsonContent .= ","
            jsonContent .= "`n    `"source_file`": `"" . entry.source_file . "`""
        }
        jsonContent .= "`n  }"
    }
    jsonContent .= "`n]"
    
    WriteFile(jsonFile, jsonContent)
    Log("Timestamps saved: " . jsonFile)
}

; === Window Management Functions ===
FindVSCodeWindow() {
    Log("🔎 Searching for VS Code window...")
    
    ; Try different window title patterns
    patterns := ["Visual Studio Code", "ahk_exe Code.exe", "ahk_class Chrome_WidgetWin_1"]
    
    for pattern in patterns {
        windowList := WinGetList(pattern)
        for windowID in windowList {
            try {
                windowTitle := WinGetTitle(windowID)
                windowClass := WinGetClass(windowID)
                
                ; Skip dialog windows
                if (windowClass = "#32770") {
                    continue
                }
                
                if (InStr(windowTitle, "Visual Studio Code")) {
                    Log("✅ VS Code window found: " . windowTitle)
                    return windowID
                }
            }
        }
    }
    
    Log("❌ VS Code window not found")
    return 0
}

SetupWindow(windowID) {
    Log("Setting up window...")
    
    ; Restore if minimized
    minMax := WinGetMinMax(windowID)
    if (minMax = -1) {
        WinRestore(windowID)
        Sleep(500)
    }
    
    ; Activate and focus
    WinActivate(windowID)
    WinWaitActive(windowID, , 5)
    
    ; Maximize
    if (minMax != 1) {
        WinMaximize(windowID)
        Sleep(500)
    }
    
    Log("Window setup complete.")
}

SendTextViaClipboard(text) {
    originalClipboard := A_Clipboard
    A_Clipboard := text
    ClipWait(2)
    Send("^v")
    Sleep(1000)
    A_Clipboard := originalClipboard
}

; === Dialog Handling ===
CloseSaveDialog() {
    Log("🔎 Looking for save dialog...")
    
    ; Look for VS Code save dialog
    try {
        WinWait("Visual Studio Code ahk_class #32770", , 15)
        Log("✅ Save dialog detected")
        
        ; Try different methods to close dialog
        ; Method 1: Right arrow + Enter (select "Don't Save")
        Send("{Right}{Enter}")
        Sleep(1500)
        
        ; Check if dialog is still there
        if (!WinExist("Visual Studio Code ahk_class #32770")) {
            Log("✅ Dialog closed with Right+Enter")
            return true
        }
        
        ; Method 2: Alt+N (Don't Save shortcut)
        Send("!n")
        Sleep(1500)
        
        if (!WinExist("Visual Studio Code ahk_class #32770")) {
            Log("✅ Dialog closed with Alt+N")
            return true
        }
        
        Log("❌ Could not close dialog")
        return false
    } catch {
        return false
    }
}

; === DevTools Functions ===
OpenDevToolsAndRunScript(windowID, script) {
    Log("Opening DevTools and running script...")
    
    ; Ensure VS Code is focused
    WinActivate(windowID)
    Sleep(2000)
    
    ; Open command palette
    Send("^+p")
    Sleep(2000)
    
    ; Type Developer Tools command
    SendTextViaClipboard("Developer: Toggle Developer Tools")
    Sleep(2000)
    Send("{Enter}")
    Sleep(10000)
    
    ; Move focus to console and execute script
    Send("{Tab}")
    Sleep(300)
    SendTextViaClipboard(script)
    Sleep(2000)
    Send("{Enter}")
    Sleep(5000)
    
    ; Close DevTools
    Send("!{F4}")
    Sleep(2000)
    
    ; Return focus to main window
    WinActivate(windowID)
    Sleep(1000)
}

ExtractCopilotTimings(windowID) {
    Log("--- Opening DevTools to get copilotTimings ---")
    
    ; Focus VS Code
    WinActivate(windowID)
    Sleep(1000)
    
    ; Open command palette
    Send("^+p")
    Sleep(2000)
    
    ; Type Developer Tools command
    SendTextViaClipboard("Developer: Toggle Developer Tools")
    Sleep(2000)
    Send("{Enter}")
    Sleep(10000)
    
    ; Wait for DevTools window
    try {
        WinWait("Developer Tools", , 120)
        WinActivate("Developer Tools")
        Sleep(1000)
        
        ; Execute getCopilotTimings() and copy result
        SendTextViaClipboard("copy(getCopilotTimings())")
        Sleep(500)
        Send("{Enter}")
        Sleep(2000)
        
        ; Save clipboard content
        clipboardContent := A_Clipboard
        if (InStr(clipboardContent, "[") && InStr(clipboardContent, "]")) {
            timestamp := FormatTime(, "yyyyMMdd_HHmmss")
            timingsFile := OutputFolder . "\copilot_timings_" . LLMName . "_" . timestamp . ".json"
            
            ; Extract JSON from clipboard
            startPos := InStr(clipboardContent, "[")
            endPos := InStr(clipboardContent, "]", false, startPos)
            if (startPos && endPos) {
                jsonContent := SubStr(clipboardContent, startPos, endPos - startPos + 1)
                WriteFile(timingsFile, jsonContent)
                Log("Copilot timings saved: " . timingsFile)
            }
        }
        
        ; Close DevTools
        Send("^w")
        Sleep(1000)
    }
    
    ; Return focus to VS Code
    WinActivate(windowID)
    Sleep(1000)
}

; === File Processing ===
GetPromptFiles() {
    global PromptFolder, PromptFile
    
    Log("Getting prompt files from: " . PromptFolder)
    
    ; Get all relevant files
    files := []
    extensions := ["*.txt", "*.md", "*.spec"]
    
    for ext in extensions {
        Loop Files, PromptFolder . "\" . ext {
            files.Push(A_LoopFileFullPath)
        }
    }
    
    ; Remove duplicates
    uniqueFiles := Map()
    for file in files {
        uniqueFiles[file] := true
    }
    
    finalFiles := []
    for file, _ in uniqueFiles {
        finalFiles.Push(file)
    }
    
    if (finalFiles.Length = 0) {
        Log("No files found in folder, using default file")
        finalFiles.Push(PromptFile)
    }
    
    Log("Found " . finalFiles.Length . " prompt files")
    return finalFiles
}

ProcessPromptFile(windowID, filePath, fileIndex, totalFiles) {
    global CurrentFileIndex, WaitTime, LongWaitTime, OutputFolder, LLMName
    
    CurrentFileIndex := fileIndex
    
    fileName := ""
    SplitPath(filePath, &fileName)
    Log("===== Processing file " . fileIndex . "/" . totalFiles . ": " . fileName . " =====")
    
    ; Read prompt content
    promptContent := ReadFile(filePath)
    
    Log("--- Continuing with Chat interaction ---")
    
    ; Clear input and type workspace reference
    Send("^l")
    Sleep(500)
    
    ; Type workspace reference character by character
    workspaceRef := "#cypress-realworld-app"
    for char in StrSplit(workspaceRef) {
        Send(char)
        Sleep(100)
    }
    
    Send("{Tab}")
    Sleep(WaitTime)
    
    ; Send prompt content
    SendTextViaClipboard(promptContent)
    
    ; Send message and record timestamp
    sendTimestamp := GetTimestamp()
    Log("Send timestamp: " . sendTimestamp)
    Send("{Enter}")
    Sleep(WaitTime)
    
    ; Wait for response
    Log("Waiting " . (LongWaitTime/1000) . " seconds for response...")
    Sleep(LongWaitTime)
    
    ; Save using /save command
    SendTextViaClipboard("/save")
    Sleep(500)
    Send("{Enter}")
    Sleep(2000)
    
    ; Select all and copy
    Send("^a")
    Sleep(1000)
    Send("^c")
    Sleep(1500)
    
    ; Save copied content to file
    content := A_Clipboard
    ext := ""
    nameNoExt := ""
    SplitPath(filePath, , , &ext, &nameNoExt)
    timestamp := FormatTime(, "yyyyMMdd_HHmmss")
    outputFile := OutputFolder . "\" . nameNoExt . "_response_" . LLMName . "_" . timestamp . "." . ext
    
    if (WriteFile(outputFile, content)) {
        Log("✅ Content saved successfully: " . outputFile)
    } else {
        errorFile := OutputFolder . "\error_guardado_" . LLMName . "_" . timestamp . ".txt"
        WriteFile(errorFile, "Error saving content`n`nContent:`n" . content)
        outputFile := errorFile
        Log("❌ Error saving content, saved to error file")
    }
    
    ; Store timestamp
    AddTimestampEntry(sendTimestamp, outputFile, filePath)
    
    ; Close current window/panel
    Send("^{F4}")
    Sleep(WaitTime + 1000)
    
    ; Handle save dialog if it appears
    CloseSaveDialog()
    Sleep(1000)
    
    ; Focus chat
    Send("^+i")
    Sleep(1000)
    Send("^!n")
    Sleep(1000)
    
    Log("✅ File " . fileIndex . "/" . totalFiles . " processed successfully.")
    Sleep(WaitTime)
}

; === Main Automation Function ===
AutomateVSCode() {
    global TotalFilesCount, VSCodePath, WorkspaceFolder, DevToolsScript
    
    Log("Starting Visual Studio Code automation...")
    
    ; Get prompt files
    promptFiles := GetPromptFiles()
    TotalFilesCount := promptFiles.Length
    
    ; Start VS Code
    Log("Starting Visual Studio Code...")
    Run('"' . VSCodePath . '" "' . WorkspaceFolder . '"')
    Sleep(5000)
    
    ; Find VS Code window
    windowID := FindVSCodeWindow()
    if (!windowID) {
        Log("Fatal error: Could not find VS Code main window.")
        return
    }
    
    ; Setup window
    SetupWindow(windowID)
    
    ; Execute DevTools script once at startup
    Log("--- Executing DevTools script ---")
    devToolsContent := ReadFile(DevToolsScript)
    OpenDevToolsAndRunScript(windowID, devToolsContent)
    Log("--- DevTools script executed ---")
    
    ; Process each prompt file
    for index, promptFile in promptFiles {
        ProcessPromptFile(windowID, promptFile, index, promptFiles.Length)
    }
    
    Log("===== Processing of all files completed =====")
    SaveTimestamps()
    ExtractCopilotTimings(windowID)
    
    Log("Script finished.")
}

; === Script Entry Point ===
; Run automation when script starts
AutomateVSCode()

; === Hotkeys (Optional) ===
; F1 to manually start automation
F1::AutomateVSCode()

; F2 to emergency exit
F2::ExitApp()

; Esc to pause/resume
Esc::Pause()