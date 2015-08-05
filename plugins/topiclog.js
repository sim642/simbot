var jsdiff = require("diff");

function TopicLogPlugin(bot) {
	var self = this;
	self.name = "topiclog";
	self.help = "Topic logger plugin";
	self.depend = ["cmd", "date", "util"];

	self.sedRe = new RegExp(
		"^(?:((?:\\\\/|[^/])+)/)?" +
		"s([^\\w\\s])((?:\\\\\\2|(?!\\2).)+)" +
		"\\2((?:\\\\\\2|(?!\\2).)*?)" +
		"\\2([a-z])*$"); // simplified from sed plugin

	self.topiclog = {};
	self.tochange = {};

	self.load = function(data) {
		if (data) {
			self.topiclog = data;
			for (var channel in self.topiclog) {
				var chanlog = self.topiclog[channel];
				for (var i = 0; i < chanlog.length; i++)
					chanlog[i].time = new Date(chanlog[i].time);
			}
		}
	};

	self.save = function() {
		return self.topiclog;
	};

	self.topic = function(channel, topic, nick) {
		if (!(channel in self.tochange))
			self.tochange[channel] = [];
		self.tochange[channel].push({"nick": nick, "topic": topic});
		bot.send("TOPIC", channel, topic);
	};

	self.colordiff = function(str1, str2) {
		var diff = jsdiff.diffWords(str1, str2);
		var str = "";

		diff.forEach(function(part) {
			if (part.added)
				str += "\x033{+" + part.value + "+}";
			else if (part.removed)
				str += "\x034[-" + part.value + "-]";
			else
				str += "\x0f" + part.value;
		});

		return str;
	};

	self.events = {
		"topic": function(channel, topic, nick, message) {
			var chanlog = self.topiclog[channel];
			if (chanlog === undefined || chanlog[chanlog.length - 1].topic != topic) {
				var entry = {};
				if (message.command == "333") {
					var match = message.args[2].match(/^([_a-zA-Z0-9\[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/);
					entry = {
						"nick": match[1],
						"user": match[3],
						"host": match[4],
						"topic": topic,
						"time": new Date(parseInt(message.args[3]) * 1000)
					};
				}
				else
				{
					entry = {
						"nick": nick,
						"user": message.user,
						"host": message.host,
						"topic": topic,
						"time": new Date()
					};
				}

				if (chanlog === undefined)
					self.topiclog[channel] = [entry];
				else
					self.topiclog[channel].push(entry);
			}

			if ((nick == bot.nick) && (channel in self.tochange)) {
				self.tochange[channel] = self.tochange[channel].filter(function(elem) {
					return elem.topic != topic;
				}); // TODO: fix for multiple same topics
			}
		},

		"join": function(channel, nick) {
			if (nick == bot.nick)
				bot.send("TOPIC", channel);
		},

		"raw": function(message) {
			if (message.command == "err_chanoprivsneeded") {
				var channel = message.args[1];

				if (channel in self.tochange) {
					var change = self.tochange[channel].pop();

					if (change)
						bot.notice(change.nick, "/topic " + channel + " " + change.topic);
				}
			}
		},

		"cmd#topics": function(nick, to, args) {
			var cnt;
			var channel = to;

			for (var i = 1; i < args.length; i++) {
				var arg = args[i];

				if (arg.match(/^#/))
					channel = arg;
				else if (arg.match(/^\d+$/))
					cnt = parseInt(arg);
			}

			cnt = Math.min(Math.max(cnt, 1) || 3, 10);

			if (channel in self.topiclog)
			{
				var chanlog = self.topiclog[channel];

				var lastentry = chanlog[chanlog.length - cnt - 1];
				for (var i = -cnt; i < 0; i++) {
					var entry = chanlog[chanlog.length + i];
					if (entry)
					{
						var str;
						if (lastentry)
							str = self.colordiff(lastentry.topic, entry.topic);
						else
							str = entry.topic;

						bot.notice(nick, "\x02Topic #" + (chanlog.length + i) + " in " + channel + " by " + entry.nick + " at " + bot.plugins.date.printDateTime(entry.time) + ":\x02 " + str);
						lastentry = entry;
					}
				}
			}
			else
				bot.say(to, "No such channel on record");
		},

		"cmd#topicdiff": function(nick, to, args) {
			var chan = args[1] || to;
			if (chan in self.topiclog)
			{
				var chanlog = self.topiclog[chan];
				if (chanlog.length >= 2)
				{
					var str = self.colordiff(chanlog[chanlog.length - 2].topic, chanlog[chanlog.length - 1].topic);
					bot.say(to, "\x02Topic diff of " + chan + ":\x02 " + str);
				}
				else
					bot.say(to, "Cannot find topic diff with less than 2 known topics");
			}
			else
				bot.say(to, "No such channel on record");
		},

		"cmd#topicrestore": function(nick, to, args) {
			var chan = to;
			if (chan in self.topiclog) {
				var chanlog = self.topiclog[chan];

				var id = args[1] || (chanlog.length - 2);
				if (id >= 0 && id < chanlog.length) {
					self.topic(chan, chanlog[id].topic, nick);
				}
				else
					bot.say(to, "Invalid topic ID");
			}
		},

		"cmd#topicsed": function(nick, to, args) {
			var channel = to;
			var sed = null;

			for (var i = 1; i < args.length; i++) {
				var arg = args[i];

				if (arg.match(/^#/))
					channel = arg;
				else {
					var m = arg.match(self.sedRe);
					if (m)
						sed = m;
				}
			}

			// adjusted from sed plugin
			if (sed) {
				var m = sed;
				var sedPrere = m[1] ? new RegExp(m[1]) : null;
				var sedRe = new RegExp(m[3], m[5]);
				var sedRepl = bot.plugins.util.strUnescape(m[4]);

				var chanlog = self.topiclog[channel];

				for (var i = chanlog.length - 1; i >= 0; i--) {
					var text2 = chanlog[i].topic;

					var func = function() {
						var out = text2.replace(sedRe, sedRepl).replace(/[\r\n]/g, "");
						self.topic(channel, out, nick);
					};

					if (sedPrere) {
						if (sedPrere.test(text2)) {
							func();
							break;
						}
					}
					else {
						func();
						break;
					}
				}
			}
		}
	};
}

module.exports = TopicLogPlugin;
