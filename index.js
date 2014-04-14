var express = require('express')
var app = express()
var Twit = require('twit')
var cors = require('cors')
var redis = require('redis')

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
          console.log(err)
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
  T.get('search/tweets', { q: 'banana since:2011-11-11', count: 100 }, function(err, reply) {
    res.send(reply)
  })
})

var port = Number(process.env.PORT || 5000);
var server = app.listen(port)
