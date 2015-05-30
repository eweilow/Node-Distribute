var filehelper = require("./filehelper.js");
var path = require("path");
var fs = require("fs");

module.exports.run = function (basefolder, socket) {
  var manifests = filehelper.getManifests(basefolder);
  
  var parsed = {};
  
  var index = -1;
  socket.on("meta", function (data) {
    ++index;
    if (index >= manifests.length) return socket.emit("metaresult", { current: false, next: false });
    
    try {
      fs.readFile(path.join(basefolder, manifests[index]), function (err, data) {
        if (err) {
          console.error(err);
          return socket.emit("metaresult", { current: false, next: index < manifests.length - 1 });
        }
        var parse = JSON.parse(data.toString());
        parsed[manifests[index]] = parse;
        socket.emit("metaresult", { name: manifests[index], payload: { edited: parse.edited }, current: true, next: index < manifests.length - 1 });
      });
    } catch (err) {
      console.error(err);
      socket.emit("metaresult", { current: false, next: index < manifests.length - 1 });
    }   
  });
  
  socket.on("pull", function (data) {
    var name = data.name;
    console.log(data);
    try {
      return socket.emit("manifest", { current: true, name: name, payload: parsed[name] });
    } catch (err) {
      console.error(err);
      return socket.emit("manifest", { current: false, name: name });
    }  
  });
}