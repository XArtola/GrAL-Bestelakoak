import base64
import requests

# OpenAI API Key
api_key = "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"

# Function to encode the image
def encode_image(image_path):
  with open(image_path, "rb") as image_file:
    return base64.b64encode(image_file.read()).decode('utf-8')

# Path to your image
image_path = "screenshot_with_grid2.png"

# Getting the base64 string
base64_image = encode_image(image_path)

headers = {
  "Content-Type": "application/json",
  "Authorization": f"Bearer {api_key}"
}

payload = {
  "model": "gpt-4-turbo",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "For each interactuable element in the grid, give in array format the label(s)  of the cells in which the element appears and a brief explanation of the interactuable element. For example if the Login buttons appear on the A,V and T cells, the response should be [A,V,T]:[Login button]. The labels are written in red in the upper left corner of the cells. The interactuable elements are the elements that can be clicked or interacted with."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": f"data:image/jpeg;base64,{base64_image}"
          }
        }
      ]
    }
  ],
  "max_tokens": 300
}

response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)

print(response.json())

# Give a list that contaonsWhich of the cells in the grid contain an interactuable element? Give the response as: [Label(s)]:[explanation]. Where label contains a list with the alphabetical labels that are written in red in the upper left corner of the cells and explanation is a brief explanation of why the cell is interactuable.