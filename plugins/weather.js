var request = require("request");
var async = require("async");

function WeatherPlugin(bot) {
	var self = this;
	self.name = "weather";
	self.help = "Weather plugin";
	self.depend = ["cmd", "bits", "date", "gmaps", "nickserv"];
	
	self.DateUTC = bot.plugins.date.toUTC;

	self.apiKey = null;

	self.users = {};

	self.load = function(data) {
		if (data) {
			self.apiKey = data.apiKey || null;
			self.users = data.users || {};
		}
	};

	self.save = function() {
		return {
			apiKey: self.apiKey,
			users: self.users
		};
	};

	self.parseUser = function(user) {
		var lowUser = user.toLowerCase();
		if (lowUser in self.users)
			return self.users[lowUser];
		else
			return user;
	};

	self.windChars = function(deg) {
		// http://climate.umn.edu/snow_fence/components/winddirectionanddegreeswithouttable3.htm
		var chars = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N"];
		return chars[Math.floor((deg + 360 / chars.length / 2) / (360 / chars.length)) % chars.length];
	};

	self.windChill = function(j) {
		// https://en.wikipedia.org/wiki/Wind_chill#Australian_Apparent_Temperature
		var Ta = (j.main.temp - 273.15);
		var RH = j.main.humidity;
		var e = RH / 100 * 6.105 * Math.exp(17.27 * Ta / (237.7 + Ta));
		var v = j.wind.speed;

		return Ta + 0.33 * e - 0.70 * v - 4.00;
	};

	self.uviColor = function(uvi) {
		if (uvi < 3)
			return "03"; // green
		else if (uvi < 6)
			return "08"; // yellow
		else if (uvi < 8)
			return "07"; // orange
		else if (uvi < 11)
			return "04"; // red
		else
			return "06"; // violet
	}

	self.lookupPresent = function(place, placeParams, format, callback) {
		if (!placeParams) {
			callback("No place called \x02" + place);
			return;
		}

		async.parallel({
			weather: function(callback) {
				request({
					url: "http://api.openweathermap.org/data/2.5/weather",
					qs: Object.assign({
						"APPID": self.apiKey,
						"lang": "en"
					}, placeParams)
				}, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var j = JSON.parse(body);
						if (j.cod == 200) {
							callback(null, j);
						}
						else {
							callback("No place called \x02" + place);
						}
					}
					else if (!err && res.statusCode == 401) {
						callback("No API permissions");
					}
				});
			},

			uvi: async.reflect(function(callback) {
				request({
					url: "http://api.openweathermap.org/data/2.5/uvi",
					qs: Object.assign({
						"APPID": self.apiKey,
						"lang": "en"
					}, placeParams)
				}, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var j = JSON.parse(body);
						callback(null, j);
					}
					else if (!err && res.statusCode == 401) {
						callback("No API permissions");
					}
				});
			})
		}, function(err, results) {
			if (!err) {
				var j = results.weather;
				j.uvi = results.uvi.value;
				callback(format(placeParams, j));
			}
			else
				callback(err);
		});
	};

	self.formatPresent = function(placeParams, j) {
		var displayName = placeParams._display || (j.name + ", " + j.sys.country);

		var prefix = displayName;
		var bits = [];

		bits.push(["temperature", (j.main.temp - 273.15).toFixed(1) + "°C"]);
		bits.push(["feels like", self.windChill(j).toFixed(1) + "°C"]);

		bits.push(["humidity", j.main.humidity.toString() + "%"]);
		bits.push(["pressure", j.main.pressure.toString() + "hPa"]);
		if (j.wind) {
			var str = j.wind.speed.toString() + "m/s";
			if (j.wind.gust)
				str += " (" + j.wind.gust.toString() + "m/s)";
			if (j.wind.deg) {
				str += " " + j.wind.deg.toFixed(0).toString() + "°";
				str += " (" + self.windChars(j.wind.deg) + ")";
			}

			if (str)
				bits.push(["wind", str]);
			else
				bot.out.warn("weather", j);
		}
		bits.push(["clouds", j.clouds.all.toString() + "%"]);
		if (j.rain) {
			var str;
			if (j.rain["3h"] !== undefined)
				str = j.rain["3h"].toString() + "mm/3h";
			else if (j.rain["1h"] !== undefined)
				str = j.rain["1h"].toString() + "mm/h";

			if (str)
				bits.push(["rain", str]);
			else
				bot.out.warn("weather", j);
		}
		if (j.snow) {
			var str;
			if (j.snow["3h"] !== undefined)
				str = j.snow["3h"].toString() + "mm/3h";
			else if (j.snow["1h"] !== undefined)
				str = j.snow["1h"].toString() + "mm/h";

			if (str)
				bits.push(["snow", str]);
			else
				bot.out.warn("weather", j);
		}
		if (j.uvi) {
			//bits.push(["UV index", j.uvi.value.toString()]);
			bits.push(["UV index", "\x03" + self.uviColor(j.uvi.value) + j.uvi.value.toString() + "\x03"]);
		}
		if (j.weather) {
			var val = "";
			for (var i = 0; i < j.weather.length; i++) {
				val += j.weather[i].description;
				if (i != j.weather.length - 1)
					val += ", ";
			}
			bits.push(["conditions", val]);
		}
		/*if (j.sys.sunrise) {
			var d = self.DateUTC(new Date(j.sys.sunrise * 1000));
			bits.push(["sunrise", d.toTimeString().split(" ")[0]]);
		}
		if (j.sys.sunset) {
			var d = self.DateUTC(new Date(j.sys.sunset * 1000));
			bits.push(["sunset", d.toTimeString().split(" ")[0]]);
		}*/

		return bot.plugins.bits.format(prefix, bits);
	};

	self.formatSweater = function(placeParams, j) {
		var displayName = placeParams._display || (j.name + ", " + j.sys.country);

		var prefix = displayName;
		var bits = [];

		var feelsLike = self.windChill(j);
		bits.push(["sweater", feelsLike < 18 ? "yes" : "no"]);

		return bot.plugins.bits.format(prefix, bits);
	};

	self.present = function(place, placeParams, time, callback) {
		self.lookupPresent(place, placeParams, self.formatPresent, callback);
	};

	self.future = function(place, placeParams, time, callback) {
		var t = time.getTime() / 1000;

		if (!placeParams) {
			callback("No place called \x02" + place);
			return;
		}

		request({
			url: "http://api.openweathermap.org/data/2.5/forecast",
			qs: Object.assign({
				"APPID": self.apiKey,
				"lang": "en"
			}, placeParams)
		}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var jj = JSON.parse(body);
				if (jj.cod == 200) {
					var displayName = placeParams._display || (jj.city.name + ", " + jj.city.country);
					for (var i = 0; i < jj.cnt; i++) {
						var j = jj.list[i];
						if (t >= j.dt && t < (i + 1 < jj.cnt ? jj.list[i + 1].dt : j.dt + 3 * 60 * 60)) {
							var prefix = displayName + " @ " + bot.plugins.date.printDateTime(time);
							var bits = [];

							bits.push(["temperature", (j.main.temp - 273.15).toFixed(1) + "°C"]);
							bits.push(["feels like", self.windChill(j).toFixed(1) + "°C"]);

							bits.push(["humidity", j.main.humidity.toString() + "%"]);
							bits.push(["pressure", j.main.pressure.toString() + "hPa"]);
							if (j.wind) {
								var str = j.wind.speed.toString() + "m/s";
								if (j.wind.gust)
									str += " (" + j.wind.gust.toString() + "m/s)";
								if (j.wind.deg) {
									str += " " + j.wind.deg.toFixed(0).toString() + "°";
									str += " (" + self.windChars(j.wind.deg) + ")";
								}

								if (str)
									bits.push(["wind", str]);
								else
									bot.out.warn("weather", j);
							}
							bits.push(["clouds", j.clouds.all.toString() + "%"]);
							if (j.rain) {
								var str;
								if (j.rain["3h"] !== undefined)
									str = j.rain["3h"].toString() + "mm/3h";
								else if (j.rain["1h"] !== undefined)
									str = j.rain["1h"].toString() + "mm/h";

								if (str)
									bits.push(["rain", str]);
								else
									bot.out.warn("weather", j);
							}
							if (j.snow) {
								var str;
								if (j.snow["3h"] !== undefined)
									str = j.snow["3h"].toString() + "mm/3h";
								else if (j.snow["1h"] !== undefined)
									str = j.snow["1h"].toString() + "mm/h";

								if (str)
									bits.push(["snow", str]);
								else
									bot.out.warn("weather", j);
							}
							if (j.weather) {
								var val = "";
								for (var i = 0; i < j.weather.length; i++) {
									val += j.weather[i].description;
									if (i != j.weather.length - 1)
										val += ", ";
								}
								bits.push(["conditions", val]);
							}
							/*if (j.sys.sunrise) {
								var d = self.DateUTC(new Date(j.sys.sunrise * 1000));
								bits.push(["sunrise", d.toTimeString().split(" ")[0]]);
							}
							if (j.sys.sunset) {
								var d = self.DateUTC(new Date(j.sys.sunset * 1000));
								bits.push(["sunset", d.toTimeString().split(" ")[0]]);
							}*/

							callback(bot.plugins.bits.format(prefix, bits));
							return;
						}
					}

					callback("No forecast found for \x02" + displayName + " @ " + bot.plugins.date.printDateTime(time));
				}
				else {
					callback("No place called \x02" + place);
				}
			}
			else if (!err && res.statusCode == 401) {
				callback("No API permissions");
			}
		});
	};

	self.future2 = function(place, placeParams, time, callback) {
		var t = time.getTime() / 1000;

		if (!placeParams) {
			callback("No place called \x02" + place);
			return;
		}

		request({
			url: "http://api.openweathermap.org/data/2.5/forecast/daily",
			qs: Object.assign({
				"APPID": self.apiKey,
				"lang": "en"
			}, placeParams)
		}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var jj = JSON.parse(body);
				if (jj.cod == 200) {
					var displayName = placeParams._display || (jj.city.name + ", " + jj.city.country);

					for (var i = 0; i < jj.cnt; i++) {
						var j = jj.list[i];
						if (t >= j.dt && t < (i + 1 < jj.cnt ? jj.list[i + 1].dt : j.dt + 24 * 60 * 60)) {
							var prefix = displayName + " @ " + bot.plugins.date.printDateTime(time);
							var bits = [];

							bits.push(["temperature", (j.temp.day - 273.15).toFixed(1) + "°C"]); // TODO: time of day temperature
							// TODO: feels like

							bits.push(["humidity", j.humidity.toString() + "%"]);
							bits.push(["pressure", j.pressure.toString() + "hPa"]);
							if (j.wind) {
								var str = j.wind.speed.toString() + "m/s";
								if (j.wind.gust)
									str += " (" + j.wind.gust.toString() + "m/s)";
								if (j.wind.deg) {
									str += " " + j.wind.deg.toFixed(0).toString() + "°";
									str += " (" + self.windChars(j.wind.deg) + ")";
								}

								if (str)
									bits.push(["wind", str]);
								else
									bot.out.warn("weather", j);
							}
							bits.push(["clouds", j.clouds.toString() + "%"]);
							if (j.rain !== undefined) {
								bits.push(["rain", j.rain.toString() + "mm/3h"]); // correct unit?
							}
							if (j.snow) {
								bits.push(["snow", j.snow.toString() + "mm/3h"]); // correct unit?
							}
							if (j.weather) {
								var val = "";
								for (var i = 0; i < j.weather.length; i++) {
									val += j.weather[i].description;
									if (i != j.weather.length - 1)
										val += ", ";
								}
								bits.push(["conditions", val]);
							}
							/*if (j.sys.sunrise) {
								var d = self.DateUTC(new Date(j.sys.sunrise * 1000));
								bits.push(["sunrise", d.toTimeString().split(" ")[0]]);
							}
							if (j.sys.sunset) {
								var d = self.DateUTC(new Date(j.sys.sunset * 1000));
								bits.push(["sunset", d.toTimeString().split(" ")[0]]);
							}*/

							callback(bot.plugins.bits.format(prefix, bits));
							return;
						}
					}

					callback("No forecast found for \x02" + displayName + " @ " + bot.plugins.date.printDateTime(time));
				}
				else {
					callback("No place called \x02" + place);
				}
			}
			else if (!err && res.statusCode == 401) {
				callback("No API permissions");
			}
		});
	};

	self.past = function(place, placeParams, time, callback) {
		var t = time.getTime() / 1000;

		if (!placeParams) {
			callback("No place called \x02" + place);
			return;
		}

		request({
			url: "http://api.openweathermap.org/data/2.5/history/city/",
			qs: Object.assign({
				"APPID": self.apiKey,
				"lang": "en",
				"type": "hour",
				"cnt": 1,
				"start": t
			}, placeParams)
		}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var jj = JSON.parse(body);
				if (jj.cod == 200) {
					var displayName = placeParams._display || place;

					if (jj.cnt > 0) {
						var j = jj.list[0];

						var prefix = displayName + " @ " + bot.plugins.date.printDateTime(time);
						var bits = [];

						bits.push(["temperature", (j.main.temp - 273.15).toFixed(1) + "°C"]);
						bits.push(["feels like", self.windChill(j).toFixed(1) + "°C"]);

						bits.push(["humidity", j.main.humidity.toString() + "%"]);
						bits.push(["pressure", j.main.pressure.toString() + "hPa"]);
						if (j.wind) {
							var str = j.wind.speed.toString() + "m/s";
							if (j.wind.gust)
								str += " (" + j.wind.gust.toString() + "m/s)";
							if (j.wind.deg) {
								str += " " + j.wind.deg.toFixed(0).toString() + "°";
								str += " (" + self.windChars(j.wind.deg) + ")";
							}

							if (str)
								bits.push(["wind", str]);
							else
								bot.out.warn("weather", j);
						}
						bits.push(["clouds", j.clouds.all.toString() + "%"]);
						if (j.rain) {
							var str;
							if (j.rain["3h"] !== undefined)
								str = j.rain["3h"].toString() + "mm/3h";
							else if (j.rain["1h"] !== undefined)
								str = j.rain["1h"].toString() + "mm/h";

							if (str)
								bits.push(["rain", str]);
							else
								bot.out.warn("weather", j);
						}
						if (j.snow) {
							var str;
							if (j.snow["3h"] !== undefined)
								str = j.snow["3h"].toString() + "mm/3h";
							else if (j.snow["1h"] !== undefined)
								str = j.snow["1h"].toString() + "mm/h";

							if (str)
								bits.push(["snow", str]);
							else
								bot.out.warn("weather", j);
						}
						if (j.weather) {
							var val = "";
							for (var i = 0; i < j.weather.length; i++) {
								val += j.weather[i].description;
								if (i != j.weather.length - 1)
									val += ", ";
							}
							bits.push(["conditions", val]);
						}
						/*if (j.sys.sunrise) {
							var d = self.DateUTC(new Date(j.sys.sunrise * 1000));
							bits.push(["sunrise", d.toTimeString().split(" ")[0]]);
						}
						if (j.sys.sunset) {
							var d = self.DateUTC(new Date(j.sys.sunset * 1000));
							bits.push(["sunset", d.toTimeString().split(" ")[0]]);
						}*/

						callback(bot.plugins.bits.format(prefix, bits));
					}
					else {
						callback("No history found for \x02" + displayName + " @ " + bot.plugins.date.printDateTime(time));
					}
				}
				else {
					callback("No place called \x02" + place);
				}
			}
			else if (!err && res.statusCode == 401) {
				callback("No API permissions");
			}
		});
	};

	self.geocode = function(place, callback) {
		bot.plugins.gmaps.client.geocode({
			address: place,
			bounds: {
				south: 36.564588,
				west: -25.447750,
				north: 55.609773,
				east: 52.242086
			}
		}, function(err, res) {
			if (!err) {
				var j = res.json;
				//bot.out.debug("weather", j);
				switch (j.status) {
					case "OK":
						var result = j.results[0];
						//bot.out.debug("weather", result.address_components);
						var location = result.geometry.location;
						callback({
							lon: location.lng,
							lat: location.lat,
							_display: result.formatted_address
						});
						break;

					default:
						bot.out.error("weather", err, res);
						// fallthrough

					case "ZERO_RESULTS":
						callback(null);
						break;
				}
			}
			else {
				bot.out.error("weather", err, res);
				callback(null);
			}
		});
	};

	self.presentProxy = function(format) {
		return function(nick, to, args) {
			var place = args[0] || nick;
			place = self.parseUser(place);

			self.geocode(place, function(placeParams) {
				self.lookupPresent(place, placeParams, format, function(str) {
					bot.say(to, str);
				});
			});
		};
	}

	self.events = {
		/*"cmd#weather": function(nick, to, args) {
			var place = args[0] || nick;
			place = self.parseUser(place);

			self.geocode(place, function(placeParams) {
				self.present(place, placeParams, null, function(str) {
					bot.say(to, str);
				});
			});
		},*/

		"cmd#weather": self.presentProxy(self.formatPresent),

		"cmd#sweater": self.presentProxy(self.formatSweater),

		"cmd#weather2": function(nick, to, args) {
			var place = args[1];
			var time = new Date(args[2]);
			place = self.parseUser(place);

			self.geocode(place, function(placeParams) {
				var func = null;
				if (isNaN(time))
					func = self.present;
				else if (Date.now() < time.getTime())
					func = self.future;
				else if (Date.now() > time.getTime())
					func = self.past;

				func(place, placeParams, time, function(str) {
					bot.say(to, str);
				});
			});
		},

		"cmd#setweather": function(nick, to, args) {
			bot.plugins.nickserv.nickIdentified(nick, function(identified) {
				if (identified) {
					if (args[0] !== undefined && args[0].trim() !== "") {
						self.users[nick.toLowerCase()] = args[0];
						bot.notice(nick, "weather set to " + args[0]);
					}
					else {
						delete self.users[nick.toLowerCase()];
						bot.notice(nick, "weather unset");
					}
				}
				else
					bot.notice(nick, "must be identified for this nick to set weather");
			});
		},
	};
}

module.exports = WeatherPlugin;
