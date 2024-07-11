*** Settings ***
Library          SeleniumLibrary
Library          OperatingSystem   # To interact with the operating system

*** Variables ***
${BROWSER}       Chrome
${URL}           https://google.com  #http://localhost:3000/
${OUTPUT_FILE}   interactions.json   # Define the output JSON file
${SEARCH_BOX}    id=search_box
${SEARCH_BUTTON} xpath=//button[@id='search_button']

*** Test Cases ***
Open Web Application
   Open Browser   ${URL}   ${BROWSER}
   Maximize Browser Window
   Wait Until Page Contains Element   ${SEARCH_BOX}
   Wait Until Page Contains Element   ${SEARCH_BUTTON}

Crawl Web Application
    [Documentation] Crawl the web application and track UI elements
    Crawl Site        ${URL}        depth=1         # Crawl current page and one level deep
    Identify Crawlable Elements  # New keyword to identify elements
    # Add interactions as needed (use captured elements from Identify Crawlable Elements)
    Save Interactions To JSON

*** Keywords ***
Maximize Browser Window
   Maximize Browser Window

Save Interactions To JSON
    ${interactions}=    Create List
    FOR    ${element}    IN    @{IDENTIFIED_ELEMENTS}
        ${element_type}=    Get Element Attribute    ${element}    type
        ${interaction_value}=    Run Keyword And Ignore Error    Get Text    ${element}    # Capture text for input elements
        IF    ${element_type} == text
            Append To List    ${interactions}    { "type": "input_text", "element": "${element}", "value": "${interaction_value}" }
        ELSE IF    ${element} == ${SEARCH_BUTTON}
            Append To List    ${interactions}    { "type": "click", "element": "${element}" }
        # Add logic for other interaction types (dropdown, checkbox etc.)
        END IF
    END FOR
    ${json_content}=    Evaluate    json.dumps(${interactions}, indent=4)
    Create File    ${OUTPUT_FILE}    ${json_content}

Identify Crawlable Links  # New keyword for identifying elements
    ${identified_elements}=    Create List
    # Replace with your logic to find desired elements using Find Element or Find Elements
    # This example finds all links with a specific class name
    @{TEMP_LINKS}=    Find Elements    link=a    class=link-class
    FOR    ${link}    IN    @{TEMP_LINKS}
        Append To List    ${identified_elements}    ${link}
    END FOR
    # Add logic to identify other element types (text fields, buttons etc.) and store them in identified_elements
    Set Test Variable    @{IDENTIFIED_ELEMENTS}    ${identified_elements}
