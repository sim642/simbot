var Omegle = require("./omegle/omegle.js");

function Omegle2Plugin(bot) {
	var self = this;
	self.name = "omegle2";
	self.help = "Omegle plugin";
	self.depend = ["cmd"];

	self.regex = /^(\s*([a-z_\-\[\]\\^{}|`][a-z0-9_\-\[\]\\^{}|`]*)\s*[,:]|>(?![>\.]))\s*(.*)$/i;

	self.load = function(data) {

	};

	self.save = function() {

	};

	self.chats = {};

	self.disable = function() {
		for (var to in self.chats) {
			self.chats[to].end();
		}
		self.chats = {};
	};

	self.start = function(to) {
		var o = new Omegle();

		// connection events
		o.on("waiting", function() {
			bot.notice(to, "waiting for stranger");
		});
		o.on("connect", function() {
			var who = "stranger";
			bot.out.log("omegle2", who + " connected in " + to);
			bot.notice(to, who + " connected");
		});
		o.on("disconnect", function() {
			var who = "stranger";
			bot.out.log("omegle2", who + " disconnected");
			bot.notice(to, who + " disconnected");
		});

		// message events
		o.on("message", function(msg) {
			bot.out.log("omegle2", "stranger in " + to + ": " + msg);
			bot.say(to, "\x02" + msg);
		});

		// typing events
		o.on("typing#start", function() {
			bot.action(to, "is typing...");
		});
		o.on("typing#stop", function() { 
			bot.action(to, "stopped typing");
		});

		o.on("event", function(event) {
			bot.out.debug("omegle2", event);
		});

		// TODO: info events
		/*
		o.on("commonLikes", function() {
			bot.notice(to, "common likes, function() { " + eventdata[i][1].join(","));
		});
		o.on("partnerCollege", function() {
			bot.notice(to, "stranger's college, function() { " + eventdata[i][1]);
		});
		o.on("question", function() {
			bot.notice(to, "question, function() { " + eventdata[i][1]);
		});*/

		// TODO: captcha events
		/*
		o.on("recaptchaRequired", function() {
		o.on("recaptchaRejected", function() {
			request("https, function() {//www.google.com/recaptcha/api/challenge?k=" + eventdata[i][1], function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var match = body.match(/challenge\s*, function() {\s*'(.+)'/);
					self.chats[to].recaptcha = match[1];
					if (match) {
						bot.plugins.bitly.shorten("http, function() {//www.google.com/recaptcha/api/image?c=" + match[1], function(url) {
							bot.notice(to, "solve reCaptcha (using =recaptcha), function() { " + url);
						});
					}
				}
			});
		});*/

		o.on("error", function(err) {
			bot.out.error("omegle2", err);
		});

		o.start();
		self.chats[to] = o;
	};

	self.events = {
		"cmd#omegle": function(nick, to, args) {
			if (!(to in self.chats)) {
				bot.notice(to, "omegle started");
				self.start(to);
			}
			else
				bot.notice(to, "omegle already started");
		},

		"cmd#unomegle": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].end();
				delete self.chats[to];
				bot.out.log("omegle2", nick + " in " + to + " disconnected");
				bot.notice(to, "omegle stopped");
			}
			else
				bot.notice(to, "omegle not started");
		},

		/*"cmd#reomegle": function(nick, to, args, message) {
			if (to in self.chats) {
				self.chats[to].req.abort();
				(self.chats[to].hardDisconnect || function(){})();
			}
			self.start(to, args);
		},*/

		/*"cmd#autoomegle": function(nick, to, args) {
			if (to in self.chats) {
				if (self.chats[to].auto) {
					self.chats[to].auto = false;
					bot.notice(to, "autoreomegle disabled");
				}
				else {
					self.chats[to].auto = true;
					bot.notice(to, "autoreomegle enabled");
				}
			}
			else
				bot.notice(to, "omegle not started");
		},

		"cmd#lang": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].lang = args[1];
			}
		},

		"cmd#interests": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].topics = args[1].split(",");
			}
		},

		"cmd#collegeemail": function(nick, to, args) {
			request.post({url: "http://" + self.servers[0] + "/send_email", form: {email: args[1]}}, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);
					bot.say(to, nick + ": omegle college " + (j.success ? "success" : "failure") + " - " + j.msg.replace("\n", " ", "g"));
				}
			});
		},

		"cmd#collegeverify": function(nick, to, args) {
			if (args[1].match(/^http:\/\/chatserv\.omegle\.com\/verify\/\w+$/)) {
				request({url: args[1], followRedirect: false}, function(err, res, body) {
					if (!err && res.statusCode == 302) {
						var match = res.headers["set-cookie"].toString().match(/college=(\[[^\]]+\])/);
						if (match) {
							var arr = JSON.parse(match[1]);
							self.colleges[arr[0]] = arr[1];
							bot.say(to, nick + ": " + arr[0] + " added successfully");
						}
					}
					else
						bot.out.error("omegle", err);
				});
			}
			else
				bot.say(to, nick + ": invalid omegle college verification link");
		},

		"cmd#colleges": function(nick, to, args) {
			bot.say(to, "Usable omegle colleges: " + Object.keys(self.colleges).join(", "));
		},

		"cmd#college": function(nick, to, args) {
			var college = args[1];
			if (to in self.chats && college in self.colleges) {
				self.chats[to].college = college;
			}
		},

		"cmd#collegemode": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].collegeMode = args[1];
			}
		},

		"cmd#question": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].question = args[0];
				self.chats[to].topics = [];
				self.chats[to].spyee = false;
			}
		},

		"cmd#recaptcha": function(nick, to, args) {
			if (to in self.chats && self.chats[to].recaptcha !== undefined) {
				request.post({url: self.chats[to].server + "recaptcha", form: {"id": self.chats[to].id, "challenge": self.chats[to].recaptcha, "response": args[0]}}, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						delete self.chats[to].recaptcha;
					}
				});
			}
		},*/

		"nocmd": function(nick, to, text) {
			if (to in self.chats)
			{
				var match = text.match(self.regex);
				if (nick == to || (match && (match[1] == ">" || match[2] == bot.nick))) {
					var msg = nick != to ? match[3] : text;
					bot.out.log("omegle2", nick + " in " + to + ": " + msg);
					self.chats[to].send(msg);
				}
			}
		}
	};
}

module.exports = Omegle2Plugin;
