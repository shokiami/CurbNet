let panorama;
let label_data = [];
let label_data_index = 0;
const labelsForm = document.getElementById("labelsForm");
const panosForm = document.getElementById("panosForm");
const labelsCSV = document.getElementById("labelsCSV");
const panosCSV = document.getElementById("panosCSV");
const panoImage = document.getElementById("pano");
const calculatedLabel = document.getElementById("calculatedLabel");
const placedLabel = document.getElementById("placedLabel");
const nextButton = document.getElementById("next");
const prevButton = document.getElementById("prev");
const printButton = document.getElementById("print");
const pano_ids = new Set();

panoImage.addEventListener("click", function (e) {
  current_data = label_data[label_data_index];
  current_data.actual_x =
    (parseFloat(e.clientX) / panoImage.width) * current_data.width;
  current_data.actual_y =
    (parseFloat(e.clientY) / panoImage.height) * current_data.height;
  current_data.error_in_pixels = Math.sqrt(
    (current_data.actual_x - current_data.calculated_x) *
      (current_data.actual_x - current_data.calculated_x) +
      (current_data.actual_y - current_data.calculated_y) *
        (current_data.actual_y - current_data.calculated_y)
  );
  placedLabel.style.marginLeft = e.clientX + "px";
  placedLabel.style.marginTop = e.clientY + "px";
});

labelsForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const iMathut = labelsCSV.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const text = e.target.result;
    let csv_label_data = d3.csvParse(text);
    load_label_data(csv_label_data);
  };

  reader.readAsText(iMathut);
});
printButton.addEventListener("click", function (e) {
  let result = "";
  for (const field in label_data[0]) {
    result += `${field},`;
  }
  result += "\n";
  for (const data of label_data) {
    if (data.actual_x && data.actual_y) {
      console.log(data);
      for (const field in data) {
        result += `${data[field]},`;
      }
      result += "\n";
    }
  }
  // console.log(result);
});

panosForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const iMathut = panosCSV.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const text = e.target.result;
    let csv_pano_data = d3.csvParse(text);
    for (const data of csv_pano_data) {
      pano_ids.add(data.pano_id);
    }
  };

  reader.readAsText(iMathut);
});
function main() {
  panorama = new google.maps.StreetViewPanorama(
    document.getElementById("streetview"),
    {
      pano: "EJ9gACh3lHF56-vu8I437g",
    }
  );
}

function load_label_data(csv_label_data) {
  for (let label_metadata of csv_label_data) {
    let [calculated_x, calculated_y] = calculate_coords(label_metadata);
    label_data.push({
      label_id: label_metadata["label_id"],
      panorama_id: label_metadata["gsv_panorama_id"],
      label_pitch: parseFloat(label_metadata["label_pitch"]),
      label_heading: parseFloat(label_metadata["label_heading"]),
      calculated_x: calculated_x,
      calculated_y: calculated_y,
      actual_x: null,
      actual_y: null,
      width: label_metadata["image_width"],
      height: label_metadata["image_height"],
      error_in_pixels: null,
    });
  }
}

