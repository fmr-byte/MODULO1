#!/bin/sh
# Double-clic : lance la démo sur http://localhost:8080 (nécessaire pour charger des .glb)
cd "$(dirname "$0")" && open http://localhost:8080 && python3 -m http.server 8080
