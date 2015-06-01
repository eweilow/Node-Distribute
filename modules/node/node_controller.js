var config = {};

var io = require("socket.io-client");
var path = require("path");
var socket = null;

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
  
  var basefolder = path.resolve(config.basepath);
  var manifestor = require("../manifestor.js")(basefolder);
    
  var manifests = manifestor.getQuickInfo(config.segmentation);
  
  socket.on("quickinfo", function (data) {
    var offset = data.offset || 0;
    
    var next = offset + 1 < manifests.length;
    if (offset < 0 || offset >= manifests.length) {
      socket.emit("quickinfo_result", { offset: offset, current: false, next: next });
    }
    
    var slice = manifests[offset];
    socket.emit("quickinfo_result", { offset: offset, current: true, next: next, payload: slice });
  });
  
  socket.on("fetch_manifest", function (data) {
    socket.emit("manifest_result", { name: data.name, payload: manifestor.getManifest(data.name)});
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
      if (!quickInfoData[data.key].hasOwnProperty(data.payload[i].name) || offsiteManifestors[data.key].needNew(quickInfoData[data.key][data.payload[i].name], data.payload[i])) {
        socket.emit("fetch_manifest", { key: data.key, name: data.payload[i].name });
      }
    }
  });
  socket.on("manifest_result", function (data) {
    console.log("Saving");
    offsiteManifestors[data.key].save(data.name, data.payload);
  });
};