var express = require('express')
var app = express()
var Twit = require('twit')
var cors = require('cors')
var redis = require('redis')
var async = require('async')

var T = new Twit({
    consumer_key:         process.env.TWITTER_CONSUMER_KEY
  , consumer_secret:      process.env.TWITTER_CONSUMER_SECRET
  , access_token:         process.env.TWITTER_ACCESS_TOKEN
  , access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET
})

var R = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
if (typeof process.env.REDIS_PASSWORD)
  R.auth(process.env.REDIS_PASSWORD);

function getList(user, slug, cb) {
  T.get('lists/statuses', {owner_screen_name: user, slug: slug, count: 25, include_entities: false }, function(err, reply) {
    if(!err) {
      cb(err, reply)
    }else {
      console.log(err)
    }
  })
}

function getListMembers(user, slug, cb) {
  R.get('cqph:lists:' + slug, function(err, result) {
    if(err || !result) {
      T.get('lists/members', {owner_screen_name: user, slug: slug}, function(err, reply) {
        if(!err){
          var cache = reply.users.map(function(el) {
            return el.id
          }).reduce(function(pred, curr) {
            return pred + ';' + curr
          })
          R.setex('cqph:lists:' + slug, 21600, cache)
          cb(err, reply)
        }else {
          cb(err, null)
        }
      })
    }else {
      var ls = {}
      ls.users = result.split(';').map(function(el) {
        var ris = {}
        ris.id = el
        return ris
      })
      cb(err, ls)
    }
  })
}

function getAllMembers(user, cb) {
  R.get('cqph:' + user + 'allMembers', function(err, data) {
    if(err || !data) {
      getLists(user, function(err, lists) {
        if(!err) {
          var allLists = lists.map(function(el) {
            return el.slug
          })
          async.map(allLists, function(slug, callback) {
            getListMembers(user, slug, function(err, members) {
              if(!err) {
                members = members.users.map(function(el) {return el.id}).reduce(function(pred, curr) {return pred + ',' + curr})
                callback(null, members)
              }else {
                console.log(err)
              }
            })
          }, function(err, result) {
            var csv = result.reduce(function(pred, curr) {return pred + ',' + curr})
            R.setex('cqph:' + user + 'allMembers', 10800, csv)
            cb(err, csv)
          })
        }else {
          cb(err, null)
        }
      })

    }else {
      cb(err, data)
    }
  })
}

function getLists(user, cb) {
  R.get('cqph:lists', function(err, result) {
    if(err || !result) {
      T.get('lists/list', {user_id: user}, function(err, reply) {
        if(!err) {
          var cache = reply.filter(function(el) {
            return el.user.screen_name === user ? true : false
          }).map(function(el) {
            return el.slug + ':' + el.name
          }).reduce(function(pred, curr) {
              return pred + ';' + curr
            })
          R.setex('cqph:lists', 43200, cache)
          cb(err, reply)
        }else {
          cb(err, null)
        }
      })
    }else {
      var ls = result.split(';').map(function(el) {
        var ris = {}
        var tmp = el.split(':')
        ris.slug = tmp[0]
        ris.name = tmp[1]
        return ris
      })
      cb(err, ls)
    }
  })
}

function getInitialSet(user, slug, cb) {
  R.get('cqph:initialset:' + slug, function(err, result) {
    if(err || !result) {
      T.get('lists/statuses', {owner_screen_name: user, slug: slug}, function(err, reply) {
        if(!err) {
          R.setex('cqph:initialset:' + slug, 10800, JSON.stringify(reply))
          cb(err, reply)
        }else {
          cb(err, null)
        }
      })
    }else {
      cb(err, JSON.parse(result))
    }
  })
}

app.use(cors())

app.get('/140/lists/:list', function(req, res){
  getList('140Photography', req.params.list, function(err, reply) {
    if(!err) {
      res.send(reply)
    }else {
      res.send(err)
    }
  })
})

app.get('/140/lists/:list/initialset', function(req, res) {
  getInitialSet('140Photography', req.params.list, function(err, reply) {
    if(!err) {
      res.send(reply)
    }else {
      res.send(err)
    }
  })
})

app.get('/140/lists/:list/members', function(req, res) {
  getListMembers('140Photography', req.params.list, function(err, reply) {
    if(!err) {
      res.send(reply)
    }else {
      res.send(err)
    }
  })
})

app.get('/140/lists', function(req, res) {
  getLists('140photography', function(err, reply) {
    if(!err) {
      res.send(reply)
    }else {
      res.send(err)
    }
  })
})

app.get('/test', function(req, res) {
 getAllMembers('140Photography', function(err, reply) {
    if(!err) {
      res.send(reply)
    }else {
      res.send(err)
    }
  })
})

var port = Number(process.env.PORT || 5000);
var server = app.listen(port)

// web socket

var stream

getAllMembers('140photography', function(err, members) {
  stream = T.stream('statuses/filter', {follow: members})
})

var WebSocketServer = require('ws').Server
var wss = new WebSocketServer({server: server});


wss.on('connection', function(socket) {
  stream.on('tweet', function(tweet) {
    socket.send(JSON.stringify(tweet), function(err) {
      console.log(err)
    })
  })
})
