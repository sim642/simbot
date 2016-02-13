function Enum(prefix) {
	var self = this;

	self.prefix = prefix;
};

Enum.prototype.getName = function(value) {
	var self = this;

	// https://stackoverflow.com/questions/9907419/javascript-object-get-key-by-value
	for (var prop in self) {
		if(self.hasOwnProperty(prop)) {
			 if(self[prop] === value)
				 return prop;
		}
	}
	return null;
}

Enum.prototype.getFullName = function(value) {
	var self = this;

	var name = self.getName(value);
	if (name && self.prefix)
		return self.prefix + "_" + name;
	else
		return name;
}

function enumFromArray(array, prefix, start) {
	var obj = new Enum(prefix);

	var i = start || 0;
	array.forEach(function(name) {
		obj[name] = i++;
	});

	return obj;
}

exports.PACKET = enumFromArray([
	"SERVER_FULL",
	"SERVER_BANNED",
	"CLIENT_JOIN",
	"SERVER_ERROR",
	"CLIENT_COMPANY_INFO",
	"SERVER_COMPANY_INFO",
	"SERVER_CHECK_NEWGRFS",
	"CLIENT_NEWGRFS_CHECKED",
	"SERVER_NEED_GAME_PASSWORD",
	"CLIENT_GAME_PASSWORD",
	"SERVER_NEED_COMPANY_PASSWORD",
	"CLIENT_COMPANY_PASSWORD",
	"SERVER_WELCOME",
	"SERVER_CLIENT_INFO",
	"CLIENT_GETMAP",
	"SERVER_WAIT",
	"SERVER_MAP_BEGIN",
	"SERVER_MAP_SIZE",
	"SERVER_MAP_DATA",
	"SERVER_MAP_DONE",
	"CLIENT_MAP_OK",
	"SERVER_JOIN",
	"SERVER_FRAME",
	"CLIENT_ACK",
	"SERVER_SYNC",
	"CLIENT_COMMAND",
	"SERVER_COMMAND",
	"CLIENT_CHAT",
	"SERVER_CHAT",
	"CLIENT_RCON",
	"SERVER_RCON",
	"CLIENT_MOVE",
	"SERVER_MOVE",
	"CLIENT_SET_PASSWORD",
	"CLIENT_SET_NAME",
	"SERVER_COMPANY_UPDATE",
	"SERVER_CONFIG_UPDATE",
	"SERVER_NEWGAME",
	"SERVER_SHUTDOWN",
	"CLIENT_QUIT",
	"SERVER_QUIT",
	"CLIENT_ERROR",
	"SERVER_ERROR_QUIT",
	"END",
]);

exports.DESTTYPE = enumFromArray([
	"BROADCAST",
	"TEAM",
	"CLIENT",
]);

exports.NETWORK_ACTION = enumFromArray([
	"JOIN",
	"LEAVE",
	"SERVER_MESSAGE",
	"CHAT",
	"CHAT_COMPANY",
	"CHAT_CLIENT",
	"GIVE_MONEY",
	"NAME_CHANGE",
	"COMPANY_SPECTATOR",
	"COMPANY_JOIN",
	"COMPANY_NEW",
]);

exports.NETWORK_ERROR = enumFromArray([
	"GENERAL",
	"DESYNC",
	"SAVEGAME_FAILED",
	"CONNECTION_LOST",
	"ILLEGAL_PACKET",
	"NEWGRF_MISMATCH",
	"NOT_AUTORIZED",
	"NOT_EXPECTED",
	"WRONG_REVISION",
	"NAME_IN_USE",
	"WRONG_PASSWORD",
	"COMPANY_MISMATCH",
	"KICKED",
	"CHEATER",
	"FULL",
	"TOO_MANY_COMMANDS",
	"TIMEOUT_PASSWORD",
	"TIMEOUT_COMPUTER",
	"TIMEOUT_MAP",
	"TIMEOUT_JOIN",
	"END",
]);
