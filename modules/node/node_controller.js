var config = {};

var io = require("socket.io-client");
var path = require("path");
var socket = null;

var offsite = {};

module.exports.configuration = function (options) {
  config = options;
};

module.exports.connect = function () {
  console.log("[Node] Connecting to:", "http://" + config.host + ":" + config.port,"using apikey:", config.apikey);
  if (!socket) socket = io.connect("http://" + config.host + ":" + config.port, { query: "apikey=" + config.apikey });
  else socket.connect();
};

module.exports.disconnect = function () {
  console.log("[Node] Disconnecting.");
  socket.disconnect();
};

module.exports.initialize = function () {
  if (!socket) throw new Error("The socket is not created");
  
  var repository = require("../repository.js")(config.basepath, [".manifest", ".txt"]);
  
  socket.on("quickinfo", function (data) {
    repository.getSegmentedInfo(config.segmentation, function (err, fileinfo) {
      for (var i = 0; i < fileinfo.length; i++) {
        socket.emit("quickinfo_result", { payload: fileinfo[i] });
      }
    });
  });
  
  socket.on("fetch_file", function (data) {
    repository.getFile(data.name, function (err, filedata) {
      if (err) return console.error(err);
      repository.getLastModified(data.name, function (err, date) {
        if (err) return console.error(err);
        socket.emit("file", { name: data.name, unix: date.getTime(), payload: filedata });
      });
    });
  });
  
  socket.emit("nodes", {}); 
  
  socket.on("nodes", function (data) {
    for (var it in data) {
      var node = data[it];
      if (!offsite.hasOwnProperty(node.folder)) {
        offsite[node.folder] = require("../repository.js")(path.join(config.basepath, "offsite", path.basename(node.folder)));
      }
      socket.emit("quickinfo", { node: node.folder });
    }
  });
  
  socket.on("quickinfo_result", function (data) {
    var node = data.node;
    var offsiterepository = offsite[node];
    
    if (!offsiterepository) return console.error("No repository with that folder");
    
    var keys = Object.keys(data.payload);
    
    var iterator = function (keys, index) {
      if (index >= keys.length) return;
      
      var name = keys[index];
      offsiterepository.hasNewerOnDisk(name, new Date(data.payload[name].unix), function (err, state, a, b) {
        if (err) return console.error(err);
        if (!state) {
          socket.emit("fetch_file", { node: node, name: name });
        }
      });
      iterator(keys, index + 1);
    };
    iterator(keys, 0);
  });
  
  socket.on("file", function (data) {
    var node = data.node;
    var offsiterepository = offsite[node];    
    if (!offsiterepository) return console.error("No repository with that folder");
    
    offsiterepository.saveFileWithDate(data.name, new Date(data.unix), data.payload, function (err) {

      if (err) return console.error(err);
      console.log("[Node] Saved file", data.name, "from", node);
    });
  });
    /*
  repository.getSegmentedInfo(config.segmentation, function (err, fileinfo) {
    if (err) return console.error(err);
    
    socket.on("quickinfo", function (data) {
      var offset = data.offset || 0;

      var next = offset + 1 < fileinfo.length;
      if (offset < 0 || offset >= fileinfo.length) {
        socket.emit("quickinfo_result", { offset: offset, current: false, next: next });
      }

      var slice = fileinfo[offset];
      socket.emit("quickinfo_result", { offset: offset, current: true, next: next, payload: slice });
    });

    socket.on("fetch_file", function (data) {
      socket.emit("file_result", { name: data.name, payload: repository.get(data.name) });
    });

    var offsiteManifestors = {};
    var quickInfoData = {};
    socket.emit("nodes", {});
    socket.on("nodes", function (nodes) {
      for (var i = 0; i < nodes.length; i++) {
        socket.emit("quickinfo", { offset: 0, key: nodes[i].folder });

        if (!offsiteManifestors.hasOwnProperty(nodes[i].folder)) {
          offsiteManifestors[nodes[i].folder] = require("../manifestor.js")(path.join(config.basepath, path.basename(nodes[i].folder)));
        }
        quickInfoData[nodes[i].folder] = offsiteManifestors[nodes[i].folder].getKeyed();
      }
    });
    socket.on("quickinfo_result", function (data) {
      if (data.next) socket.emit("quickinfo", { key: data.key, offset: data.offset + 1 });
      if (!data.current) return;

      for (var i = 0; i < data.payload.length; i++) {
        if (!quickInfoData[data.key].hasOwnProperty(data.payload[i].name) || offsiteManifestors[data.key].needNew(quickInfoData[data.key][data.payload[i].name], data.payload[i])) {
          socket.emit("fetch_manifest", { key: data.key, name: data.payload[i].name });
        }
      }
    });
    socket.on("manifest_result", function (data) {
      console.log("Saving");
      offsiteManifestors[data.key].save(data.name, data.payload);
    });
  });*/
};