*** Settings ***
Library    SeleniumLibrary
Library    Collections
Library    OperatingSystem
Library    JSONLibrary

*** Variables ***
${BASE_URL}    http://localhost:3000
${JSON_FILE}    summary.json

*** Test Cases ***
Crawl and Save Interactions
    Open Browser    ${BASE_URL}    chrome
    ${links}    Get WebElements    //a
    ${buttons}    Get WebElements    //button
    ${forms}    Get WebElements    //form
    Log    Found ${links} links, ${buttons} buttons, and ${forms} forms on the page.
    ${interactions}    Create List
    FOR    ${link}    IN    @{links}
        ${interaction}    Create Dictionary    Link=${link.text}    Element=Link    Result=${link.location}    URL=${BASE_URL}
        Append To List    ${interactions}    ${interaction}
        Capture Page Screenshot    ${link.text}_screenshot.png
    END
    FOR    ${button}    IN    @{buttons}
        ${interaction}    Create Dictionary    Link=${button.text}    Element=Button    Result=${button.location}    URL=${BASE_URL}
        Append To List    ${interactions}    ${interaction}
        Capture Page Screenshot    ${button.text}_screenshot.png
    END
    FOR    ${form}    IN    @{forms}
        ${interaction}    Create Dictionary    Link=${form.text}    Element=Form    Result=${form.location}    URL=${BASE_URL}
        Append To List    ${interactions}    ${interaction}
        Capture Page Screenshot    ${form.text}_screenshot.png
    END
    Write JSON to File    ${JSON_FILE}    ${interactions}
    Close Browser

*** Keywords ***
Write JSON to File
    [Arguments]    ${file_path}    ${data}
    ${json_data}    Evaluate    json.dumps($data)    json
    Create Directory    ${file_path}
    Create File    ${file_path}/${JSON_FILE}    ${json_data}
