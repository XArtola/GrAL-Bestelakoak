#!/bin/bash

# Check if correct number of arguments is provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <input_file> <output_file>"
    exit 1
fi

# Input and output file names from command line arguments
input_file="$1"
output_file="$2"

# Check if input file exists
if [ ! -f "$input_file" ]; then
    echo "Error: Input file '$input_file' does not exist."
    exit 1
fi

# FFmpeg parameters (less restrictive)
scene_threshold=0.1
min_frame_duration=0.1
output_fps=10

# Construct the filter chain
filter_chain="select='gt(scene,$scene_threshold)+gte(t-prev_selected_t,$min_frame_duration)',setpts=N/FRAME_RATE/TB,mpdecimate,setpts=N/FRAME_RATE/TB,fps=$output_fps"

# Debug: Print the full FFmpeg command
echo "Executing FFmpeg command:"
echo ffmpeg -v verbose -i "$input_file" -vf "$filter_chain" -c:v libx264 "$output_file"

# FFmpeg command with verbose logging
ffmpeg -v verbose -i "$input_file" -vf "$filter_chain" -c:v libx264 "$output_file"

# Check the exit status of FFmpeg
if [ $? -ne 0 ]; then
    echo "Error: FFmpeg command failed."
    exit 1
fi

# Check the size of the output file
output_size=$(stat -f%z "$output_file")
echo "Output file size: $output_size bytes"

if [ "$output_size" -lt 1000 ]; then
    echo "Warning: Output file is very small. The filter may be too
restrictive."
    echo "Try adjusting the scene_threshold and min_frame_duration
values."
else
    echo "Video processing complete. Output saved as $output_file"
fi
