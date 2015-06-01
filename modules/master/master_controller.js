var fs = require("fs");
var path = require("path");

var apikeys = {};
var nodes = [];
var config = {};
var io = null;

var manifestors = {};

module.exports.configuration = function (options) {
  config = options;
};

module.exports.listen = function () {
  console.log("[Master] Listening at port", config.port);
  io = require("socket.io")(config.port);
};

module.exports.initialize = function () {
  if (!io) throw new Error("The socket.io object is not created");
  
  var timings = {};
  
  var keys = JSON.parse(fs.readFileSync(path.resolve(config.keyfile)).toString());
  var manifestor = require("../manifestor.js");
  for (var i = 0; i < keys.length; i++) {
    var node = keys[i];
    var p = path.resolve(path.join(config.basepath, node.folder));
    manifestors[node.folder] = manifestor(p);
    nodes.push({ title: node.title, folder: node.folder });
    apikeys[node.apikey]  = node;
  }
  console.log(Object.keys(manifestors));
  
  io.use(function (socket, next) {
    var ip = socket.client.conn.remoteAddress;
    if (timings.hasOwnProperty(ip)) {
      if (timings[ip] + config.minimumretrytime > Date.now()) {
        return next(new Error("Too many retries in too short time"));
      } else {
        timings[ip] = Date.now();
      }
    } else timings[ip] = Date.now();
    var handshakeData = socket.handshake.query;

    if (!handshakeData.apikey) return next(new Error("No api key provided"));
    if (!apikeys[handshakeData.apikey]) return next(new Error("Invalid api key provided"));

    socket.info = apikeys[handshakeData.apikey];
    socket.info.apikey = handshakeData.apikey;
    socket.info.manifestor = manifestors[socket.info.folder];
    next();
  });
  
  
  io.on("connection", function (socket) {
    initializeSocket(socket);
  });
};

var initializeSocket = function (socket) {
  var manifestor = socket.info.manifestor;
  console.log("[Master]", socket.info.title, "connected");
  
  socket.on("disconnect", function () {
    console.log("[Master]", socket.info.title, "disconnected");
  });
  
  var quickInfo = manifestor.getKeyed();
  socket.emit("quickinfo", { offset: 0 });
  socket.on("quickinfo_result", function (data) {
    if (data.next) socket.emit("quickinfo", { offset: data.offset + 1 });    
    if (!data.current) return;
    
    for (var i = 0; i < data.payload.length; i++) {
      if (!quickInfo.hasOwnProperty(data.payload[i].name) || manifestor.needNew(quickInfo[data.payload[i].name], data.payload[i])) {
        socket.emit("fetch_manifest", { name: data.payload[i].name });
      }
    }
  });
  
  socket.on("nodes", function (data) {
    var res = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].folder === socket.info.folder) continue;
      res.push(nodes[i]);
    }
    socket.emit("nodes", res);
  });
  
  socket.on("quickinfo", function (data) {
    var manifests = manifestors[data.key].getQuickInfo(config.segmentation);
    
    var offset = data.offset || 0;
    
    var next = offset + 1 < manifests.length;
    if (offset < 0 || offset >= manifests.length) {
      socket.emit("quickinfo_result", { key: data.key, offset: offset, current: false, next: next });
    }
    
    
    var slice = manifests[offset];
    socket.emit("quickinfo_result", { key: data.key, offset: offset, current: true, next: next, payload: slice });
  });
  socket.on("fetch_manifest", function (data) {
    console.log(data);
    socket.emit("manifest_result", { key: data.key, name: data.name, payload: manifestors[data.key].getManifest(data.name)});
  });
  
  socket.on("manifest_result", function (data) {
    console.log("Saving");
    manifestor.save(data.name, data.payload);
  });
};