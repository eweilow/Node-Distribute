var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");

module.exports.readOrMake = function (p, create) {

  var filepath = path.resolve(p).toString();
  var make = function (fullpath, data) {
    mkdirp.sync(path.dirname(fullpath));
    
    fs.writeFileSync(fullpath, JSON.stringify(data, null, "\t"));
  };

  var created = null;
  try {
    created = create();
    
    if (!fs.existsSync(filepath)) {
      make(filepath, created);
      return created;
    }
    var read = fs.existsSync(filepath) ? JSON.parse(fs.readFileSync(filepath).toString()) : {};
    var data = module.exports.override(read, created);
    return data;
  } catch (error) {
    console.log(filepath, error.stack);
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