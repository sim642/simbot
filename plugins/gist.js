var request = require("request");

function GistPlugin(bot) {
	var self = this;
	self.name = "gist";
	self.help = "Gist plugin";
	self.depend = ["*github"];

	self.create = function(files, public, description, callback) {
		for (var file in files) {
			files[file] = {
				"content": files[file]
			}
		}

		var postBody = {
			"description": description,
			"public": public,
			"files": files
		};

		bot.plugins.github.arequest.post({
			url: "https://api.github.com/gists",
			body: JSON.stringify(postBody)
		}, function(err, res, body) {
			if (!err && res.statusCode == 201) {
				var j = JSON.parse(body);
				bot.out.ok("gist", "created " + j.html_url);
				callback(j);
			}
			else
				bot.out.error("gist", body);
		});
	};

	self.events = {

	};
}

module.exports = GistPlugin;
