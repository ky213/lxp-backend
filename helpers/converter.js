module.exports = {
  ConvertImageBufferToBase64,
  ConvertDateToYYYYMMDD,
  ConverYYYYMMDDToDate,
  bytesToSize
};

function ConvertImageBufferToBase64(binaryImage) {
  if (binaryImage == null) return null;

  return Buffer.from(binaryImage).toString();
}

function ConvertDateToYYYYMMDD(date) {
  var mm = date.getMonth() + 1; // getMonth() is zero-based
  var dd = date.getDate();

  return [
    date.getFullYear(),
    (mm > 9 ? "" : "0") + mm,
    (dd > 9 ? "" : "0") + dd
  ].join("");
}

function ConverYYYYMMDDToDate(dateString) {
  var yyyy = dateString.substring(0, 4);
  var mm = dateString.substring(4);
  mm = mm.substring(0, 2);

  var dd = dateString.substring(6);
  dd = dd.substring(0, 2);

  return new Date(yyyy, mm - 1, dd);
}

function bytesToSize(bytes) {
  var marker = 1024; // Change to 1000 if required
  var decimal = 2; // Change as required
  var kiloBytes = marker; // One Kilobyte is 1024 bytes
  var megaBytes = marker * marker; // One MB is 1024 KB
  var gigaBytes = marker * marker * marker; // One GB is 1024 MB
  var teraBytes = marker * marker * marker * marker; // One TB is 1024 GB

  // return bytes if less than a KB
  if (bytes < kiloBytes) return bytes + " Bytes";
  // return KB if less than a MB
  else if (bytes < megaBytes)
    return (bytes / kiloBytes).toFixed(decimal) + " KB";
  // return MB if less than a GB
  else if (bytes < gigaBytes)
    return (bytes / megaBytes).toFixed(decimal) + " MB";
  // return GB if less than a TB
  else return (bytes / gigaBytes).toFixed(decimal) + " GB";
}
