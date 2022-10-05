import http.client
import json
import math
import multiprocessing as mp
import numpy as np
import os
import pandas as pd
import shutil
import subprocess
from subprocess import DEVNULL, STDOUT
from time import perf_counter

NUM_PANOS = 10
PANOS_DIR = "panos/"
CITY = "seattle"
SIDEWALK_API_ENDPOINT = "sidewalk-sea.cs.washington.edu"

BATCH_SIZE = 1000
BATCH_TXT_DIR = "batches/"

SFTP_KEY_PATH = "sftp_key"

def get_labels():
    print("downloading label csv...")
    conn = http.client.HTTPSConnection(SIDEWALK_API_ENDPOINT)
    conn.request("GET", "/adminapi/labels/cvMetadata")
    response = conn.getresponse()
    while response.status != 200:
        conn = http.client.HTTPSConnection(SIDEWALK_API_ENDPOINT)
        conn.request("GET", "/adminapi/labels/cvMetadata")
        response = conn.getresponse()
    print("label csv downloaded!")
    data = response.read()
    pano_info = json.loads(data)
    # Structure of JSON data
    # [
    #     {
    #         "label_id":47614,
    #         "gsv_panorama_id":"sHMY67LdNX48BFwpbGMD3A",
    #         "label_type_id":2,
    #         "agree_count":1,
    #         "disagree_count":0,
    #         "notsure_count":0,
    #         "image_width":16384,
    #         "image_height":8192,
    #         "sv_image_x":6538,
    #         "sv_image_y":-731,
    #         "canvas_width":720,
    #         "canvas_height":480,
    #         "canvas_x":275,
    #         "canvas_y":152,
    #         "zoom":1,
    #         "heading":190.25,
    #         "pitch":-34.4375,
    #         "photographer_heading":292.4190368652344,
    #         "photographer_pitch":-3.3052749633789062
    #     },
    #     ...
    # ]
    return pd.DataFrame.from_records(pano_info)

def get_sv_coords(label_metadata):
    image_width = label_metadata["image_width"]
    image_height = label_metadata["image_height"]
    canvas_width = label_metadata["canvas_width"]
    canvas_height = label_metadata["canvas_height"]
    canvas_x = label_metadata["canvas_x"]
    canvas_y = label_metadata["canvas_y"]
    zoom = label_metadata["zoom"]
    heading = label_metadata["heading"]
    pitch = label_metadata["pitch"]
    photographer_heading = label_metadata["photographer_heading"]
    photographer_pitch = label_metadata["photographer_pitch"]

    h0 = heading * np.pi / 180.0
    p0 = pitch * np.pi / 180.0

    fov = (126.5 - (zoom * 36.75) if zoom <= 2 else 195.93 / (1.92 ** zoom)) * np.pi / 180.0
    f = 0.5 * canvas_width / np.tan(0.5 * fov)

    x0 = f * np.cos(p0) * np.sin(h0)
    y0 = f * np.cos(p0) * np.cos(h0)
    z0 = f * np.sin(p0)

    du = canvas_x - canvas_width / 2
    dv = canvas_height / 2 - canvas_y

    ux = np.sign(np.cos(p0)) * np.cos(h0)
    uy = -np.sign(np.cos(p0)) * np.sin(h0)
    uz = 0

    vx = -np.sin(p0) * np.sin(h0)
    vy = -np.sin(p0) * np.cos(h0)
    vz = np.cos(p0)

    x = x0 + du * ux + dv * vx
    y = y0 + du * uy + dv * vy
    z = z0 + du * uz + dv * vz

    R = np.sqrt(x * x + y * y + z * z)
    h = np.arctan2(x, y)
    p = np.arcsin(z / R)

    heading = h * 180.0 / np.pi
    pitch = p * 180.0 / np.pi

    horizontal_scale = 2 * np.pi / image_width
    amplitude = photographer_pitch * image_height / 180

    original_x = round((heading - photographer_heading) / 180 * image_width / 2 + image_width / 2) % image_width
    original_y = round(image_height / 2 + amplitude * np.cos(horizontal_scale * original_x))

    point = np.array([original_x, original_y])
    cosine_slope = amplitude * -np.sin(horizontal_scale * original_x) * horizontal_scale
    if cosine_slope != 0:
        normal_slope = -1 / cosine_slope
        offset_vec = np.array([1, normal_slope])
        if normal_slope < 0:
            offset_vec *= -1
    else:
        offset_vec = np.array([0, 1])
    
    normalized_offset_vec = offset_vec / np.linalg.norm(offset_vec)
    offset_vec_scalar = -pitch / 180 * image_height

    final_offset_vec = normalized_offset_vec * offset_vec_scalar
    final_point = point + final_offset_vec

    return round(final_point[0]), round(final_point[1])

