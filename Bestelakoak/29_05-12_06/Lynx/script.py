import subprocess
import json
import sys
import datetime

def extract_links(url, dict_links = {}, depth=0):

    if depth == 0:
        return dict_links
    else:
        depth = depth - 1

        if url in dict_links:
            return dict_links
        else:
            
            # Execute the extract_links.sh command and capture the output
            try:
                output = subprocess.check_output(["./extract_links.sh", url]).decode('utf-8')
            except subprocess.CalledProcessError as e:
                print(f"Command '{e.cmd}' returned non-zero exit status {e.returncode}.")
                print(e.output)

            # Convert the output into a list of links
            links = output.strip().split('\n')

            # Create a dictionary to store the URL and links
            data = {
                'url': url,
                'links': links
            }

            dict_links[url] = links

            # Iterate over each link
            for link in links:
                #print(f"Extracting links from {link}...")
                if link and isinstance(link, str):
                    dict_links_new = extract_links(link, dict_links, depth)
                    dict_links = combinar_sin_repeticiones(dict_links, dict_links_new)
                    #print(dict_links)
                    #dict_links = extract_links(link, dict_links, depth)

            return dict_links

def combinar_sin_repeticiones(diccionario1, diccionario2):
  """
  Combina dos diccionarios en uno solo sin repeticiones de claves.

  Args:
    diccionario1: El primer diccionario a comparar.
    diccionario2: El segundo diccionario a comparar.

  Returns:
    Un nuevo diccionario con las claves únicas de ambos diccionarios.
  """
   # Obtener las claves únicas de ambos diccionarios (manejar None)
  claves_unicas = set()
  if diccionario1:
        claves_unicas |= set(diccionario1.keys())
  if diccionario2:
        claves_unicas |= set(diccionario2.keys())
  
    # Crear un nuevo diccionario vacío (o None si ambos son vacíos)
  if not claves_unicas:
        return None
  diccionario_combinado = {}

        # Recorrer las claves únicas
  for clave in claves_unicas:
            # Si la clave está en el primer diccionario, utilizar su valor
            if clave in diccionario1:
                valor = diccionario1[clave]
            # Si la clave está en el segundo diccionario, utilizar su valor
            else:
                valor = diccionario2[clave]

            # Añadir la clave y el valor al diccionario combinado
            diccionario_combinado[clave] = valor

  return diccionario_combinado


if __name__ == '__main__':
    # Obtener la URL del argumento de línea de comandos
    url = sys.argv[1]

    # Llamar a la función extract_links con la URL
    results = extract_links(url,{},50)

    #Eliminar los links repetidos
    results = combinar_sin_repeticiones(results,results)

    # Save the data to a JSON file
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}_data.json"
    with open(filename, 'w') as f:
        json.dump(results, f)
