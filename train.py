# import torch
# from torch import nn
# from torch import optim
# from torchvision import transforms
import numpy as np
import pandas as pd
import numpy as np
from PIL import Image, ImageDraw

RES = 100

panos_df = pd.read_csv("seattle_panos.csv")

pano_path = "panos/" + panos_df["pano_id"][17] + ".jpg"
pano_labels = eval(panos_df["labels"][17])

labelled_pano = Image.open(pano_path)
draw = ImageDraw.Draw(labelled_pano)
for x, y in pano_labels:
  draw.ellipse((x - 20, y - 20, x + 20, y + 20), fill="red", outline="red")

labelled_pano.save(f"labelled_pano.jpg")

confmap_pano = Image.open(pano_path)
w, h = confmap_pano.size
confmap = np.zeros((int(w / RES), int(h / RES)))
for i in range(confmap.shape[0]):
  for j in range(confmap.shape[1]):
    block_x = i * RES + RES / 2
    block_y = j * RES + RES / 2
    max_conf = 0
    for label_x, label_y in pano_labels:
      if abs(label_x - block_x) < 1000 and abs(label_y - block_y) < 1000:
        max_conf = max(np.exp(-0.00005 * ((label_x - block_x)**2 + (label_y - block_y)**2)), max_conf)
    confmap[i, j] = max_conf
draw = ImageDraw.Draw(confmap_pano, "RGBA")
for i in range(confmap.shape[0]):
  for j in range(confmap.shape[1]):
    draw.rectangle((i * RES, j * RES, (i + 1) * RES, (j + 1) * RES), fill=(255, 0, 0, int(255 * confmap[i, j])))

confmap_pano.save(f"confmap_pano.jpg")
