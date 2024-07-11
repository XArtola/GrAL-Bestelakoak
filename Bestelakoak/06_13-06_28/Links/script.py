import os
import subprocess
import keyboard

def on_press(key):
    if key == keyboard.Key.esc:
        # Exit on pressing Esc key
        return False

def send_keys(sequence):
    keyboard.on_press(on_press)
    # Simulate typing the sequence
    for key in sequence:
        keyboard.press(key)
        keyboard.release(key)

# Execute links2 command
subprocess.run(["links2"])
keyboard.press("enter")
keyboard.release("enter")
keyboard.press("g")
keyboard.release("g")
keyboard.press("b")
keyboard.release("b")



# Define the keyboard sequence 
sequence = "escape" 
# Replace "your_sequence_here" with the actual keystrokes

# Send the keyboard sequence
send_keys(sequence)

print("Sequence sent!")
