import pandas as pd
import matplotlib.pyplot as plt

errors_df = pd.read_csv("errors.csv")
errors = errors_df["error_in_pixels"].to_list()

plt.figure(1)
plt.title("Error Frequencies")
plt.hist(errors, bins=10, rwidth=0.95, color="blue")
plt.xlabel("Error in pixels")
plt.ylabel("Number of labels")
plt.savefig("plots/errors.png")

labels_df = pd.read_csv("seattle_labels.csv")
photographer_pitches = []
pitches = []
for _, row in errors_df.iterrows():
  label_row = labels_df[labels_df["label_id"] == row["label_id"]]
  photographer_pitches.append(label_row["photographer_pitch"].values[0])
  pitches.append(label_row["pitch"].values[0])

plt.figure(2)
plt.title("Error vs. Photographer Pitch")
plt.scatter(photographer_pitches, errors)
plt.xlabel("Photographer pitch")
plt.ylabel("Error in pixels")
plt.savefig("plots/error_vs_photographer_pitch.png")

plt.figure(3)
plt.title("Error vs. Pitch")
plt.scatter(pitches, errors)
plt.xlabel("Pitch")
plt.ylabel("Error in pixels")
plt.savefig("plots/error_vs_pitch.png")
