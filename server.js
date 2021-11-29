var express = require('express');
var app = express();
const PORT = 18080

app.use(function(req, res, next) {
    return next();
});

app.use(express.static(__dirname + '/'));

app.listen(PORT);
console.log("http://localhost:" + PORT);