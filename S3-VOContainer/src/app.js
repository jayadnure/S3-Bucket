const express = require("express");
const s3Connector = require("./utlis/connector");
const fileUpload = require("express-fileupload");
const path = require("path");
var multer = require("multer");
var bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
// app.use(express.json());
// default options
// app.use(fileUpload({
//   useTempFiles : true,
//   tempFileDir: path.join(__dirname, 'temp')
// }));

// var storage = multer.memoryStorage({
//   destination: function(req, file, callback) {
//     callback(null, "./src/tmp");
//   },
//   filename: function(req, file, callback) {
//     callback(null, file.fieldname + "-" + Date.now());
//   }
// });
var upload = multer({ dest: "./src/tmp" }).array("artifactFile", 1);

app.get("/about", (req, resp) => {
  resp.send("This repository is to store and manage 3d objects");
  // resp.send('<html><body><h1>Hello World</h1></body></html>');
});

app.post("/uploadArtifact", (req, resp) => {
  upload(req, resp, function(err) {
    console.log(req.body);
    console.log(req.files);
    if (err) {
      return resp.status(400).send(err);
    } else {
      s3Connector.uploadArtifact(req, (result, error) => {
        if (error) {
          return resp.status(400).send(error);
        } else {
          resp.send(result);
        }
      });
    }
  });
});

app.get("/getArtifacts", (req, resp) => {
  s3Connector.getListOfArtifactsInPath(req, result => {
    resp.send(result);
  });
});

app.post("/deleteAllArtifacts", (req, resp) => {
  s3Connector.deleteAllArtifacts((result, error) => {
    if (result) resp.send(result);
    else resp.send(error);
  });
});

app.post("/downloadArtifact", (req, resp) => {
  s3Connector.downloadArtifact(req, (filename, error) => {
    if (error) resp.send(error);
    else {
      resp.sendFile(filename, { root: __dirname + "/tmp" }, error => {
        if (error) {
          resp.send(error);
        }
      });
    }
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("server is up and running on port 3000");
});
