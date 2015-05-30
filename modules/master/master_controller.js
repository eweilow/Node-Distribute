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
      console.log(timings[ip] + config.minimumretrytime, Date.now());
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

var initializeSocket = function (socket) {
  console.log("[Master]", socket.info.title, "connected")
  socket.on("disconnect", function () {
    console.log("[Master]", socket.info.title, "disconnected")
  });
};