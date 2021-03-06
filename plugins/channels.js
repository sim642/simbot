function ChannelsPlugin(bot) {
	var self = this;
	self.name = "channels";
	self.help = "Channel management and autojoining";
	self.depend = ["cmd", "auth"];
	
	self.autojoins = [];
	self.autojoinTime = 5000;

	self.load = function(data) {
		if (data !== undefined) {
			self.autojoins = data.autojoins;
			self.autojoinTime = data.autojoinTime;
		}
	};

	self.save = function() {
		var data = {};
		data.autojoins = self.autojoins;
		data.autojoinTime = self.autojoinTime;
		return data;
	};

	self.enable = function() {
		for (var i = 0; i < self.autojoins.length; i++) {
			bot.join(self.autojoins[i]);
		}
	};

	self.events = {
		"invite": function(channel, from) {
			bot.join(channel);
		},

		"cmd#join": function(nick, to, args) {
			for (var i = 1; i < args.length; i++)
				bot.join(args[i]);
		},

		"cmd#part": function(nick, to, args, message) {
			var chans = args.slice(1);
			if (chans.length == 0)
				chans.push(to);

			chans.forEach(function(chan) {
				message.authChannel = chan;
				bot.plugins.auth.proxy(3, message, function() {
					bot.part(chan);
				});
			});
		},

		"cmd#cycle": function(nick, to, args, message) {
			var chans = args.slice(1);
			if (chans.length == 0)
				chans.push(to);

			chans.forEach(function(chan) {
				message.authChannel = chan;
				bot.plugins.auth.proxy(3, message, function() {
					bot.part(chan);
					bot.join(chan);
				});
			});
		},

		"cmd#autojoin": function(nick, to, args, message) {
			var chan = args[1] || to;
			message.authChannel = chan;

			bot.plugins.auth.proxy(3, message, function() {
				var i = self.autojoins.indexOf(chan);
				if (i != -1) {
					self.autojoins.splice(i, 1);
					bot.say(to, "not autojoining " + chan);
				}
				else {
					self.autojoins.push(chan);
					bot.say(to, "autojoining " + chan);
					if (!(chan in bot.chans))
						bot.join(chan);
				}
			});
		},

		"cmd#autojoins": bot.plugins.auth.proxyEvent(6, function(nick, to, args) {
			bot.say(to, "autojoins: " + self.autojoins.join(", "));
		}),

		"cmd#channels": bot.plugins.auth.proxyEvent(6, function(nick, to, args) {
			bot.say(to, "channels: " + Object.keys(bot.chans).join(", "));
		}),

		"part": function(channel, nick) {
			if ((nick == bot.nick) && (self.autojoins.indexOf(channel) != -1))
				setTimeout(function() {
					bot.join(channel);
				}, self.autojoinTime);
		},

		"kick": function(channel, nick) {
			if ((nick == bot.nick) && (self.autojoins.indexOf(channel) != -1))
				setTimeout(function() {
					bot.join(channel);
				}, self.autojoinTime);
		}
	};
}

module.exports = ChannelsPlugin;
