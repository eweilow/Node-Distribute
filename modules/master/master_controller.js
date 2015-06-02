var fs = require("fs");
var path = require("path");

var nodes = {};
var apikeys = {};

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
  
  for (var i = 0; i < keys.length; i++) {
    nodes[keys[i].folder] = { title: keys[i].title, folder: keys[i].folder };
    apikeys[keys[i].apikey]  = nodes[keys[i].folder];
  }
  /*
  var manifestor = require("../manifestor.js");
  for (var i = 0; i < keys.length; i++) {
    var node = keys[i];
    var p = path.resolve(path.join(config.basepath, node.folder));
    manifestors[node.folder] = manifestor(p);
    nodes.push({ title: node.title, folder: node.folder });
    apikeys[node.apikey]  = node;
  }
  console.log(Object.keys(manifestors));
  */
  
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
    socket.info.repository = require("../repository.js")(path.join(config.basepath, socket.info.folder));
    next();
  });
  
  
  io.on("connection", function (socket) {
    initializeSocket(socket);
  });
};

var initializeSocket = function (socket) {
  var repository = socket.info.repository;
  
  console.log("[Master]", socket.info.title, "connected");

  socket.on("disconnect", function () {
    console.log("[Master]", socket.info.title, "disconnected");
  });
  
  /* Node to master traffic below */
  socket.emit("quickinfo", {});
  
  socket.on("quickinfo_result", function (data) {
    var keys = Object.keys(data.payload);
    
    var iterator = function (keys, index) {
      if (index >= keys.length) return;
      
      var name = keys[index];
      repository.hasNewerOnDisk(name, new Date(data.payload[name].unix), function (err, state, a, b) {
        if (err) return console.error(err);
        if (!state) {
          socket.emit("fetch_file", { name: name });
        }
      });
      iterator(keys, index + 1);
    };
    iterator(keys, 0);
  });
  
  socket.on("file", function (data) {
    repository.saveFileWithDate(data.name, new Date(data.unix), data.payload, function (err) {

      if (err) return console.error(err);
      console.log("[Master] Saved file", data.name, "from", socket.info.title);
    });
  });
  
  /* Master to node traffic below */
  socket.on("nodes", function (data) {

  });
  
  socket.on("quickinfo", function (data) {
    repository.getSegmentedInfo(config.segmentation, function (err, fileinfo) {
      for (var i = 0; i < fileinfo.length; i++) {
        socket.emit("quickinfo_result", { payload: fileinfo[i] });
      }
    });
  });
  
  
  
  /*
  socket.emit("quickinfo", { offset: 0 });
  socket.on("quickinfo_result", function (data) {
    if (data.next) socket.emit("quickinfo", { offset: data.offset + 1 });
    if (!data.current) return;

    for (var i = 0; i < data.payload.length; i++) {
      var name = data.payload[i].name;
      if (!repository.existsSync(name) || !repository.hasNewer(name, new Date(data.payload[i].unix)) {
        socket.emit("fetch_file", { name: data.payload[i].name });
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
  });*/
};