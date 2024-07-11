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
        ${link_domain}    Get Domain    ${link}
        ${base_domain}    Get Domain    ${BASE_URL}
        Run Keyword If    '${link_domain}' == '${base_domain}' or '${link_domain}' == 'subdomain.${base_domain}'    Follow Link    ${link}
    END

Follow Link
    [Arguments]    ${link}
    Take Screenshot
    Log    ${link}
    Go To    ${link}
    Follow Links    ${link}

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

Get Domain
    [Arguments]    ${url}
    ${parsed_url}    Parse URL    ${url}
    ${domain}    Get From Dictionary    ${parsed_url}    netloc
    RETURN    ${domain}
