var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer({dest : 'uploads/'});
var app = express();
var fs = require('fs');

app.listen(8123, function(err){

  if(!err)
    console.log('test server running at port ',8123)

})

// app.use(bodyParser.raw())

app.use(upload.any())

app.use('/public', express.static('./public'))

app.get('/redirect', function(req, res) {
  res.redirect('/public/github.png')
})

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
