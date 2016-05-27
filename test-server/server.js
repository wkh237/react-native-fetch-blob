/**
 * @author wkh237
 * @description react-native-fetch-blob test & dev server
 */

var express = require('express');
var bodyParser = require('body-parser');
var chokidar = require('chokidar');
var multer = require('multer');
var upload = multer({dest : 'uploads/'});
var chalk = require('chalk');
var mkdirp = require('mkdirp');
var dirname = require('path').dirname;
var app = express();
var fs = require('fs');

var JS_SOURCE_PATH = '../test/',
    APP_SOURCE_PATH = '../RNFetchBlobTest/';

// watch index.js in src folder
chokidar
  .watch('../src/index.js')
  .on('change', function(path) {
    console.log(chalk.green('js file changed'), path);
    var targetPath = String(path).replace('../src/', '../RNFetchBlobTest/node_modules/react-native-fetch-blob/')
    mkdirp(dirname(targetPath), function (err) {
    if (err) return cb(err);
      fs.writeFileSync(targetPath, fs.readFileSync(path));
    });
  })

// watch files in  test folder
chokidar
  .watch(JS_SOURCE_PATH)
  .on('add', function(path) {
    console.log(chalk.magenta('file created'), path);
    var targetPath = String(path).replace(JS_SOURCE_PATH, APP_SOURCE_PATH)
    mkdirp(dirname(targetPath), function (err) {
    if (err) return cb(err);
      fs.writeFileSync(targetPath, fs.readFileSync(path));
    });
  })
  .on('change', function(path) {
    console.log(chalk.green('file changed'), path);
    var targetPath = String(path).replace(JS_SOURCE_PATH, APP_SOURCE_PATH)
    mkdirp(dirname(targetPath), function (err) {
    if (err) return cb(err);
      fs.writeFileSync(targetPath, fs.readFileSync(path));
    });
  })
  .on('unlink', function(path) {
    console.log(chalk.red('file removed'), path);
    var targetPath = String(path).replace(JS_SOURCE_PATH, APP_SOURCE_PATH)
    mkdirp(dirname(targetPath), function (err) {
    if (err) return cb(err);
      fs.unlinkSync(targetPath);
    });
  })
  .on('error', function(err){
    console.log(err);
  });

app.listen(8123, function(err){

  if(!err)
    console.log('test server running at port ',8123)

})


app.use(function(req,res,next){

  console.log(chalk.green('request url=') + chalk.magenta(req.url));

  next()
})

app.use(upload.any())

app.use('/public', express.static('./public'))

// for redirect test
app.get('/redirect', function(req, res) {
  res.redirect('/public/github.png')
})

// handle octet-stream request
app.post('/upload', function(req, res){

  console.log(req.headers)
  console.log(req.body)
  fs.writeFile('./uploads/file'+Date.now()+'.png', req.body,function(err){
    if(!err)
      res.status(200).send({ message : 'ok'})
    else
      res.status(500).send({ message : err})
  })

})

// return an empty response
app.all('/empty', function(req, res) {
  res.send('')
})

// handle multipart/form-data request
app.post('/upload-form', function(req, res) {
  console.log(req.headers)
  console.log(req.body)
  console.log(req.files)
  if(Array.isArray(req.files)) {
    req.files.forEach((f) => {
      console.log(process.cwd() + f.path, '=>', process.cwd() + '/public/' + f.originalname)
      fs.renameSync('./' + f.path, './public/'+ f.originalname)
    })
  }
  res.status(200).send({
    fields : req.body,
    files : req.files
  })
})
