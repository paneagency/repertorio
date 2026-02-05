
import json
import re
import uuid

raw_text = """
INTRO CORTA
Tiempo: 0:32

INTRO 
Tiempo: 0:57

CASI ALGO 
Autores: Sergio Prada, Agustin Fantili
Tiempo: 2:22

QUERÍA AMAR 
Autores: Sergio Prada, Agustin Fantili
Tiempo: 3:00

YA NO SOMOS DOS 
Autores: Sergio Prada, Agustin Fantili, Noelia Albanese
Tiempo: 2:53

NO VUELVAS MAS
Autores: Sergio Prada, Agustin Fantili, Benja Torres, Tote, Franco Colacillo
Tiempo: 3:55

SI ME HACES BIEN 
Autores: Sergio Prada, Agustin Fantili, Carlos Toro
Tiempo: 3:05

BALADAS NOVELA
Autores: Sergio Prada, Agustin Fantili
Tiempo: 4:40
PASION PROHIBIDA (Sergio Prada, Agustin Fantili)
AMOR A CUALQUIER PRECIO (Sergio Prada, Agustin Fantili)

NO ME SALE
Autores: Sergio Prada, Agustin Fantili. Selena Carolina Vera, Gustavo Cesar Pablo Machado
Tiempo: 3:37

CENIZAS
Autores: Jorge Milikota
Tiempo: 3:50

BAILARINA CARPERA
Autores: Sergio Prada
Tiempo: 2:45

HOMENAJE A HORACIO / SI SE CALLE EL CANTOR
Autores: (Heraclio Catalin Rodriguez)
Tiempo: 2:42


PESCADOR Y GUITARRERO
Autores: (Heraclio Catalin Rodriguez, Irma Abraian)
Tiempo: 3:05

DUEÑA DE MI ALMA
Autores: Sergio Prada, Agustin Fantili, Carlos Toro
Tiempo: 4:12

FEBRERO ES CARNAVAL
Autores: Carlos Alejandro Toro, Claudio Toro, Facundo Toro
Tiempo: 3:35

MIX CHACARERAS 
LA REVANCHA (Sergio Prada, Agustin Fantili)
DÉJAME QUE ME VAYA (Roberto Ternavasia, Saul Belindo Carabajal)
ENTRE A MI PAGO SIN GOLPEAR (Carlos Carabajal, Pablo Trullenque)
Tiempo: 5:33 
(mas el tiempo que le pedimos el grito a carlitos, calcular)

LA REVANCHA
Autores:  (Sergio Prada, Agustin Fantili)
Tiempo: 2:33

ZAMBAS ROMÁNTICAS  
MUJER NIÑA Y AMIGA (Robustiano Figueroa Reyes) 
GALLITOS DEL AIRE (Argentino Luna)
JAZMIN DE LUNA  (Jorge Milikota)
Tiempo: 5:04

MIX CARPERAS
LA TALEÑITA (Jesus Ruben Perez)
DE ALBERDI (Jose Ignacio Rodriguez)
SOLO POR VERTE BAILAR (Sergio Prada, Agustin Fantili, Cristian Sosa)
DEL CHUCARO  (Heraclio Catalin Rodriguez)
Tiempo: 6:10

CARPERAZO
LA TALEÑITA (Jesus Ruben Perez)
DE ALBERDI (Jose Ignacio Rodriguez)
SOLO POR VERTE BAILAR (Sergio Prada, Agustin Fantili, Cristian Sosa)
DEL CHUCARO  (Heraclio Catalin Rodriguez)
Tiempo: 8:50

TAL CARPERAZO
LA TALEÑITA (Jesus Ruben Perez)
DE ALBERDI (Jose Ignacio Rodriguez)
SOLO POR VERTE BAILAR (Sergio Prada, Agustin Fantili, Cristian Sosa)
DEL CHUCARO  (Heraclio Catalin Rodriguez)
Tiempo: 7:30

LA NOCHE PERFECTA 
Autores: Sergio Prada, Facundo Toro, Nicolas Urquiza
Tiempo: 2:45

FESTIVALERO 
Autores: Sergio Prada, Facundo Toro
Tiempo: 4:40

FESTIVALERO (1 juego)
Autores: Sergio Prada, Facundo Toro
Tiempo: 3:42

EL DEDO EN LA LLAGA (Jorge Milikota) - TOMAME (Jorge Rojas, Miguel Nogales) 
Tiempo: 3:51

CHAMAMÉ
ASI SE BAILA EL CHAMAMÉ (Mariano Millán)
ENTRE AMIGOS Y CHAMAME (Berardino Ramos, Benedetto Oneca)
PUERTO TIROL (Hereclio Perez, Marcos Herminio Ramirez)
Tiempo: 3:56

90 y 2000 
Tiempo: 3:58

ZAMBA PARA DECIR ADIOS
Tiempo: 2:10

ZAMBA PARA OLVIDARTE
Tiempo: 2:10

ETERNO AMOR 
Tiempo: 3:40

TE VI
Tiempo: 3:55

ME ENAMORE DE UNA CUYANA
Tiempo: 3:05
Autores: Sergio Prada, Agustin Fantili

LA ZAMBA
Tiempo: 3:33
Autores: Sergio Prada, Agustin Fantili

TE QUIERO
Tiempo: 3:07
Autores: Jose Luis Perales

JUAN DE LA CALLE
Tiempo: 3:20

CAMPEDRINOMETRO
Tiempo: 6:30

DISCURSOS
Tiempo: 5:20

SALUDO
Tiempo: 1:00

DESPEDIDA
Tiempo: 1:45

intro horacio (agus)
Tiempo: 1:30 

intro a dueña (ser)
Tiempo: 0:35

intro a baladas novela (ser)
Tiempo: 0:20
"""