def download_panos(pano_ids):
    print("downloading panos...")
    start_time = perf_counter()
    num_batches = math.ceil(NUM_PANOS / BATCH_SIZE)
    for i in range(num_batches):
        # download batch from SFTP server
        batch_download_panos(pano_ids[i * BATCH_SIZE : (i + 1) * BATCH_SIZE])
        print(f"batch {i + 1}/{num_batches}: {perf_counter() - start_time}")
    print("panos downloaded!")

def batch_download_panos(pano_ids):
    if not os.path.isdir(BATCH_TXT_DIR):
        os.makedirs(BATCH_TXT_DIR)
    
    # get available cpu_count
    cpu_count = mp.cpu_count() if mp.cpu_count() <= 8 else 8

    # split pano_ids into chunks for multithreading
    i = 0
    processes = []
    chunk_size = math.ceil(len(pano_ids) / cpu_count)
    for i in range(cpu_count):
        process = mp.Process(target=thread_download_panos, args=(pano_ids[i * chunk_size : (i + 1) * chunk_size], i))
        processes.append(process)

    # start processes
    for p in processes:
        p.start()

    # join processes once finished
    for p in processes:
        p.join()

    # remove batch txts
    for file in os.scandir(BATCH_TXT_DIR):
        os.remove(file.path)
    os.rmdir(BATCH_TXT_DIR)

def thread_download_panos(pano_ids, thread_id):
    sftp_command_list = ["cd {}".format(f"sidewalk_panos/Panoramas/scrapes_dump_{CITY}"), "lcd {}".format(PANOS_DIR)]

    # create collection of commands
    for pano_id in pano_ids:
        # get first two characters of pano id
        two_chars = pano_id[:2]
        # get jpg for pano id
        sftp_command_list.append("-get ./{prefix}/{full_id}.jpg".format(prefix=two_chars, full_id=pano_id))

    thread_batch_txt = f"{BATCH_TXT_DIR}/batch{thread_id}.text"
    bash_command = f"sftp -b {thread_batch_txt} -P 9000 -i {SFTP_KEY_PATH} ml-sftp@sftp.cs.washington.edu"
    with open(thread_batch_txt, "w", newline="") as sftp_file:
        for sftp_command in sftp_command_list:
            sftp_file.write("%s\n" % sftp_command)
        sftp_file.write("quit\n")

    sftp = subprocess.Popen(bash_command.split(), shell=False, stdout=DEVNULL, stderr=STDOUT)
    sftp.communicate()
    if sftp.returncode != 0:
        print("sftp failed on one or more commands: {0}".format(sftp_command_list))

if __name__ ==  "__main__":
    # create empty panos dir
    if os.path.isdir(PANOS_DIR):
        shutil.rmtree(PANOS_DIR)
    os.makedirs(PANOS_DIR)
    
    # download labels
    labels_df = get_labels()
    # filter for curb ramps
    labels_df = labels_df[labels_df["label_type_id"] == 1]
    # filter out labels with missing metadata
    labels_df = labels_df.dropna()
    # save labels csv
    labels_df.to_csv(f"{CITY}_labels.csv", index=False)
    # labels_df = pd.read_csv("seattle_labels.csv")

    # map pano_ids to a list of label coords
    pano_labels = {}
    for _, row in labels_df.iterrows():
        pano_id = row["gsv_panorama_id"]
        if not pano_id in pano_labels:
            pano_labels[pano_id] = []
        pano_labels[pano_id].append(get_sv_coords(row))

    # convert to map to df
    panos_df = pd.DataFrame(pano_labels.items(), columns=["pano_id", "labels"])
    # truncate panos
    panos_df = panos_df.head(NUM_PANOS)
    # save panos csv
    panos_df.to_csv(f"{CITY}_panos.csv", index=False)

    # get list of pano ids and then download
    pano_ids = panos_df["pano_id"].to_list()
    download_panos(pano_ids)
