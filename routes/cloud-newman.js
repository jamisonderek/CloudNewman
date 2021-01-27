var express = require('express');
var router = express.Router();
var request = require('request');
var newman = require('newman');

const debug = false;

// WARNING: Making this true will log sensitive information.
// You also need to set "return_logs" to "secure" in your Postman 
// Environment for this to work.
const securedebug = false;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    request(url, {json:true}, (error, resp, data) => {
      if (error) {
        reject(error);
      }

      if (resp.statusCode !== 200) {
        reject({msg: `Expected status code 200, got ${resp.statusCode}`, response: resp});
      }
  
      resolve(data);
    });
  });
}

router.post('/', async function(req, res, next) {
  var content_type;
  var postman_api_key;
  var collection_uid;
  var environment_uid;
  var environment_overlay_uid;
  var return_logs = false;

  var logs = [];
  var log = debug ? (msg) => {var m = `>>> ${msg}`; console.log(m); logs.push(m)} : (msg) => { logs.push(`>>> ${msg}`); };
  var securelog = (msg) => {};

  log('Processing request...');

  try {
    var jsonBody = req.jsonBody;


    if (jsonBody.contenttype) {
      content_type = jsonBody.contenttype;
    }

    if (req.query.contenttype) {
      content_type = req.query.contenttype;
    }

    if (jsonBody.apikey) {
      postman_api_key = jsonBody.apikey;
    }

    if (req.query.apikey) {
      postman_api_key = req.query.apikey;
    }

    // Some documentation says 'X-Api-Key', some says 'X-API-Key' and
    // postman windows client fills in 'x-api-key'; so we just check
    // case-insensitive.
    //  
    // CODE REVIEW: Does the dotless i impact turkish computer when doing 
    // toLowerCase?
    for (element in req.headers) {
      var header_name = element.toLowerCase();
      if (header_name === 'x-api-key') {
        postman_api_key = req.headers[element];
        log(`header set postman_api_key to ${postman_api_key}`);
      }
    }

    if (jsonBody.collectionuid) {
      collection_uid = jsonBody.collectionuid;
    }

    if (req.query.collectionuid) {
      collection_uid = req.query.collectionuid;
    }

    if (jsonBody.environmentuid) {
      environment_uid = jsonBody.environmentuid;
    }

    if (req.query.environmentuid) {
      environment_uid = req.query.environmentuid;
    }

    if (jsonBody.environmentoverlayuid) {
      environment_overlay_uid = jsonBody.environmentoverlayuid;
    }

    if (req.query.environmentoverlayuid) {
      environment_overlay_uid = req.query.environmentoverlayuid;
    }

    const collection_url = `https://api.getpostman.com/collections/${collection_uid}?apikey=${postman_api_key}`; 
    const environment_url = `https://api.getpostman.com/environments/${environment_uid}?apikey=${postman_api_key}`; 
    const environment_overlay_url = `https://api.getpostman.com/environments/${environment_overlay_uid}?apikey=${postman_api_key}`; 
  
    log(`collection_uid is ${collection_uid}`);
    log(`environment_uid is ${environment_uid}`);
    log(`environment_overlay_uid is ${environment_overlay_uid}`);

    var responseObject;

    var collection = await requestJson(collection_url);
    var environment = await requestJson(environment_url);
    var environment_overlay;

    if (environment_overlay_uid) {
      environment_overlay = await requestJson(environment_overlay_url);
      if (environment_overlay.environment && environment_overlay.environment.values) {

        if (!(environment.environment)) {
          throw new Error('Environmment not set');
        }

        if (!(environment.environment.values)) {
          log('Environment did not have values, set to empty collection.');
          environment.environment.values = [];
        }

        environment_overlay.environment.values.forEach(override => {
          var overriden = false;
          environment.environment.values.forEach(env => {
            if (env.key == override.key) {
              env.value = override.value;
              env.enabled = override.enabled;
              log(`Updating environment variable ${env.key}`);
              overriden = true;
            }
          });

          if (!overriden) {
            log(`Adding environment variable ${override.key}`);
            environment.environment.values.push(override);
          }
        });
      }
    }

    environment.environment.values.forEach(env => {
      if (env.key.toLowerCase() === 'return_logs') {
        if (env.enabled) {
          log('Request for logs.');
          return_logs = true;

          if (env.value.toLowerCase() === 'secure') {
           securelog = securedebug ? (msg) => {var m = `***PASSWORD*** ${msg}`; console.error(m); logs.push(m);} : (msg) => { logs.push(`***PASSWORD*** ${msg}`); };
            log('Request for secure logs.');
          }
        }
      }

      if (env.key.toLowerCase().startsWith('allow.') && env.enabled) {
        var allowedParam = env.key.substring('allow.'.length);
        log(`Checking for overrides of ${allowedParam}.`);

        if (jsonBody[allowedParam] !== undefined) {
          log(`${allowedParam} overriden by allowed body variable.`);

          var override = {
            key: allowedParam,
            value: jsonBody[allowedParam],
            enabled: true
          };
          
          var overriden = false;
          environment.environment.values.forEach(env => {
            if (env.key == override.key) {
              env.value = override.value;
              env.enabled = override.enabled;
              log(`Updating environment variable ${env.key}.`);
              overriden = true;
            }
          });

          if (!overriden) {
            log(`Adding environment variable ${override.key}.`);
            environment.environment.values.push(override);
          }

        }
        if (req.query[allowedParam] !== undefined) {
          log(`${allowedParam} overriden by allowed query variable.`);
          var override = {
            key: allowedParam,
            value: req.query[allowedParam],
            enabled: true
          };
          
          var overriden = false;
          environment.environment.values.forEach(env => {
            if (env.key == override.key) {
              env.value = override.value;
              env.enabled = override.enabled;
              log(`Updating environment variable ${env.key}.`);
              overriden = true;
            }
          });

          if (!overriden) {
            log(`Adding environment variable ${override.key}.`);
            environment.environment.values.push(override);
          }
        }
      }
    });

    securelog('Running Newman');
    securelog(`collection: JSON.stringify(collection.collection)`);
    securelog(`environment: JSON.stringify(environment.environment)`);

    newman.run({
      collection: collection.collection,
      environment: environment.environment,
    }).on('start', function(err, args) {
      log(`Running collection ${args.cursor.ref}`);
    }).on('console', function(err, msg) {
      securelog(JSON.stringify(msg.messages));
      responseObject = msg.messages;
    }).on('beforeItem', function(err,x) {
      log(`running collection item ${x.item.name}`);
    }).on('assertion', function(err,assertion) {
      if (assertion.error != null) {
        log(`Assertion failed: ${assertion.assertion}`);
        securelog(assertion.error.stack);        
      }
    }).on('done', function(err,summary) {
      if (err) {
        throw err;
      } else if (summary.error) {
        throw summary.error;
      } else {
        log('Collection run completed.');
   
        if (return_logs) {
          res.json(logs);
          return;
        }

        if (content_type) {
          log(`Setting content-type to ${content_type}`);
          res.set('Content-Type', content_type);
        }

        if (!responseObject) {
          res.statusCode = 200;
          res.end();
          return;
        }
   
        if (Array.isArray(responseObject))
        {
          if (responseObject.length === 1) {
            var item = responseObject[0];
            var itemJson;

            try {
              itemJson = JSON.parse(item);
              log('returning JSON data.');
              res.json(itemJson);
              return;
            } catch(e) {
              log('returning HTML data.');
              res.send(item);
              return;  
            }
          }
        }

        res.json(responseObject);
      }
    });

  } catch (e) {
    var err = e.stack;
    if (err === undefined) {
      err = JSON.stringify(e);
    }

    log(`Collection failed with error: ${err}`);
    res.statusCode = 404;
    res.set('Content-Type', 'text/plain');
    res.send(err);
    return;
  }
});

module.exports = router;
