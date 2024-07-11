#!/bin/sh
extract_links () {
    lynx --listonly \
    --nonumbers \
    --display_charset=utf-8 \
    --dump "$1" \
    | grep "^$1" \
    | sort \
    | uniq
}

# Verificar si se proporcionó una URL como argumento
if [ -z "$1" ]; then
    echo "Por favor, proporciona una URL válida como argumento. $1"
    exit 1
fi

# Llamar a la función extract_links con la URL proporcionada
extract_links "$1"