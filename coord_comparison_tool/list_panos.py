import glob
import os
import pandas as pd

panos_df = pd.DataFrame(os.path.basename(path) for path in glob.glob("../panos/*.jpg"))
panos_df.to_csv("../panos_list.csv", header=False, index=False)
