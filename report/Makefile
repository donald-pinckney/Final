.PHONY: all clean

all: 
	latexmk main
	gs -q -dSAFER -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -sOutputFile=main-embedded.pdf -dCompatibilityLevel=1.5 -dPDFSETTINGS=/prepress -c .setpdfwrite -f main.pdf

clean:
	latexmk -c
