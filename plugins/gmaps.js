var maps = require("@google/maps");

function GmapsPlugin(bot) {
	var self = this;
	self.name = "gmaps";
	self.help = "Google Maps plugin";
	self.depend = [];
	
	self.apiKey = null;
	self.client = null;

	self.setApiKey = function(apiKey) {
		self.apiKey = apiKey;

		if (apiKey) {
			self.client = maps.createClient({
				key: apiKey
			});
		}
	};

	self.load = function(data) {
		if (data)
			self.setApiKey(data.apiKey || null);
	};

	self.save = function() {
		return {apiKey: self.apiKey};
	};

	self.events = {

	};
}

module.exports = GmapsPlugin;
