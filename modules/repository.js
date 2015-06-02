var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");
var util = require("util");

var manifestFile = ".manifest";

module.exports = function (f, a) {
  var retval = {};
  var allowed = a ||  [];
  
  var folder = path.resolve(f);  
  retval.getFolder = function () { return folder; }
  
  retval.getFiles = function (callback) {
    fs.readdir(folder, function (err, files) {
      if (err) return callback(err, []);

      var ret = [];
      for (var i = 0; i < files.length; i++) {
        if (path.extname(files[i]).length > 1) {
          if (allowed.length === 0 || allowed.indexOf(path.extname(files[i])) >= 0) {
            ret.push(files[i]);
          }
        }
      }
      callback(err, ret);
    });
  };
  
  retval.normalize = function (filename) {
    return path.join(folder, path.basename(filename));
  }
  
  retval.exists = function (name, callback) {
    fs.exists(retval.normalize(name), function (exists) { callback(exists); });
  };
  
  retval.getFile = function (name, callback) {
    var p = retval.normalize(name);
    if (!fs.existsSync(p)) {
      return callback(new Error("File not found."), null);
    }
    fs.readFile(p, callback);
  };
  
  retval.getFileAsJson = function (name, callback) {
    retval.getFile(name, function (err, fileData) {
      if (err) return callback(err, fileData);
      
      try {
        callback(err, JSON.parse(fileData));
      } catch (error) {
        callback(error, fileData);
      }
    });
  }
  
  retval.getLastModified = function(name, callback) {
    fs.stat(retval.normalize(name), function (err, stats) {
      if (err) return callback(err, null);
      if (!stats.mtime) return callback(new Error("Stats did not return modified time."), null);
      
      return callback(err, stats.mtime);
    }) 
  }
  
  retval.saveFile = function (name, str, callback) {
    fs.writeFile(retval.normalize(name), str, callback);
  };
  retval.saveFileWithDate = function (name, date, str, callback) {
    var p = retval.normalize(name);
    fs.writeFile(p, str, function (err) {
      if (err) return callback(err);
      fs.utimes(p, new Date(), date, function (err) {
        callback(err);
      });
    });
  };
  
  retval.saveFileAsJson = function (name, data, callback) {
    retval.saveFile(name, JSON.stringify(data), callback);
  };
  
    
  retval.isNewer = function(name, date, callback) {
    retval.getLastModifies(name, function (err, time) {
      return time.getTime() < date.getTime(); 
    });
  };
    
  
  return retval;
};
