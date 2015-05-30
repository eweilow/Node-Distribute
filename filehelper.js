var fs = require("fs");
var path = require("path");

var manifestFile = ".manifest";

module.exports.getManifests = function (folder) {
  var manifests = [];
  fs.readdirSync(folder).forEach(function (file) {
    if (path.extname(file) === manifestFile) 
    {
      manifests.push(file);
    }
  });
  
  return manifests;
}