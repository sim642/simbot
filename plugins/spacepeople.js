var request = require("request");

function SpacePeoplePlugin(bot) {
	var self = this;
	self.name = "spacepeople";
	self.help = "Howmanypeopelareinspacerightnow plugin";
	self.depend = ["cmd"];

	self.data = null;
	self.etag = null;

	self.events = {
		"cmd#peopleinspace": function(nick, to, args) {
			request({url: "http://www.howmanypeopleareinspacerightnow.com/peopleinspace.json", headers: (self.etag ? {"If-None-Match": self.etag} : {})}, function(err, res, body) {
				if (!err) {
					var data;
					if (res.statusCode == 200) {
						data = JSON.parse(body);
						self.data = data;
						self.etag = res.headers["etag"];
					}
					else if (res.statusCode == 304) {
						data = self.data;
					}

					bot.say(to, "People in space right now: " + data.number + " (" + data.people.map(function(person) { return person.name + " [" + person.country + "]"; }).join(", ") + ")");
				}
			});
		}
	}
}

module.exports = SpacePeoplePlugin;
