var fs = require("fs");
var path = require("path");

var keys = JSON.parse(fs.readFileSync("./secret/keys.json").toString());

module.exports.run = function (rootfolder, io) {
  io.use(function (socket, next) {
    var handshakeData = socket.handshake.query;

    if (!handshakeData.apikey) return next(new Error("No api key provided"));

    if (!keys[handshakeData.apikey]) return next(new Error("Invalid api key provided"));

    socket.info = keys[handshakeData.apikey];
    next();
  });

  io.on('connection', function (socket) {
    
    console.log("new connection:", socket.info);
    socket.emit('meta', {});
    
    if (!fs.existsSync(path.join(rootfolder, socket.info.folder))) fs.mkdir(path.join(rootfolder, socket.info.folder));
    
    socket.on('metaresult', function (data) {      
      if (data.next) {
        socket.emit('meta', {});
      }
      
      if (!data.current) return;
      
      var p = path.join(rootfolder, socket.info.folder, path.basename(data.name));
      
      fs.exists(p, function (exists) {
        var fetch = function () {
          socket.emit("pull", { name: data.name });
        };
        if (exists) {
          fs.readFile(p, function (err, fdata) {
            try {
              if (err) { return console.error(err); }
              var parse = JSON.parse(fdata.toString());

              if (data.payload.edited > parse.edited) {
                fetch();
              }
            } catch (error) {
              console.error(error, p);
            }
          });
        } else {
          fetch();
        }
      });
    });
    
    socket.on('manifest', function (data) {
      if (!data || !data.current) {
        return;
      }
      console.log("downloaded manifest", data, path.join(rootfolder, socket.info.folder, path.basename(data.name)));
      fs.writeFile(path.join(rootfolder, socket.info.folder, path.basename(data.name)), JSON.stringify(data.payload));


      socket.emit("file", { id: data.id });
    });
    
    socket.on('disconnect', function () {
      console.log("lost connection:", socket.info);
      delete socket;
    });
  });
};