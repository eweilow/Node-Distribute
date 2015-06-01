var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");

var manifestFile = ".manifest";

module.exports = function (folder) {
  var retval = {};
  
  retval.getFolder = function () { return folder; }
  
  retval.getKeyed = function () {
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

  retval.getManifest = function (file) {
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

  retval.getQuickInfo = function (segment) {
    var segmentation = segment || 10;
    var manifests = [];
    if (!fs.existsSync(folder)) return manifests;
    fs.readdirSync(folder).forEach(function (file) {
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
  
    
  retval.needNew = function (current, offsite) {
    return current && offsite && current.edited < offsite.edited;
  }
  
  retval.save = function (name, data) {
    if (path.extname(name) !== manifestFile) return console.error("Invalid extension for manifest: ", name);

    mkdirp(folder);
    
    try {
      fs.writeFileSync(path.join(folder, name), JSON.stringify(data));
    } catch (error) {
      console.error(error);
    }
  }

  return retval;
};