function calculate_coords(label_metadata) {
  let image_width = parseInt(label_metadata["image_width"]);
  let image_height = parseInt(label_metadata["image_height"]);
  let canvas_width = parseInt(label_metadata["canvas_width"]);
  let canvas_height = parseInt(label_metadata["canvas_height"]);
  let canvas_x = parseInt(label_metadata["canvas_x"]);
  let canvas_y = parseInt(label_metadata["canvas_y"]);
  let zoom = parseFloat(label_metadata["zoom"]);
  let heading = parseFloat(label_metadata["heading"]);
  let pitch = parseFloat(label_metadata["pitch"]);
  let photographer_heading = parseFloat(label_metadata["photographer_heading"]);
  let photographer_pitch = parseFloat(label_metadata["photographer_pitch"]);
  let h0 = (heading * Math.PI) / 180.0;
  let p0 = (pitch * Math.PI) / 180.0;
  let fov = 126.5 - zoom * 36.75;
  if (zoom > 2) {
    fov = 195.93 / 1.92 ** zoom;
  }
  fov *= Math.PI / 180.0;
  let f = (0.5 * canvas_width) / Math.tan(0.5 * fov);
  let x0 = f * Math.cos(p0) * Math.sin(h0);
  let y0 = f * Math.cos(p0) * Math.cos(h0);
  let z0 = f * Math.sin(p0);
  let du = canvas_x - canvas_width / 2;
  let dv = canvas_height / 2 - canvas_y;
  let ux = Math.sign(Math.cos(p0)) * Math.cos(h0);
  let uy = -Math.sign(Math.cos(p0)) * Math.sin(h0);
  let uz = 0;
  let vx = -Math.sin(p0) * Math.sin(h0);
  let vy = -Math.sin(p0) * Math.cos(h0);
  let vz = Math.cos(p0);
  let x = x0 + du * ux + dv * vx;
  let y = y0 + du * uy + dv * vy;
  let z = z0 + du * uz + dv * vz;
  let R = Math.sqrt(x * x + y * y + z * z);
  let h = Math.atan2(x, y);
  let p = Math.asin(z / R);
  heading = (h * 180.0) / Math.PI;
  label_metadata["label_heading"] = heading;
  pitch = (p * 180.0) / Math.PI;
  label_metadata["label_pitch"] = pitch;
  let horizontal_scale = (2 * Math.PI) / image_width;
  let amplitude = (photographer_pitch * image_height) / 180;
  let original_x =
    (Math.round(
      (((heading - photographer_heading) / 180) * image_width) / 2 +
        image_width / 2
    ) +
      image_width) %
    image_width;
  let original_y = Math.round(
    image_height / 2 + amplitude * Math.cos(horizontal_scale * original_x)
  );
  let cosine_slope =
    amplitude * -Math.sin(horizontal_scale * original_x) * horizontal_scale;
  let offset_x = 0;
  let offset_y = 1;
  if (cosine_slope != 0) {
    let normal_slope = -1 / cosine_slope;
    offset_x = 1;
    offset_y = normal_slope;
    if (normal_slope < 0) {
      offset_x *= -1;
      offset_y *= -1;
    }
  }
  let offset_norm = Math.sqrt(offset_x * offset_x + offset_y * offset_y);
  let normalized_offset_x = offset_x / offset_norm;
  let normalized_offset_y = offset_y / offset_norm;
  let offset_vec_scalar = (-pitch / 180) * image_height;
  let finalized_offset_x = normalized_offset_x * offset_vec_scalar;
  let finalized_offset_y = normalized_offset_y * offset_vec_scalar;
  return [
    Math.round(original_x + finalized_offset_x),
    Math.round(original_y + finalized_offset_y),
  ];
}

nextButton.addEventListener("click", function () {
  do {
    label_data_index += 1;
  } while (!update());
});

prevButton.addEventListener("click", function () {
  do {
    label_data_index -= 1;
  } while (!update());
});

function update() {
  new_data = label_data[label_data_index];
  // not sure how to check if street view can serve pano
  if (pano_ids.has(new_data.panorama_id)) {
    panoImage.src = `../panos/${new_data.panorama_id}.jpg`;
    placedLabel.style.marginLeft = "0px";
    placedLabel.style.marginTop = "0px";
    const label_x_offset =
      (parseFloat(new_data.calculated_x) / parseInt(new_data.width)) *
      panoImage.width;
    const label_y_offset =
      (parseFloat(new_data.calculated_y) / parseInt(new_data.height)) *
      panoImage.height;
    calculatedLabel.style.marginLeft = label_x_offset + "px";
    calculatedLabel.style.marginTop = label_y_offset + "px";
    if (new_data.actual_x) {
      placedLabel.style.marginLeft =
        (parseFloat(new_data.actual_x) / new_data.width) * panoImage.width +
        "px";
      placedLabel.style.marginTop =
        (parseFloat(new_data.actual_y) / new_data.height) * panoImage.height +
        "px";
    }
    panorama = new google.maps.StreetViewPanorama(
      document.getElementById("streetview"),
      {
        pov: {
          heading: new_data.label_heading,
          pitch: new_data.label_pitch,
        },
        pano: new_data.panorama_id,
      }
    );
    return true;
  } else {
    return false;
  }
}
