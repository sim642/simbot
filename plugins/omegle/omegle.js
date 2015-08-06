var util = require("util");
var EventEmitter = require("events").EventEmitter;

var request = require("request");
var qs = require("querystring");

function Omegle(optNew) {
	var self = this;

	self.server = null;
	self.req = null;
	self.id = null;
	self.interval = null;

	self.opt = JSON.parse(JSON.stringify(optNew));
	self.opt.__proto__ = self.optDefault;

	self.on("event", function(event) {
		switch (event[0]) {
		// connection events
		case "waiting":
			self.emit("waiting");
			break;
		case "connected":
			self.emit("connect");
			break;
		case "strangerDisconnected":
			self.emit("disconnect");
			break;
		case "spyDisconnected":
			self.emit("disconnect", event[1]);
			break;

		// message events
		case "gotMessage":
			self.emit("message", event[1]);
			break;
		case "spyMessage":
			self.emit("message", event[2], event[1]);
			break;

		// typing events
		case "typing":
			self.emit("typing#start");
			break;
		case "spyTyping":
			self.emit("typing#start", event[1]);
			break;
		case "stoppedTyping":
			self.emit("typing#stop");
			break;
		case "spyStoppedTyping":
			self.emit("typing#stop", event[1]);
			break;

		// info events
		case "commonLikes":
			self.emit("info#likes", event[1]);
			break;
		case "partnerCollege":
			self.emit("info#college", event[1]);
			break;
		case "question":
			self.emit("info#question", event[1]);
			break;
		case "statusInfo":
			self.emit("info#status", event[1]);
			break;

		// TODO: captcha events

		// other events
		case "identDigests":
			break;
		case "error":
			self.emit("error", new Error(event[1]));
			break;
		}
	});

	self.on("disconnect", function() {
		self.emit("end");
	});

	self.on("end", function() {
		clearInterval(self.interval);
		self.interval = null;
	});
	
	self.on("info#status", function(status) {
		self.servers = status.servers;
	});

	EventEmitter.call(self);
}

util.inherits(Omegle, EventEmitter);

Omegle.prototype.start = function() {
	var self = this;
	self.server = "http://" + self.servers[Math.floor(Math.random() * self.servers.length)] + "/";

	var query = {
		"rcs": 1,
		//"firstevents": 1,
		"spid": "",
		"land": self.opt["lang"]
	};

	if (self.opt["topics"].length > 0) {
		query["topics"] = JSON.stringify(self.opt["topics"]);
	}

	if (self.opt["college"] && self.opt["collegeAuth"]) {
		query["college"] = self.opt["college"];
		query["college_auth"] = self.opt["collegeAuth"];
		query["any_college"] = self.opt["collegeAny"] ? 1 : 0;
	}

	if (self.opt["question"]) {
		query["ask"] = self.opt["question"];
	}

	if (self.opt["spyee"]) {
		query["wantsspy"] = 1;
	}

	self.req = request.post({url: self.server + "start?" + qs.stringify(query)}, function(err, res, body) {
		self.req = null;

		if (!err && res.statusCode == 200) {
			var data = JSON.parse(body);

			self.id = data;
			self.interval = setInterval(function() {
				self.events();
			}, 1000); 

			self.emit("start");
		}
		else {
			self.emit("error", err ? err : body);
		}
	});
};

Omegle.prototype.end = function() {
	var self = this;

	self.req = request.post({url: self.server + "disconnect", form: {"id": self.id}}, function(err, res, body) {
		self.req = null;

		if (!err && res.statusCode == 200) {
			self.emit("end");
		}
		else {
			self.emit("error", err ? err : body);
		}
	});
};

Omegle.prototype.events = function() {
	var self = this;

	self.req = request.post({url: self.server + "events", form: {"id": self.id}}, function(err, res, body) {
		self.req = null;

		if (!err && res.statusCode == 200) {
			var data = JSON.parse(body);

			if (data !== null) {
				data.forEach(function(event) {
					//self.emit.apply(self, event);
					self.emit("event", event);
				});
			}
		}
		else {
			self.emit("error", err ? err : body);
		}
	});
};

Omegle.prototype.send = function(msg) {
	var self = this;

	self.req = request.post({url: self.server + "send", form: {"id": self.id, "msg": msg}}, function(err, res, body) {
		self.req = null;

		if (!err && res.statusCode == 200) {

		}
		else {
			self.emit("error", err ? err : body);
		}
	});
};

Omegle.prototype.typingStart = function() {
	var self = this;

	self.req = request.post({url: self.server + "typing", form: {"id": self.id}}, function(err, res, body) {
		self.req = null;

		if (!err && res.statusCode == 200) {

		}
		else {
			self.emit("error", err ? err : body);
		}
	});
};

Omegle.prototype.typingStop = function() {
	var self = this;

	self.req = request.post({url: self.server + "stoppedtyping", form: {"id": self.id}}, function(err, res, body) {
		self.req = null;

		if (!err && res.statusCode == 200) {

		}
		else {
			self.emit("error", err ? err : body);
		}
	});
};

Omegle.prototype.servers = ["front1.omegle.com"]; // initial values, updated later
Omegle.prototype.optDefault = {
	"lang": "en",
	"topics": [],
	"collegeAuth": null,
	"collegeAny": true,
	"question": null,
	"spyee": false
};

module.exports = Omegle;
