var config = {};

var io = require("socket.io-client");
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

var manifestor = require("../manifestor.js");
module.exports.initialize = function () {
  if (!socket) throw new Error("The socket is not created");
  
  var manifests = manifestor.getQuickInfo(config.basepath, config.segmentation);
  socket.on("quickinfo", function (data) {
    var offset = data.offset;
    
    var next = offset + 1 < manifests.length;
    if (offset < 0 || offset >= manifests.length) {
      socket.emit("quickinfo_result", { offset: offset, current: false, next: next });
    }
    
    var slice = manifests[offset];
    socket.emit("quickinfo_result", { offset: offset, current: true, next: next, payload: slice });
  });
  
  socket.on("fetch_manifest", function (data) {
    socket.emit("manifest_result", { name: data.name, payload: manifestor.getManifest(config.basepath, data.name)});
  });
};