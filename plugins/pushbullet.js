var request = require("request");

function PushbulletPlugin(bot) {
	var self = this;
	self.name = "pushbullet";
	self.help = "Pushbullet plugin";
	self.depend = ["cmd", "auth"];

	self.token = null;

	self.load = function(data) {
		self.token = data.token;
	};

	self.push = function(params, callback) {
		request.post({
			url: "https://api.pushbullet.com/v2/pushes",
			auth: {
				user: self.token
			},
			json: true,
			body: params
		}, function (err, res, body) {
			if (!err && res.statusCode == 200) {
				bot.out.ok("pushbullet", params);
				(callback || function(){})(false);
			}
			else {
				bot.out.error("pushbullet", params);
				(callback || function(){})(true);
			}
		});
	};

	self.pushnote = function(to, title, body, callback) {
		self.push({
			"email": to,
			"type": "note",
			"title": title,
			"body": body
		}, callback);
	};

	self.events = {
		"cmd#pushbullet": bot.plugins.auth.proxy(6, function(nick, to, args) {
			self.pushnote(args[1], args[2], args[3], function(err) {
				if (err)
					bot.say(to, nick + ": error sending pushbullet");
				else
					bot.say(to, nick + ": pushbullet sent");
			});
		})
	}
}

module.exports = PushbulletPlugin;
