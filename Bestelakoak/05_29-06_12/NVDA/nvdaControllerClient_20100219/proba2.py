import time
import ctypes
import requests
from bs4 import BeautifulSoup

# Load the NVDA client library
clientLib=ctypes.windll.LoadLibrary('./nvdaControllerClient64.dll')

# Test if NVDA is running, and if it's not, show a message
res = clientLib.nvdaController_testIfRunning()
if res != 0:
    errorMessage = str(ctypes.WinError(res))
    ctypes.windll.user32.MessageBoxW(0, u"Error: %s" % errorMessage, u"Error communicating with NVDA", 0)

# Scrape the website and retrieve its elements
url = "https://google.es"  # Replace with the URL of the website you want to scrape
response = requests.get(url)
soup = BeautifulSoup(response.text, "html.parser")
elements = soup.find_all()  # Modify this line to specify the elements you want to retrieve

# Speak and braille the scraped elements
for element in elements:
    clientLib.nvdaController_speakText(element.text)
    clientLib.nvdaController_brailleMessage(element.text)
    time.sleep(0.625)
    clientLib.nvdaController_cancelSpeech()

clientLib.nvdaController_speakText(u"Scraping completed!")
clientLib.nvdaController_brailleMessage(u"Scraping completed!")
