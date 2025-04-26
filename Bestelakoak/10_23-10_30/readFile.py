def read_and_print_file(file_path):
    """Reads the contents of a text file and prints them.

    Args:
        file_path (str): The path to the text file.
    """

    try:
        with open(file_path, 'r', encoding='latin') as file:
            content = file.read()
            print(content)
    except FileNotFoundError:
        print(f"Error: File not found at '{file_path}'")
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    file_path = input("Enter the path to the text file: ")
    read_and_print_file(file_path)