songs = []
current_song = {}

# Split by double newlines or based on pattern
# The pattern seems to be TITLE \n (Autores: ...)? \n Tiempo: ...
# But some have extra lines for "Mixes" or subtitles.

# Let's process line by line
lines = raw_text.split('\n')
buffer_title = []
buffer_authors = []
buffer_duration = None

for line in lines:
    line = line.strip()
    if not line:
        # Empty line, if we have a complete song, push it
        if buffer_title and buffer_duration:
            title = " ".join(buffer_title)
            authors = " ".join(buffer_authors)
            
            # Clean up title if it contains content that should be in authors or description
            # Actually, for Mixes, the user provided a list of songs inside. 
            # Ideally we keep that in title or authors? 
            # "MIX CHACARERAS \n LA REVANCHA... \n Tiempo: ..."
            # Let's put the extra lines in "Authors" or just append to Title?
            # The prompt says "Título" and "Autores".
            # For mixes, maybe title = "MIX CHACARERAS", autores = "LA REVANCHA..."
            
            songs.append({
                "id": str(uuid.uuid4()),
                "title": title,
                "authors": authors,
                "duration": buffer_duration
            })
            buffer_title = []
            buffer_authors = []
            buffer_duration = None
        continue
    
    if line.lower().startswith("tiempo:"):
        buffer_duration = line.split(":", 1)[1].strip()
        # Clean up any comments after duration like "(mas el tiempo...)"
        if "(" in buffer_duration:
             buffer_duration = buffer_duration.split("(")[0].strip()
        continue
        
    if line.lower().startswith("autores:"):
        val = line.split(":", 1)[1].strip()
        buffer_authors.append(val)
        continue
        
    # If not time or authors, it's part of title or description
    # If we already have a duration, we should have flushed. 
    # If we haven't flushed, it means we are building the song info.
    
    # Heuristic: If we don't have a title yet, this is the title.
    # If we have a title, but no authors/duration yet, this might be:
    # 1. More title
    # 2. A subtitle/song list for a mix (treat as Author/Desc)
    
    if not buffer_title:
        buffer_title.append(line)
    else:
        # already have title, treat as part of description/authors if not explicitly "Autores:"
        # For mixes, the lines between Title and Timestamp are often the sub-songs.
        # Let's add them to authors buffer for visibility
        buffer_authors.append(line)

# Flush last one
if buffer_title and buffer_duration:
    title = " ".join(buffer_title)
    authors = " ".join(buffer_authors)
    songs.append({
        "id": str(uuid.uuid4()),
        "title": title,
        "authors": authors,
        "duration": buffer_duration
    })

print(json.dumps(songs, indent=2))
