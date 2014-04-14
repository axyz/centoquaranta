var express = require('express')
var app = express()
var Twit = require('twit')
var cors = require('cors')

var T = new Twit({
    consumer_key:         'Gt2LU4uzSU2UDQmzNpnWLgxUh'
  , consumer_secret:      'Q9HGUaoXucn5qN1GrWQamo9jLLB2tajC4v3ky5mP9myDydjss0'
  , access_token:         '12844042-2frcuR6prnJIrOaM2mCEVVCuvnWVrAY5utOAThtxK'
  , access_token_secret:  'diaT5qLjCdFCSckc3cRsxsi6m5DVVxkoMbZAOTsLmJuIQ'
})

function getList(user, slug, cb) {
  T.get('lists/statuses', {owner_screen_name: user, slug: slug}, function(err, reply) {
    if(!err) {
      cb(err, reply)
    }else {
      console.log(err)
    }
  })
}

function getLists(user, cb) {
  T.get('lists/list', {user_id: user}, function(err, reply) {
    if(!err) {
      cb(err, reply)
    }else {
      console.log(err)
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
