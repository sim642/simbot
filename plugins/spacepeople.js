var request = require("request");

function SpacePeoplePlugin(bot) {
	var self = this;
	self.name = "spacepeople";
	self.help = "Howmanypeopelareinspacerightnow plugin";
	self.depend = ["cmd", "etag"];

	self.etag = null;

	self.load = function(data) {
		self.etag = new bot.plugins.etag.ETagWrapper();
	};

	self.events = {
		"cmd#peopleinspace": function(nick, to, args) {
			request(self.etag.wrap("http://www.howmanypeopleareinspacerightnow.com/peopleinspace.json"), self.etag.parse(function(err, res, body) {
				if (!err) {
					var data = JSON.parse(body);

					bot.say(to, "People in space right now: \x02" + data.number + "\x02 (" + data.people.map(function(person) { return "\x02" + person.name + "\x02 [" + person.country + "]"; }).join(", ") + ")");
				}
			}));
		}
	};
}

module.exports = SpacePeoplePlugin;
