from PIL import Image, ImageDraw
import os
import pandas as pd
import shutil

EXAMPLES_DIR = "examples/"

panos_df = pd.read_csv("seattle_panos.csv")

if os.path.isdir(EXAMPLES_DIR):
    shutil.rmtree(EXAMPLES_DIR)
os.makedirs(EXAMPLES_DIR)

for i in range(100):
  pano_path = "panos/" + panos_df["pano_id"][i] + ".jpg"
  pano_labels = eval(panos_df["labels"][i])

  pano = Image.open(pano_path)
  draw = ImageDraw.Draw(pano)
  for x, y in pano_labels:
    draw.ellipse((x - 20, y - 20, x + 20, y + 20), fill="red", outline="red")

  pano.save(f"{EXAMPLES_DIR}/{i}.jpg")
