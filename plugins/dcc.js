var net = require("net");
var ip = require("ip");
var request = require("request");

function DCCPlugin(bot) {
	var self = this;
	self.name = "dcc";
	self.help = "DCC plugin";
	self.depend = [];

	self.ctcpChatRe = /^DCC CHAT chat (\d+) (\d+)$/i;
	self.ctcpMsgRe = /^(\x01ACTION )?([^\x01\r\n]*)\x01?\r?\n(.*)$/i;

	self.port = 36001;

	self.chats = {};

	self.targetRe = /^dcc#(.*)$/;
	self._say = null;
	self._action = null;

	self.chat = function(from, client) {
		self.chats[from] = client;

		var str = "";

		client.on("connect", function() {
			bot.emit("dcc-chat-open", from);
		});

		client.on("data", function(data) {
			str += data.toString();
			//bot.out.debug("dcc", [str, data.toString()]);

			str = str.replace(self.ctcpMsgRe, function(line, action, text, rest) {
				bot.emit("dcc-chat", from, text, action ? "action" : "privmsg");
				return rest;
			});
		});

		client.on("end", function() {
			bot.emit("dcc-chat-close", from);
			delete self.chats[from];
		});

		client.on("error", function(err) {
			bot.out.debug("dcc", err);
		});
	};

	self.say = function(to, text) {
		self.chats[to].write(text + "\r\n");
	};

	self.action = function(to, text) {
		self.say(to, "\x01ACTION " + text + "\x01");
	};

	self.chat2 = function(to) {
		request("https://api.ipify.org/", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				bot.ctcp(to, "privmsg", "DCC CHAT chat " + ip.toLong(body) + " " + self.port);

				var server = net.createServer(function(client) {
					self.chat(to, client);
					client.emit("connect");
					server.close();
				});

				server.listen(self.port);
			}
		});
	};

	self.enable = function() {
		self._say = bot.say; // copy old function
		bot.say = function(target, message) {
			var m = target.match(self.targetRe);
			if (m) // DCC say
				return self.say(m[1], message);
			else
				return self._say.call(this, target, message);
		};

		self._action = bot.action; // copy old function
		bot.action = function(target, message) {
			var m = target.match(self.targetRe);
			if (m) // DCC action
				return self.action(m[1], message);
			else
				return self._action.call(this, target, message);
		};
	};

	self.disable = function() {
		for (var from in self.chats) {
			self.chats[from].end();
		}

		bot.say = self._say; // restore old function
		self._say = null;
		bot.action = self._action; // restore old function
		self._action = null;
	};

	self.events = {
		"ctcp-privmsg": function(from, to, text) {
			var m = text.match(self.ctcpChatRe);
			//bot.out.debug("dcc", m);
			if (m) {
				var host = ip.fromLong(m[1]);
				var port = parseInt(m[2]);

				//bot.out.debug("dcc", [host, port]);

				self.chat(from, net.connect(port, host));
			}
		},

		"dcc-chat-open": function(from) {
			bot.out.debug("dcc", "open " + from);
		},

		"dcc-chat": function(from, text, type) {
			bot.out.debug("dcc", [from, text, type]);

			switch (type) {
				case "privmsg":
					bot.emit("dcc-chat-privmsg", from, text);
					break;

				case "action":
					bot.emit("dcc-chat-action", from, text);
					break;
			}
		},

		"dcc-chat-privmsg": function(from, text) {
			bot.emit("message", from, "dcc#" + from, text);

			self.say(from, text);
		},

		"dcc-chat-action": function(from, text) {
			bot.emit("action", from, "dcc#" + from, text);

			self.action(from, text);
		},

		"dcc-chat-close": function(from) {
			bot.out.debug("dcc", "close " + from);
		},
	};
}

module.exports = DCCPlugin;
