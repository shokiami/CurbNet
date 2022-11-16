import glob
import os
import pandas as pd

PANOS_DIR = "../panos"

panos_df = pd.DataFrame(os.path.basename(path) for path in glob.glob(PANOS_DIR + "/*.jpg"))
panos_df.to_csv("../panos_list.csv", header=False, index=False)
