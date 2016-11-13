const util = require("util");
const EventEmitter = require("events").EventEmitter;

const levels = {
  off:    1,
  fatal:  10,
  error:  20,
  warn:   30,
  info:   40,
  debug:  50,
  trace:  60,
  audit:  98,
  metric: 99
};

const levelNames = {
  10: "fatal",
  20: "error",
  30: "warn",
  40: "info",
  50: "debug",
  60: "trace",
  98: "audit",
  99: "metric"
};




function createLogger(PN){



  var logHandlers = [];

  var metricsEnabled = false;



  const consoleLogger = function(msg) {
    if(typeof msg === 'string'){
      util.log("[string] " + msg);
    }
    else if (msg.level == log.METRIC || msg.level == log.AUDIT) {
      util.log("["+levelNames[msg.level]+"] "+JSON.stringify(msg));
    } else {
      util.log("["+levelNames[msg.level]+"] "+(msg.type?"["+msg.type+":"+(msg.name||msg.id)+"] ":"")+msg.msg);
    }
  };

  const LogHandler = function(settings) {
    settings = settings || {};
    this.logLevel  = settings ? levels[settings.level]||levels.info : levels.info;
    this.metricsOn = settings ? settings.metrics||false : false;
    this.auditOn = settings ? settings.audit||false : false;

    metricsEnabled = settings.metricsEnabled || this.metricsOn;

    this.handler   = (settings && settings.handler) ? settings.handler(settings) : consoleLogger;
    this.on("log",function(msg) {
      // if (this.shouldReportMessage(msg.level)) {
      this.handler(msg);
      // }
    });
  }
  util.inherits(LogHandler, EventEmitter);

  LogHandler.prototype.shouldReportMessage = function(msglevel) {
    return (msglevel == log.METRIC && this.metricsOn) ||
      (msglevel == log.AUDIT && this.auditOn) ||
      msglevel <= this.logLevel;
  };

  const log = {
    FATAL:  10,
    ERROR:  20,
    WARN:   30,
    INFO:   40,
    DEBUG:  50,
    TRACE:  60,
    AUDIT:  98,
    METRIC: 99,

    init: function(settings) {
      metricsEnabled = false;
      logHandlers = [];
      var loggerSettings = {};
      if (settings.logging) {
        var keys = Object.keys(settings.logging);
        if (keys.length === 0) {
          log.addHandler(new LogHandler());
        } else {
          for (var i=0, l=keys.length; i<l; i++) {
            var config = settings.logging[keys[i]];
            loggerSettings = config || {};
            if ((keys[i] === "console") || config.handler) {
              log.addHandler(new LogHandler(loggerSettings));
            }
          }
        }
      } else {
        log.addHandler(new LogHandler());
      }
    },
    addHandler: function(func) {
      logHandlers.push(func);
    },
    log: function(msg) {
      // msg.timestamp = Date.now();
      logHandlers.forEach(function(handler) {
        handler.emit("log",msg);
      });
    },
    info: function(msg) {
      log.log({level:log.INFO,msg:msg});
    },
    warn: function(msg) {
      log.log({level:log.WARN,msg:msg});
    },
    error: function(msg) {
      log.log({level:log.ERROR,msg:msg});
    },
    trace: function(msg) {
      log.log({level:log.TRACE,msg:msg});
    },
    debug: function(msg) {
      log.log({level:log.DEBUG,msg:msg});
    },
    metric: function() {
      return metricsEnabled;
    },

    audit: function(msg,req) {
      msg.level = log.AUDIT;
      if (req) {
        msg.user = req.user;
        msg.path = req.path;
        msg.ip = (req.headers && req.headers['x-forwarded-for']) || (req.connection && req.connection.remoteAddress) || undefined;
      }
      log.log(msg);
    }
  }

  log["_"] = log.log; //i18n._;

  return log;

}

module.exports = createLogger;

