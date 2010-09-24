/**
 * @license 
 * Förbind - http://forbind.net
 *
 * Förbind - Swedish for "join" or "connect", as in 
 * connecting nodes: förbind node a and node b
 *
 * The MIT license.
 * @author Remy Sharp <remy@leftlogic.com>
 * @copyright Copyright (c) 2010 Left Logic <remy@leftlogic.com>
 *
 */

(function (host, port, undefined) {

io.setPath('http://' + host + ':' + port + '/socket.io/');

function each(obj, fn, context) {
  for (var key in obj) {
    if (hasOwnProperty.call(obj, key)) fn.call(context, obj[key], key, obj);
  }  
}

// FIXME should this support cancelling events? For now - no
function trigger() {
  var args = [].slice.apply(arguments),
      event = args.shift();
  if (eventRegister[event] !== undefined) {
    each(eventRegister[event], function (fn) {
      fn.apply(forbind, args);
    });
  }
}

function ifconnected(fn) {
  if (connected) {
    fn.call(forbind);
  } else {
    forbind.connect(forbind.apikey, fn);
  }
}

function messageHandler(msg) {
  // app:* messages are internal to förbind
  if (forbind.debug) {
    console.log('message in: ' + JSON.stringify(msg));
  }
  
  if (msg.type && msg.type.substr(0, 4) === 'app:') {
    if (msg.type === 'app:message') {
      // a message event has slightly special handling:
      // the response is passed in as the first arg
      trigger(msg.type, msg.data.data, msg.data); 
    } else {
      trigger(msg.type, msg.data);      
    }
  } else {
    console.log('unknown message: (type:' + msg.type + ') ' + JSON.stringify(msg));
  }
}

var user = { // FIXME is this *really* required?
      details: {},
      id: +new Date
    },
    config = {},
    eventRegister = {},
    connected = false,
    socket = new io.Socket(host, { port: port });

var forbind = {
  version: '0.1',
  debug: false,
  apikey: '',
  connect: function (apikey, callback) {
    if (typeof apikey === 'function') {
      callback = apikey;
      apikey = '';
    }
    forbind.apikey = apikey += '';
    // do connect to server
    if (!connected) {
      // setup socket handlers
      socket.on('connect', function () { 
        connected = true;
        socket.send({
          method: 'load',
          data: {
            apikey: apikey, // "a pikey" - chuckle
            user: user
          }
        });
      });
      
      socket.on('disconnect', function () {
        connected = false;
        trigger('disconnect');
      });

      socket.on('message', messageHandler);
      
      // connecting again unbinds original application event handlers (but not the error handler)
      each(eventRegister, function (fn, event) {
        if (event.substr(0, 4) === 'app:' && event !== 'app:error') forbind.unbind(event);
      });
      
      this.bind('app:load', function (_config) {
        config = _config;
        if (callback !== undefined) callback.call(forbind, config);
        trigger('connect', config);
      }).bind('app:waiting', function (sessionStats) {
        trigger('waiting', sessionStats);
      }).bind('app:create', function (sessionId) {
        trigger('create', sessionId);
      }).bind('app:leave', function () {
        trigger('leave');
      });
      
      // let's go
      socket.connect();
    }
  },
  connected: function () {
    return connected;
  },
  bind: function (event, fn) {
    // do I need to support space separated event binding
    if (/ /.test(event)) {
      each(event.split(' '), function (event) {
        forbind.bind(event, fn);
      });
    } else {
      if (eventRegister[event] === undefined) {
        eventRegister[event] = [fn];
      } else {
        eventRegister[event].push(fn);
      }      
    }
    return this;
  },
  unbind: function (event, fn) {
    if (fn === undefined) {
      delete eventRegister[event];
    } else {
      var eventHandlers = [];
      each(eventRegister[event], function (handler) {
        if (handler != fn) eventHandlers.push(handler);
      });
      eventRegister[event] = eventHandlers;
    }
    return this;
  },
  join: function (key) {
    // try to add the current user to session - may fail
    ifconnected(function () {
      this.unbind('app:join').bind('app:join', function () {
        // main forbind message handler - should be moved up and out
        this.unbind('app:message').bind('app:message', function (data) {
          trigger('message', data);
        });
        
        // notify of other users connecting and disconnecting
        this.unbind('app:connection').bind('app:connection', function (data) {
          trigger('connection', data);
        }).unbind('app:disconnection').bind('app:disconnection', function (data) {
          trigger('disconnection', data);
        });

        trigger('join');
      });
      
      socket.send({
        method: 'app:join',
        data: {
          user: user,
          key: key
        }
      });
    });
  },
  create: function (key) {
    key = key || (+new Date).toString(32);
    ifconnected(function () {
      this.bind('app:create', function () {
        this.join(key);
      });

      socket.send({
        method: 'app:create',
        data: { key: key }
      });      
    });
    
    return key;
  },
  leave: function () {
    ifconnected(function () {
      socket.send({
        method: 'app:leave'
      });
    });
  },
  send: function (message) {
    ifconnected(function () {
      if (user) {
        socket.send({
          method: 'user:message',
          data: message
        });
      }
    });
  },
  user: function (details) {
    user.details = details;
  }
};

forbind.bind('app:error', function (data) {
  // console.log('error', data);
  // if there's a custom error handler - defer to that, otherwise throw a new error
  if (eventRegister.error !== undefined) {
    trigger('error', data);
  } else {
    throw new Error(data.description);
  }
});

// try to read the api key from the script tag
var lastChild;
if (typeof this.document !== 'undefined' && document.body) {
  lastChild = document.body.lastChild;
  
  if (lastChild.nodeName === 'SCRIPT') {
    lastChild.getAttribute('src').replace(/apikey=(.+?)\b/, function (n, apikey) {
      forbind.apikey = apikey;
    });
  }
}

// export
if (typeof exports !== 'undefined') {
  exports.forbind = forbind;
} else {
  window.forbind = forbind;
}

})('forbind.net', 80);