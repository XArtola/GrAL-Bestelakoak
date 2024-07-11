*** Settings ***
Library  SeleniumLibrary
Library  OperatingSystem

*** Variables ***
${BROWSER}  chrome
${URL}      https://www.google.com/intl/es/gmail/about/

*** Test Cases ***
Open Gmail and Capture Elements
    Capture Page Elements
    Close Browser

*** Keywords ***
Capture Page Elements
    Open Browser  ${URL}  ${BROWSER}
    # Wait for the page to load (optional, adjust timeout if needed)
    Wait Until Element Is Visible  xpath://body

    # Try a more specific XPath targeting the main content area (replace if needed)
    ${content_section}  Get WebElements  xpath=//div[@id='content']

    # Capture interactive elements within the section
    ${interactuable_elements}  Get WebElements  xpath=.//button | .//a
    #${interactuable_elements}  Create List  ${a_elements}  ${button_elements}
    ${element_count}  Get Length  ${interactuable_elements}

    IF  ${element_count} > 0
        FOR    ${index}    IN RANGE    ${element_count}
            ${element_text}  Get Text  ${interactuable_elements}[${index}]
            ${element_id}    Get Element Attribute  ${interactuable_elements}[${index}]  id
            ${element_class}  Get Element Attribute  ${interactuable_elements}[${index}]  class
            ${element_tag}    Get Element Attribute  ${interactuable_elements}[${index}]  tag_name
            ${element_dict}  Create Dictionary  id=${element_id} text=${element_text}  class=${element_class}  tag=${element_tag}
        END
        ${interactuable_elements_json}  Evaluate  json.dumps(${element_dict})
        ${file_path}  Set Variable  interactuable_elements.json
        Create File  ${file_path}  ${interactuable_elements_json}
    ELSE
        Log  No interactive elements found on the page.
    END


