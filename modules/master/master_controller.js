var fs = require("fs");
var path = require("path");

var config = {};
var io = null;

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
    if (!keys[handshakeData.apikey]) return next(new Error("Invalid api key provided"));

    socket.info = keys[handshakeData.apikey];
    next();
  });
  
  io.on("connection", function (socket) {
    initializeSocket(socket);
  });
};

var manifestor = require("../manifestor.js");
var initializeSocket = function (socket) {
  console.log("[Master]", socket.info.title, "connected")
  socket.on("disconnect", function () {
    console.log("[Master]", socket.info.title, "disconnected")
  });
  
  var quickInfo = manifestor.getKeyed(path.resolve(config.basepath, socket.info.folder));
  socket.emit("quickinfo", { offset: 0 });
  socket.on("quickinfo_result", function (data) {
    if (data.next) socket.emit("quickinfo", { offset: data.offset + 1 });    
    if (!data.current) return;
    
    for (var i = 0; i < data.payload.length; i++) {
      if (!quickInfo.hasOwnProperty(data.payload[i].name) || manifestor.needNew(quickInfo[data.payload[i].name]), data.payload[i]) {
        socket.emit("fetch_manifest", { name: data.payload[i].name });
      }
    }
    console.log(data.payload);
  });
  
  socket.on("manifest_result", function (data) {
    console.log(data);
  });
};