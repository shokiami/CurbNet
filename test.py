from PIL import Image, ImageDraw
import pandas as pd

panos_df = pd.read_csv("seattle_panos.csv")

pano_path = "panos/" + panos_df["pano_id"][0] + ".jpg"
pano_labels = eval(panos_df["labels"][0])

pano = Image.open(pano_path)
draw = ImageDraw.Draw(pano)
for x, y in pano_labels:
  draw.ellipse((x - 20, y - 20, x + 20, y + 20), fill = 'blue', outline ='blue')

pano.save("test.jpg")
