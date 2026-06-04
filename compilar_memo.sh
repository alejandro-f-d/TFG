#!/bin/bash

MEMORIA_DIR="memoria"
MAIN_FILE="main"

echo "Iniciando limpieza y compilación de LaTeX..."

cd $MEMORIA_DIR || {
	echo " Error: No se encuentra la carpeta $MEMORIA_DIR"
	exit 1
}

echo "Borrando archivos temporales..."
find . -name "*.aux" -type f -delete
rm -f *.bbl *.blg *.bcf *.log *.out *.run.xml *.toc *.pdf texput.log *.tex.bbl *.tex.blg

echo "mapa de citas"
pdflatex -interaction=nonstopmode $MAIN_FILE >/dev/null

echo "bibliografía"
biber $MAIN_FILE

echo "pdflatex "
pdflatex -interaction=nonstopmode $MAIN_FILE >/dev/null

echo "pdflatex (Finalizando índices y PDF...)"
pdflatex -interaction=nonstopmode $MAIN_FILE >/dev/null

if [ -f "$MAIN_FILE.pdf" ]; then
	echo "PDF generado con éxito: $MEMORIA_DIR/$MAIN_FILE.pdf"
else
	echo "Error: El PDF no se pudo generar. Revisa el archivo $MAIN_FILE.log"
fi

cd ..
open memoria/main.pdf
