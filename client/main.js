var YouTube = require("./api/YouTube.js");
var SoundCloud = require("./api/SoundCloud.js");

$(document).ready(function()
{
	var Player = require("./modules/Player.js");
	var Playlists = require("./modules/Playlists.js");
	var Search = require("./modules/Search.js");
	var Tabs = require("./modules/Tabs.js");
	var Preloader = require("./modules/Preloader.js");

	Player.init();

	YouTube.init();
	SoundCloud.init();

	Search.init();
	Tabs.init();

	Playlists.load(Playlists.activeId);

	setTimeout(Preloader.onLoad, 2000);
});

$.fn.filterByData = function(key, value)
{
	return $(this).filter(function() { return $(this).data(key) && $(this).data(key) == value; });
};
