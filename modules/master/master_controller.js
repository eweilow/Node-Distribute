var fs = require("fs");
var path = require("path");

var nodes = {};
var apikeys = {};

var offsiterepositories = {};

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
    apikeys[keys[i].apikey] = nodes[keys[i].folder];
    offsiterepositories[keys[i].folder] = require("../repository.js")(path.join(config.basepath, "offsite", keys[i].folder), config.allowedfiletypes || []);
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
    socket.info.repository = offsiterepositories[socket.info.folder];
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
    socket.disconnected = true;
    console.log("[Master]", socket.info.title, "disconnected");
  });
  
  /* Node to master traffic below */
  socket.emit("quickinfo", {});
  
  socket.on("quickinfo_result", function (data) {
    if (socket.disconnected) return; 
    
    var keys = Object.keys(data.payload);
    
    var iterator = function (keys, index) {
      if (index >= keys.length) return;
      
      var name = keys[index];
      repository.hasNewerOnDisk(name, new Date(data.payload[name].unix), function (err, state, a, b) {
        if (err) return console.error(err);
        if (!state) {
          if (socket.disconnected) return; 
          socket.emit("fetch_file", { name: name });
        }
      });
      iterator(keys, index + 1);
    };
    iterator(keys, 0);
  });
  
  socket.on("file", function (data) {
    if (socket.disconnected) return; 
    
    repository.saveFileWithDate(data.name, new Date(data.unix), data.payload, function (err) {

      if (err) return console.error(err);
      console.log("[Master] Saved file", data.name, "from", socket.info.title);
    });
  });
  
  /* Master to node traffic below */
  socket.on("nodes", function (data) {
    if (socket.disconnected) return; 
    
    var res = [];
    for (var key in nodes) {
      if (nodes[key].folder === socket.info.folder) continue;
      res.push(nodes[key]);
    }
    if (socket.disconnected) return; 
    socket.emit("nodes", res);
  });
  
  socket.on("quickinfo", function (data) {
    if (socket.disconnected) return; 
    
    var folder = data.node;
    var offsiterepository = offsiterepositories[folder];
    offsiterepository.getSegmentedInfo(config.segmentation, function (err, fileinfo) {
      for (var i = 0; i < fileinfo.length; i++) {
        if (socket.disconnected) return; 
        socket.emit("quickinfo_result", { node: folder, payload: fileinfo[i] });
      }
    });  
  });
  
  socket.on("fetch_file", function (data) {
    if (socket.disconnected) return; 
    
    var folder = data.node;
    var offsiterepository = offsiterepositories[folder];
    offsiterepository.getFile(data.name, function (err, filedata) {
      if (err) return console.error(err);
      offsiterepository.getLastModified(data.name, function (err, date) {
        if (err) return console.error(err);
        if (socket.disconnected) return; 
        socket.emit("file", { node:folder, name: data.name, unix: date.getTime(), payload: filedata });
      });
    });
  });
};