var panorama;
var label_data = [];

function main() {
  const myForm = document.getElementById("myForm");
  const csvFile = document.getElementById("csvFile");

  myForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const iMathut = csvFile.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const text = e.target.result;
      let csv_label_data = d3.csvParse(text);
      load_label_data(csv_label_data);
    };

    reader.readAsText(iMathut);
  });

  panorama = new google.maps.StreetViewPanorama(
    document.getElementById("streetview"),
    {
      pano: "EJ9gACh3lHF56-vu8I437g",
    }
  );
  // panorama.setPov({
  //   pitch: 0,
  //   heading: 0,
  // });
}

function load_label_data(csv_label_data) {
  for (let label_metadata of csv_label_data) {
    let [calculated_x, calculated_y] = calculate_coords(label_metadata);
    label_data.push({
      "label_id": label_metadata["label_id"],
      "panorama_id": label_metadata["gsv_panorama_id"],
      "calculated_x": calculated_x,
      "calculated_y": calculated_y,
      "actual_x": null,
      "actual_y": null
    });
  }
  console.log(label_data);
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
  let h0 = heading * Math.PI / 180.0;
  let p0 = pitch * Math.PI / 180.0;
  let fov = 126.5 - (zoom * 36.75);
  if (zoom > 2) {
    fov = 195.93 / (1.92 ** zoom);
  }
  fov *= Math.PI / 180.0;
  let f = 0.5 * canvas_width / Math.tan(0.5 * fov);
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
  heading = h * 180.0 / Math.PI;
  pitch = p * 180.0 / Math.PI;
  let horizontal_scale = 2 * Math.PI / image_width;
  let amplitude = photographer_pitch * image_height / 180;
  let original_x = (Math.round((heading - photographer_heading) / 180 * image_width / 2 + image_width / 2) + image_width) % image_width;
  let original_y = Math.round(image_height / 2 + amplitude * Math.cos(horizontal_scale * original_x));
  let cosine_slope = amplitude * -Math.sin(horizontal_scale * original_x) * horizontal_scale;
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
  let offset_vec_scalar = -pitch / 180 * image_height;
  let finalized_offset_x = normalized_offset_x * offset_vec_scalar;
  let finalized_offset_y = normalized_offset_y * offset_vec_scalar;
  return [Math.round(original_x + finalized_offset_x), Math.round(original_y + finalized_offset_y)];
}
