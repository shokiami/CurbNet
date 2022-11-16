import glob
import os
import pandas as pd

PANOS_DIR = "../panos"

panos_df = pd.DataFrame([os.path.splitext(os.path.basename(path))[0] for path in glob.glob(PANOS_DIR + "/*.jpg")], columns=["pano_id"])
panos_df.to_csv("../pano_ids.csv", index=False)
