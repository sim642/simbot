function DatePlugin(bot) {
	var self = this;
	self.name = "date";
	self.help = "Date manipulation plugin";
	self.depend = [];

	self.toUTC = function(date) {
		return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
	};

	self.printDateTime = function(date) {
		return date.toISOString().replace(/T/g, " ").replace(/\.\d{3}Z/, "");
	};

	self.printDate = function(date) {
		return self.printDateTime(date).split(" ")[0];
	};

	self.printTime = function(date) {
		return self.printDateTime(date).split(" ")[1];
	};

	self.events = {

	}
}

module.exports = DatePlugin;
