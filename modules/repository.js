var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");
var util = require("util");

module.exports = function (f, a) {
  var retval = {};
  var allowed = a || [];
  
  var folder = path.resolve(f);  
  
  mkdirp(folder);
  
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
  retval.getFilesOfType = function (types, callback) {
    fs.readdir(folder, function (err, files) {
      if (err) return callback(err, []);

      var ret = [];
      for (var i = 0; i < files.length; i++) {
        if (path.extname(files[i]).length > 1) {
          if ((allowed.length === 0 || allowed.indexOf(path.extname(files[i])) >= 0) && types.indexOf(path.extname(files[i])) >= 0) {
            ret.push(files[i]);
          }
        }
      }
      callback(err, ret);
    });
  };
  
  
  retval.getKeyedFiles = function (callback) {
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
  };
  
  retval.exists = function (name, callback) {
    fs.exists(retval.normalize(name), function (exists) { callback(exists); });
  };
  
  retval.existsSync = function (name) {
    return fs.existsSync(retval.normalize(name));
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
      fs.utimes(p, date, date, function (err) {
        callback(err);
      });
    });
  };
  
  retval.getSegmentedInfo = function (segment, callback) {
    var segmentation = segment || 10;

    retval.getFiles(function (err, files) {
      if (err) callback(err, []);
      
      var iterator = function (files, index, manifests, cb) {
        if (index >= files.length) return cb(manifests);
        
        retval.getLastModified(files[index], function (err, date) {
          if (err) return callback(err, []);
          manifests[files[index]] = { unix: date.getTime() };
          iterator(files, index + 1, manifests, cb);
        });
      };
      try {
        iterator(files, 0, {}, function (fileinfo) {
          if (segmentation <= 0) return callback(err, fileinfo);

          var ret = [];
          var keys = Object.keys(fileinfo);
          for (var i = 0; i < keys.length; i += segmentation) {
            var k = keys.slice(i, Math.min(i + segmentation, keys.length));
            var vals = {};
            for (var j = 0; j < k.length; j++) {
              vals[k[j]] = fileinfo[k[j]];
            }
            ret.push(vals);
          }
          callback(err, ret);
        });
      } catch (error) {
        callback(error, []);
      }
      
    });
  };
  
  retval.saveFileAsJson = function (name, data, callback) {
    retval.saveFile(name, JSON.stringify(data), callback);
  };
  
    
  retval.hasNewerOnDisk = function (name, date, callback) {
    if (!retval.existsSync(name)) return callback(null, false);
    
    retval.getLastModified(name, function (err, time) {
      if (err) return callback(err, false);
      callback(err, time.getTime() >= date.getTime(), time, date); 
    });
  };
    
  
  return retval;
};
