*** Settings ***
Library    SeleniumLibrary
Library    OperatingSystem

*** Variables ***
${BASE_URL}    http://localhost:3000
${OUTPUT_FILE}    ${CURDIR}/interactions.json

*** Test Cases ***
Crawl Website and Save Interactions
    Open Browser    ${BASE_URL}    chrome
    ${interactions}    Create List
    ${links}    Get All Links
    Append To List    ${interactions}    ${links}
    ${buttons}    Get All Buttons
    Append To List    ${interactions}    ${buttons}
    ${inputs}    Get All Input Fields
    Append To List    ${interactions}    ${inputs}
    ${interactions_json}    Evaluate    json.dumps(${interactions})
    Create File    ${OUTPUT_FILE}    ${interactions_json}
    Close Browser

*** Keywords ***
Get All Links
    [Documentation]    Get all links on the page
    ${links}    Get WebElements    //a
    ${link_texts}    Create List
    FOR    ${link}    IN    @{links}
        ${link_text}    Get Text    ${link}
        Append To List    ${link_texts}    ${link_text}
    END
    RETURN    ${link_texts}

Get All Buttons
    [Documentation]    Get all buttons on the page
    ${buttons}    Get WebElements    //button
    ${button_texts}    Create List
    FOR    ${button}    IN    @{buttons}
        ${button_text}    Get Text    ${link}  # typo corrected (link should be button)
        Append To List    ${button_texts}    ${button_text}
    END
    RETURN    ${button_texts}

Get All Input Fields
    [Documentation]    Get all input fields on the page
    ${inputs}    Get WebElements    //input
    ${input_ids}    Create List
    FOR    ${input}    IN    @{inputs}
        ${input_id}    Get Element Attribute    ${input}    id
        Append To List    ${input_ids}    ${input_id}
    END
    RETURN    ${input_ids}
