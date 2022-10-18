let panorama;
let label_data;
function get_sv_coords() {
  // image_width = label_metadata["image_width"]
  // image_height = label_metadata["image_height"]
  // canvas_width = label_metadata["canvas_width"]
  // canvas_height = label_metadata["canvas_height"]
  // canvas_x = label_metadata["canvas_x"]
  // canvas_y = label_metadata["canvas_y"]
  // zoom = label_metadata["zoom"]
  // heading = label_metadata["heading"]
  // pitch = label_metadata["pitch"]
  // photographer_heading = label_metadata["photographer_heading"]
  // photographer_pitch = label_metadata["photographer_pitch"]
  // h0 = heading * np.pi / 180.0
  // p0 = pitch * np.pi / 180.0
  // fov = (126.5 - (zoom * 36.75) if zoom <= 2 else 195.93 / (1.92 ** zoom)) * np.pi / 180.0
  // f = 0.5 * canvas_width / np.tan(0.5 * fov)
  // x0 = f * np.cos(p0) * np.sin(h0)
  // y0 = f * np.cos(p0) * np.cos(h0)
  // z0 = f * np.sin(p0)
  // du = canvas_x - canvas_width / 2
  // dv = canvas_height / 2 - canvas_y
  // ux = np.sign(np.cos(p0)) * np.cos(h0)
  // uy = -np.sign(np.cos(p0)) * np.sin(h0)
  // uz = 0
  // vx = -np.sin(p0) * np.sin(h0)
  // vy = -np.sin(p0) * np.cos(h0)
  // vz = np.cos(p0)
  // x = x0 + du * ux + dv * vx
  // y = y0 + du * uy + dv * vy
  // z = z0 + du * uz + dv * vz
  // R = np.sqrt(x * x + y * y + z * z)
  // h = np.arctan2(x, y)
  // p = np.arcsin(z / R)
  // heading = h * 180.0 / np.pi
  // pitch = p * 180.0 / np.pi
  // horizontal_scale = 2 * np.pi / image_width
  // amplitude = photographer_pitch * image_height / 180
  // original_x = round((heading - photographer_heading) / 180 * image_width / 2 + image_width / 2) % image_width
  // original_y = round(image_height / 2 + amplitude * np.cos(horizontal_scale * original_x))
  // point = np.array([original_x, original_y])
  // cosine_slope = amplitude * -np.sin(horizontal_scale * original_x) * horizontal_scale
  // if cosine_slope != 0:
  //     normal_slope = -1 / cosine_slope
  //     offset_vec = np.array([1, normal_slope])
  //     if normal_slope < 0:
  //         offset_vec *= -1
  // else:
  //     offset_vec = np.array([0, 1])
  // normalized_offset_vec = offset_vec / np.linalg.norm(offset_vec)
  // offset_vec_scalar = -pitch / 180 * image_height
  // final_offset_vec = normalized_offset_vec * offset_vec_scalar
  // final_point = point + final_offset_vec
  // return round(final_point[0]), round(final_point[1])
}

async function initialize() {
  const myForm = document.getElementById("myForm");
  const csvFile = document.getElementById("csvFile");

  myForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const input = csvFile.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const text = e.target.result;
      label_data = d3.csvParse(text);
    };

    reader.readAsText(input);
  });

  panorama = new google.maps.StreetViewPanorama(
    document.getElementById("streetview"),
    {
      pano: "EJ9gACh3lHF56-vu8I437g",
    }
  );
  window.setTimeout(() => {
    panorama.setPov({
      pitch: 0,
      heading: 0,
    });
  }, 1000);
}
