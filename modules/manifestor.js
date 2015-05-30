var fs = require("fs");
var path = require("path");

var manifestFile = ".manifest";

module.exports.getKeyed = function (folder) {
  var manifests = {};
  if (!fs.existsSync(folder)) return manifests;
  fs.readdirSync(path.resolve(folder)).forEach(function (file) {
    if (path.extname(file) === manifestFile) {
      try {
        var contents = JSON.parse(fs.readFileSync(path.join(folder, file)).toString());
        manifests[file] = contents;
      } catch (error) {
        console.error(error);
      }
    }
  });
  return manifests;
};

module.exports.getManifest = function (folder, file) {
  var p = path.join(folder, file);
  if (!fs.existsSync(p)) return null;
  try {
    if (path.extname(file) !== manifestFile) return null;
    
    var contents = JSON.parse(fs.readFileSync(p).toString());
    return contents;
  } catch (error) {
    console.error(error);
  }
};

module.exports.getQuickInfo = function (folder, segment) {
  var segmentation = segment || 10;
  var manifests = [];
  if (!fs.existsSync(folder)) return manifests;
  fs.readdirSync(path.resolve(folder)).forEach(function (file) {
    if (path.extname(file) === manifestFile) {
      try {
        var contents = JSON.parse(fs.readFileSync(path.join(folder, file)).toString());
        manifests.push({ name: file, edited: contents.edited });
      } catch (error) {
        console.error(error);
      }
    }
  });
  if (segmentation < 0) return manifests;
  
  var ret = [];
  for (var i = 0; i < manifests.length; i += segmentation) {
    ret.push(manifests.slice(i, Math.min(i + segmentation, manifests.length)));
  }
  return ret;
};

module.exports.needNew = function (current, offsite) {
  return current.edited < offsite.edited;
}