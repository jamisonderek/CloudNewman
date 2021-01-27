var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var newmanRouter = require('./routes/cloud-newman');
var githubRouter = require('./routes/github');
var postmanRouter = require('./routes/postman');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));

// Instead of app.use(express.json()) we use rawBody, so in the
// future we can handle endpoints that post non-JSON data.
function rawBody(req, res, next) {
  req.setEncoding('utf8');
  req.rawBody = '';
    req.on('data', function(chunk) {
    req.rawBody += chunk;
  });

  req.on('end', function() {

    var parsed = false;
    req.jsonBody = {};

    if (req.rawBody.length !== 0) {
      var contentType = req.headers['content-type'];
      if (contentType) {
        contentType = contentType.toLowerCase();
      } else {
        contentType = '';
      }

      // Try JSON first.
      try {
        req.jsonBody = JSON.parse(req.rawBody);
        parsed = true;
      } catch (e) {
        // Try to return graphQL query.
        var graphQLvars = req.rawBody.replace(/,"variables":.*}/gi, '}');
        try {
          req.jsonBody = JSON.parse(graphQLvars);
          req.jsonBody.graphql = req.rawBody;
          parsed = true;
        } catch (ex) {
        }  
      }  
  
      if (!parsed & contentType.includes('form-data')) {
        var delim = contentType.substring(contentType.indexOf('=')+1);

        var lastIndex = 0;
        var index = req.rawBody.indexOf(delim, lastIndex);
        while (index >=0) {
          var nextChars = req.rawBody.substring(index+delim.length).substring(0,2);
          if (nextChars == '--') {
            break;
          }
          if (nextChars[1]<31) {
            index += 2;
          } else {
            index++;
          }

          var endIndex = req.rawBody.indexOf(delim, index);
          if (endIndex >=  0) {
            var content = req.rawBody.substring(index+delim.length, endIndex - 4);
            var variableName = content.match(/["]([^"]*)/i);
            if (variableName.length > 1) {
              variableName=variableName[1];

              value = content.substring(content.indexOf('\n')+3);
              req.jsonBody[variableName] = value;
              parsed = true;
            }
          }

          index = req.rawBody.indexOf(delim, endIndex);
        }
      }
  
      if (contentType && contentType.includes('x-www-form-urlencoded')) {
        var parts = req.rawBody.split('&');
        parts.forEach(part => {
          var part = part.split('=');
          if (part.length === 2) {
            var value = part[1];

            value = value.replace(/%../gi, x => {
              var character = parseInt(x.substring(1),16);
              return String.fromCharCode(character);
            });

            req.jsonBody[part[0]] = value;
            parsed = true;
          }
        });
      }

      if (!parsed) {
        console.log(`failed to parse raw: >${req.rawBody}<`);
      }
    }

    next();
  });
}
app.use(rawBody);

// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/v1', newmanRouter);
app.use('/', githubRouter);
app.use('/github', githubRouter);
app.use('/postman', postmanRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
