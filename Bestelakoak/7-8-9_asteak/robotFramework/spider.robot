*** Settings ***
Library    SeleniumLibrary
Library    Collections
Library    DateTime
Library    String

*** Variables ***
${BASE_URL}    http://localhost:3000
${SCREENSHOT_DIR}    C:/Users/xabia/OneDrive/Documentos/4. Maila/TFG/Bestelakoak/7-8 asteak/robotFramework/screenshots


*** Test Cases ***
Spider Test
    Open Browser    ${BASE_URL}    chrome
    Follow Links    ${BASE_URL}
    Close Browser

*** Keywords ***
Follow Links
    [Arguments]    ${url}
    Go To    ${url}
    ${links}    Get All Links
    FOR    ${link}    IN    @{links}
        Take Screenshot
        Log    ${link}
        Go To    ${link}
        Follow Links    ${link}
    END

Take Screenshot
    ${screenshot_name}    Get Screenshot Name
    Capture Page Screenshot    ${SCREENSHOT_DIR}/${screenshot_name}

Get All Links
    ${links}    Get WebElements    //a
    ${link_list}    Create List
    FOR    ${link}    IN    @{links}
        ${href}    Get Element Attribute    ${link}    href
        Append To List    ${link_list}    ${href}
    END
    RETURN    ${link_list}

Get Screenshot Name
    ${timestamp}    Get Time    result_format=%Y%m%d%H%M%S
    ${screenshot_name}    Catenate    SEPARATOR=_    screenshot    ${timestamp}.png
    ${screenshot_name}    Replace String    ${screenshot_name}    :    -    # Replace invalid characters
    RETURN    ${screenshot_name}