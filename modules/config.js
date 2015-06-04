var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");

module.exports.readOrMake = function (filepath, create) {

  var make = function (fullpath, data) {
    mkdirp.sync(path.dirname(fullpath));
    fs.writeFileSync(fullpath, JSON.stringify(data, null, "\t"));
  };

  var created = null;
  try {
    created = create();
    var fullpath = path.resolve(filepath);
    
    if (!fs.existsSync(fullpath)) {
      make();
      return created;
    }
    var read = fs.existsSync(fullpath) ? JSON.parse(fs.readFileSync(fullpath).toString()) : {};
    var data = module.exports.override(read, created);
    return data;
  } catch (error) {
    console.log(error);
    return created;
  }
};
module.exports.override = function (argv, cfg) {
  var config = {};
  for (var key in cfg) {
    config[key] = cfg[key];
  }
  for (var key in argv) {
    config[key] = argv[key];
  }
  return config;
}