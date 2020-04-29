const s3 = require("s3-client");
const request = require("request");
const fs = require("fs");

/** Create S3 Client configuration */

const accessKeyId = process.env.accessKeyId;
const secretAccessKey = process.env.secretAccessKey;
const region = process.env.region;
const bucket = process.env.Bucket;

var s3Client = s3.createClient({
  maxAsyncS3: 60, // this is the default
  s3RetryCount: 3, // this is the default
  s3RetryDelay: 2000, // this is the default
  multipartUploadThreshold: 5971520, // this is the default (20 MB)
  multipartUploadSize: 15728640, // this is the default (15 MB)
  s3Options: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: region
    // endpoint: 's3.yourdomain.com',
    // sslEnabled: false
    // any other options are passed to new AWS.S3()
    // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
  }
});

/** Get List of artifacts*/
function getListOfArtifactsInPath(request, callback) {
  var params = {
    Bucket: bucket

  };

  s3Client.s3.listObjects(params, function(err, data) {
    if (err) {
      return "There was an error viewing your album: " + err.message;
    } else {
      var resultArray = new Array();
      data.Contents.forEach(function(obj, index) {
        console.log(obj.Key, "<<<file path");
        resultArray.push(obj.Key);
      });
      callback(resultArray);
    }
  });
}

/** Get Artifact with Name*/
function getArtifactWithdetail(artifactName, callback) {
  s3Client.s3.headObject(
    {
      Bucket: bucket,
      Key: artifactName
    },
    function(err, data) {
      if (err) {
        // file does not exist (err.statusCode == 404)
        callback(false, err);
        return;
      }
      // file exists
      callback(true, null);
    }
  );
}

/** Delete artifact */

function deleteAllArtifacts(callback) {
  var Objects = new Array();
  var listObjects;
  getListOfArtifactsInPath(null, result => {
    listObjects = result;
    if (listObjects.length > 0) {
      listObjects.forEach(element => {
        Objects.push({
          Key: element
        });
      });

      var params = {
        Bucket: bucket,
        Delete: {
          Objects: Objects,
          Quiet: false
        }
      };

      s3Client.s3.deleteObjects(params, function(err, data) {
        if (err) console.log(err, err.stack);
        // an error occurred
        else {
          console.log(data);
          callback(null, data);
        }
      });
    } else {
      callback(null, "No artifacts found for deletion");
    }
  });
}

/** Upload artifact*/
function uploadArtifact(request, callback) {
  // var uploadFile = request.files.artifactFile;
  // const fileContent = fs.readFileSync(uploadFile.tempFilePath);
  //var array = uploadFile.tempFilePath.split("/");
  var files = request.files;
  var uploadFile;
  var key;
  if (files.length > 0) {
    uploadFile = files[0].path;
    if (request.body.folderName.length > 0) {
      key = request.body.folderName + "/" + files[0].originalname;
    } else {
      key = files[0].originalname;
    }
  } else {
    callback(null, "Error while reading file from temp folder");
    return;
  }

  var params = {
    localFile: uploadFile,
    s3Params: {
      Bucket: bucket,
      Key: key

      // Body: fileContent
      // other options supported by putObject, except Body and ContentLength.
      // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
    }
  };

  // Issue while updaloading large files
  // Fix this read this https://github.com/andrewrk/node-s3-client/issues/152
  s3Client.s3.addExpect100Continue = function() {};
  var uploader = s3Client.uploadFile(params);
  uploader.on("error", function(err) {
    console.error("unable to upload:", err.stack);
    callback(null, err);
  });
  uploader.on("progress", function() {
    console.log(
      "progress",
      uploader.progressMd5Amount,
      uploader.progressAmount,
      uploader.progressTotal
    );
  });
  uploader.on("end", function() {
    console.log("done uploading");
    fs.unlink(params.localFile, (result, error) => {});
    callback("Uploading done", null);
  });
}

function downloadArtifact(request, callback) {
  var artifactName = request.body.artifactName;
  var filePath = "./src/tmp/" + artifactName;
  var params = {
    localFile: filePath,
    s3Params: {
      Bucket: bucket,
      Key: artifactName
      // other options supported by getObject
      // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
    }
  };

  var downloader = s3Client.downloadFile(params);
  downloader.on("error", function(err) {
    console.error("unable to download:", err.stack);
    callback(null, err);
  });
  downloader.on("progress", function() {
    console.log(
      "progress",
      downloader.progressAmount,
      downloader.progressTotal
    );
  });
  downloader.on("end", function() {
    console.log("done downloading");
    callback(request.body.artifactName, null);
  });
}

/** Module Exports */
module.exports = {
  getArtifactWithdetail,
  uploadArtifact,
  getListOfArtifactsInPath,
  deleteAllArtifacts,
  downloadArtifact
};
