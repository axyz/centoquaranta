var express = require('express')
var app = express()
var Twit = require('twit')

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

app.get('/140/:list', function(req, res){
  getList('140Photography', req.params.list, function(err, reply) {
    if(!err) {
      res.send(reply)
    }else {
      console.log(err)
    }
  })
})

app.get('/test', function(req, res) {
  T.get('search/tweets', { q: 'banana since:2011-11-11', count: 100 }, function(err, reply) {
    res.send(reply)
  })
})

var server = app.listen(3000)
