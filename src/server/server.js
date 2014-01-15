define([
  "dojo/node!express"
  , "dojo/node!mime-magic"
  , "dojo/node!socket.io"
  , "dojo/node!http"
  , "dojo/has"
  , "dojo/node!fs"
  , "dojo/node!session.socket.io"
  , "dojo/node!connect"
  , "dojo/Deferred"
], function(
  express
  , mimeMagic
  , socketIo
  , http
  , has
  , fs
  , sessionIo
  , connect
  , Deferred
){
  
  // first add our server-modules flag so we can use same source files for server and client
  has.add("server-modules", function(){
    return true; 
  }, true);
  
  require([
    "main/remoteCaller"
    , "main/treeItems"
    , "server/files"
    , "main/nameTranslator"
    , "sol/fileName"
    , "main/contentIO"
    , "main/nodeControl"
    , "main/config"
    , "sol/node/npm"
    , "dojo/node!net"
    , "sol/node/debug/Protocol"
    , "dojo/node!../../lib/terminal.js"
    , "term/server"
    , "main/connection"
    , "dojo/node!adm-zip"
    , "sol/string"
    , "dojo/node!child_process"
  ], function(
    remoteCaller
    , treeItems
    , files
    , nameTranslator
    , fileName
    , ContentIO    // is not used here but must be loaded!!!
    , nodeControl  // is not used here but must be loaded!!!
    , nodeMirrorConfig
    , npm
    , net
    , debugProtocol
    , terminal
    , terminalServer
    , connection
    , AdmZip
    , solString
    , child_process
  ){
    
    var relativeStr = nodeMirrorConfig.webpath;
    
    var dirStr = nodeMirrorConfig["dir"];
    var wd = process.cwd();
    if (!( solString.endsWith(wd, "/") || solString.endsWith(wd, "\\") )){
      wd += "/";
    };
    
    if (( solString.startsWith(dirStr, "/") )){
      
    }else{
      dirStr = wd + dirStr;
    };
    
    dirStr = fileName.normalize(dirStr);
    console.log("file directory: " + dirStr);
    
    //console.log(nodeMirrorConfig);
    
    
    //console.log(nodeMirrorConfig);
    
    //EasyZip = easyZip.EasyZip;
    
    var mirror = express();
    
    var server = http.createServer(mirror);
    
    if (nodeMirrorConfig.username){
      mirror.use(express.basicAuth(nodeMirrorConfig.username, nodeMirrorConfig.password));
    };
    
    var cookieParser = express.cookieParser('my session secret');
    var sessionStore = new connect.middleware.session.MemoryStore();
    
    mirror.use(cookieParser);
    mirror.use(express.session({
      store: sessionStore,
      cookie : {
        path : '/',
        httpOnly : true,
        maxAge : null
      }
    }));
    
    
    mirror.use(express.bodyParser());
    
    mirror.put(relativeStr + 'apicall', function(req, res){
      try{
        remoteCaller.serverCall(req.body).then(function(par){
          res.send({ result: par });
        });
      }catch(e){
        console.log(e);
        res.close();
      };
    });
    
    mirror.put(relativeStr + "reconnect", function(req, res){
      //console.log("----------------- recon request");
      res.setHeader('Content-Type', "application/json");
      res.send({ reconnected: true });
    });
    
    mirror.get(relativeStr + 'download', function(req, res){
      console.log("download:" + req.query.id);
      var filenameStr = nameTranslator.fileName(req.query.id);
      console.log(filenameStr);
      files.contentTypeDef(filenameStr).then(function(parContentType){
        console.log(parContentType);
        if (parContentType == "inode/directory"){
          // creating archives
          //var zip = new EasyZip();
          
          // add local file
          /*zip.zipFolder(filenameStr, function(){
            //res.setHeader('Content-Length', data.length);
            res.setHeader('Content-Disposition', "attachment; filename=\"" + fileName.single(filenameStr) + ".zip\"");
            zip.writeToResponse(res, fileName.single(filenameStr) + ".zip");
            res.end();
          });*/
          var zip = new AdmZip();
          zip.addLocalFolder(filenameStr);
          res.setHeader('Content-Disposition', "attachment; filename=\"" + fileName.single(filenameStr) + ".zip\"");
          res.end(zip.toBuffer());
          
        }else{
          res.setHeader('Content-Type', parContentType);
          fs.readFile(filenameStr, function(err, data){
          if(err){
            console.log("err pos 1");
            console.log(err);
            res.end();
            return;
          };
            res.setHeader('Content-Length', data.length);
            res.setHeader('Content-Disposition', "attachment; filename=\"" + fileName.single(filenameStr) + "\"");
            res.end(data);
          });
        };
      });
    });

    /*jshint sub:true*/
    mirror.get(relativeStr, function(req, res){
      res.setHeader('Content-Type', "text/html");
      fs.readFile(nodeMirrorConfig["static"] + "/index.html", function(err, data){
        if (err){
          res.end(err);
          return;
        };
        var s = data.toString();
        s = s.replace(/{{{relativeStr}}}/g, relativeStr);
        res.end(s);
      });
    });
      
      mirror.use(express.limit(100000000000));
    
    // access to the choosen directory
    mirror.use(relativeStr + "file/", express["static"](dirStr));
    
      
      nodeControl.gpregister.avconv = {};
      
      function x11size(){
            var def = new Deferred();
            var spawn  = child_process.spawn;

            var params = [
              "-root", "_NET_DESKTOP_GEOMETRY"
            ];

            var xprop = spawn('xprop', params);

            var dataAr = [];
            var stream = xprop.stdout;
            stream.on("data", function(data){
              dataAr.push(data);
            });

            stream.on("end", function(){
              var s = Buffer.concat(dataAr).toString("utf8");
              var ar = s.split("=");
              var value = ar[ar.length - 1];
              ar = value.split(",");
              var y = parseInt(ar.pop(), 10);
              var x = parseInt(ar.pop(), 10);
              def.resolve({ x: x, y: y });
              //res.end();
            });

            return def.promise;
      }
      
      if (nodeMirrorConfig.x11terminal){
      
          // x11 forwarding
        mirror.get(relativeStr + "x11.stream", function(req, res){
          req.connection.setTimeout(0);


          var killfun = function(){
            setTimeout(function(){
              killfun();
            }, 30000);
          };

          var format = req.query.format || "ogg";
          console.log("format: " + format);
          var vidid = req.query.vidid || "1"; 

          nodeControl.gpregister.avconv[vidid] = function(){
            killfun();
          };

          res.header("Content-Type", "video/" + format);

          var spawn  = child_process.spawn;

          function s(p, p2){
            return p[format] || p.default || p2;
          };

          x11size().then(function(size){
            //console.log("x11 size:");
            //console.log(size);

            var params = [
              "-re",                   // Real time mode
              "-f","x11grab",          // Grab screen
              "-r","5",              // Framerate
              "-s", size.x + "x" + size.y,   // Capture size
              "-i",":0+" + 0 + "," + 0, // Capture offset
              "-g","0",                // All frames are i-frames
              "-me_method","zero",     // Motion algorithms off
              "-flags2","fast",
              "-vcodec", s( {"webm": "libvpx", ogg: "libtheora" }),      // vp8 encoding / ogg encoding
              "-preset","ultrafast",
              "-tune","zerolatency",
              "-b:v","1M",             // Target bit rate
              "-crf","40",             // Quality
              "-t", "180", // 3 min
              "-f", format,             // File format
            ];
            if (nodeMirrorConfig.x11videotool == "avconv"){
              params.push("-qmin");
              params.push(s({ogg: "7"}, "5"));             // Quantization
              params.push("-qmax");
              params.push(s({ogg: "7"}, "5"));
            };
            if (format == "ogg"){
              params.push("-q:v");
              params.push("6");
            };
            params.push("-");                      // Output to STDOUT

            //avconv -re -f x11grab -r 12 -s 1024x768 -i :3+0,0 -g 1 -me_method zero -flags2 fast -vcodec libvpx -preset ultrafast -tune zerolatecy -b:v 1M -crf 40 -qmin 5 -qmax 5 -t 180 -f webm -
            var avconv;
            try{
              avconv = spawn(nodeMirrorConfig.x11videotool, params);
            }catch(e){
              console.log("error 1");
            };
            killfun = function(){
              console.log("killing avconv");
              delete nodeControl.gpregister.avconv[vidid];
              console.log("step");
              avconv.kill();
              console.log("end");
            };
            //console.log("step 2");
            setTimeout(function(){
              killfun();
            }, 190000);

            var stream;
            try{
              stream = avconv.stdout;
              stream.on("data", function(data){
                try{
                  res.write(data);
                }catch(e){
                  console.log("pipe error");
                };
              });
              stream.on("error", function(){
                console.log("some stream error");
              });
              res.on("error", function(){
                console.log("some res error");
              });
              //stream.pipe(res);
            }catch(e){
              console.log("error 2");
            }

            console.log("step 3");
            try{

            stream.on("end", function(){
              console.log("step end");
              try{
                console.log("avconv: end");
                res.end();
                killfun();
              }catch(e){
                console.log("error 3");
              }
            });

            console.log("step 4");
            res.on("end", function(){
              console.log("step res end");
              try{
                console.log("vid: res end");
                killfun();
                stream.end();
              }catch(e){
                console.log("error 4");
              }
            });
            console.log("step 5");
            res.on("close", function(){
              console.log("step res close");
              try{
                console.log("webm: res close");
                killfun();
                stream.end();
              }catch(e){
                console.log("error 5");
              }
            });
            }catch(e){
              console.log("error 6");
            }
            console.log("step out");

          });

        });

        mirror.get(relativeStr + "x11properties", function(req, res){

          res.header("Content-Type", "application/json");

          x11size().then(function(size){
            res.send(size);
          });
        });
    };
      
    /*  var ulnr = 0;
      
    mirror.post(relativeStr + "ultest", function(req, res){
      fs.readFile(req.files.displayImage.path, function (err, data) {
        // ...
        var newPath = "/home/sol/uploadedFileName" + ulnr++;
        fs.writeFile(newPath, data, function (err) {
          res.redirect("back");
        });
      });
    });*/
      
      
      
    // access to app files
    mirror.use(relativeStr, express["static"](nodeMirrorConfig["static"]));
    
      
    
    server.listen(nodeMirrorConfig.port);
    
    var mainio = socketIo.listen(server);
    
    mainio.set("log level", 0);
    mainio.set("resource", relativeStr + "socket.io");
    
    //var io = mainio.of(relativeStr);
    
    sessionSockets = new sessionIo(mainio, sessionStore, cookieParser);
    
    var pty;
    sessionSockets.on('connection', function (err, mainsocket, session) {
      //var socket = mainsocket.of(relativeStr);
      var socket = mainsocket;
      //console.log("----------------- socket con request");
      if (err){
        console.log("-------------------------------------------------- connection error");
        console.log(err);
        console.log("-------------------------------------------------- connection error");
        if (socket){
          console.log("socket present");
          socket.emit("tryagain");
        };
        return;
      };
      connection.newConnection(socket, session);
      
      //terminalServer.newConnection(socket);
      return;
      
    });
    
  });
}); 
