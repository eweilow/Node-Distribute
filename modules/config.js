var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");

module.exports.readOrMake = function (filepath, create) {

  var make = function (fullpath, data) {
    mkdirp.sync(path.dirname(fullpath));
    fs.writeFileSync(fullpath, JSON.stringify(data, null, "\t"));
  };

  try {
    var fullpath = path.resolve(filepath);
    
    var read = fs.existsSync(fullpath) ? JSON.parse(fs.readFileSync(fullpath).toString()) : {};
    var data = module.exports.override(read, create());
    make(fullpath, data);
    return data;
  } catch (error) {
    throw error;
  }
};
module.exports.override = function (argv, cfg) {
  var config = {};
  for (var key in cfg) {
    if (argv.hasOwnProperty(key)) {
      config[key] = argv[key];
    } else {
      config[key] = cfg[key];
    }
  }
  return config;
}