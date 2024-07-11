*** Settings ***
Library    SeleniumLibrary
Library    Collections
Library    OperatingSystem
Library    JSONLibrary

*** Variables ***
${BASE_URL}    http://localhost:3000
${JSON_FILE}    interactions.json

*** Keywords ***
Follow Link
    [Arguments]  ${link}
    Click Element  link=${link}  # Use Click Element to click on the link

*** Test Cases ***
Crawl and Save Interactions
    Open Browser  ${BASE_URL}  chrome  # Open the browser at the base URL
    ${links}  Get WebElements  //a  # Find all links on the page
    ${buttons}  Get WebElements  //button  # Find all buttons on the page
    ${forms}  Get WebElements  //form  # Find all forms on the page
    Log  Found ${links} links, ${buttons} buttons, and ${forms} forms on the page.
    ${interactions}  Create List
    FOR  ${link}  IN  @{links}
        ${interaction}  Create Dictionary  Link=${link.text}  Element=Link  Result=${link.location}  URL=${BASE_URL}
        Append To List  ${interactions}  ${interaction}
        Capture Page Screenshot  ${link.text}_screenshot.png
        ${sub_links}  Get WebElements  xpath=//a[contains(@href, '${link.text}')]
        FOR  ${sub_link}  IN  @{sub_links}
            ${sub_interaction}  Create Dictionary  Link=${sub_link.text}  Element=Link  Result=${sub_link.location}  URL=${BASE_URL}${sub_link.get_attribute('href')}
            Append To List  ${interactions}  ${sub_interaction}
            Capture Page Screenshot  ${sub_link.text}_screenshot.png
            ${sub_page_links}  Get WebElements  //a
            FOR  ${sub_page_link}  IN  @{sub_page_links}
                ${sub_page_interaction}  Create Dictionary  Link=${sub_page_link.text}  Element=Link  Result=${sub_page_link.location}  URL=${BASE_URL}${sub_page_link.get_attribute('href')}
                Append To List  ${interactions}  ${sub_page_interaction}
                Capture Page Screenshot  ${sub_page_link.text}_screenshot.png
            END
        END
    END
    FOR  ${button}  IN  @{buttons}
        ${interaction}  Create Dictionary  Link=${button.text}  Element=Button  Result=${button.location}  URL=${BASE_URL}
        Append To List  ${interactions}  ${interaction}
        Capture Page Screenshot  ${button.text}_screenshot.png
        ${sub_links}  Get WebElements  xpath=//a[contains(@href, '${button.text}')]
        FOR  ${sub_link}  IN  @{sub_links}
            ${sub_interaction}  Create Dictionary  Link=${sub_link.text}  Element=Link  Result=${sub_link.location}  URL=${BASE_URL}${sub_link.get_attribute('href')}
            Append To List  ${interactions}  ${sub_interaction}
            Capture Page Screenshot  ${sub_link.text}_screenshot.png
            ${sub_page_links}  Get WebElements  //a
            FOR  ${sub_page_link}  IN  @{sub_page_links}
                ${sub_page_interaction}  Create Dictionary  Link=${sub_page_link.text}  Element=Link  Result=${sub_page_link.location}  URL=${BASE_URL}${sub_link.get_attribute('href')}
                Append To List  ${interactions}  ${sub_page_interaction}
                Capture Page Screenshot  ${sub_page_link.text}_screenshot.png
            END
        END
    END
    FOR  ${form}  IN  @{forms}
        ${interaction}  Create Dictionary  Link=${form.text}  Element=Form  Result=${form.location}  URL=${BASE_URL}
        Append To List  ${interactions}  ${interaction}
        Capture Page Screenshot  ${form.text}_screenshot.png
        ${sub_links}  Get WebElements  xpath=//a[contains(@href, '${form.text}')]
        FOR  ${sub_link}  IN  @{sub_links}
            ${sub_interaction}  Create Dictionary  Link=${sub_link.text}  Element=Link  Result=${sub_link.location}  URL=${BASE_URL}${sub_link.get_attribute('href')}
            Append To List  ${interactions}  ${sub_interaction}
            Capture Page Screenshot  ${sub_link.text}_screenshot.png
            ${sub_page_links}  Get WebElements  //a
            FOR  ${sub_page_link}  IN  @{sub_page_links}
                ${sub_page_interaction}  Create Dictionary  Link=${sub_page_link.text}  Element=Link  Result=${sub_page_link.location}  URL=${BASE_URL}${sub_page_link.get_attribute('href')}
                Append To List  ${interactions}  ${sub_page_interaction}
                Capture Page Screenshot  ${sub_page_link.text}_screenshot.png
            END
        END
    END
    ${interactions_string}  Evaluate  json.dumps(${interactions})
    Create File  ${JSON_FILE}  ${interactions_string}
    Close Browser

    FOR  ${interaction}  IN  @{interactions}
        Run Keyword If  '${interaction.Element}' == 'Link'  Follow Link  ${interaction.Link}
        Run Keyword If  '${interaction.Element}' == 'Button'  Click Button  ${interaction.Link}
        Run Keyword If  '${interaction.Element}' == 'Form'  Submit Form  ${interaction.Link}
        ${sub_links}  Get WebElements  xpath=//a[contains(@href, '${interaction.Link}')]
        FOR  ${sub_link}  IN  @{sub_links}
            ${sub_interaction}  Create Dictionary  Link=${sub_link.text}  Element=Link  Result=${sub_link.location}  URL=${BASE_URL}${sub_link.get_attribute('href')}
            Append To List  ${interactions}  ${sub_interaction}
            Capture Page Screenshot  ${sub_link.text}_screenshot.png
            ${sub_page_links}  Get WebElements  //a
            FOR  ${sub_page_link}  IN  @{sub_page_links}
                ${sub_page_interaction}  Create Dictionary  Link=${sub_page_link.text}  Element=Link  Result=${sub_page_link.location}  URL=${BASE_URL}${sub_page_link.get_attribute('href')}
                Append To List  ${interactions}  ${sub_page_interaction}
                Capture Page Screenshot  ${sub_page_link.text}_screenshot.png
            END
        END
    END

    ${interactions_string}  Evaluate  json.dumps(${interactions})
    Create File  ${JSON_FILE}  ${interactions_string}
    Close Browser

