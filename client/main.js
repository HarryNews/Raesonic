var YouTube = require("./api/YouTube.js");
var SoundCloud = require("./api/SoundCloud.js");

$(document).ready(function()
{
	var Account = require("./modules/Account.js");
	var Player = require("./modules/Player.js");
	var Playlist = require("./modules/Playlist.js");
	var Search = require("./modules/Search.js");
	var Tab = require("./modules/Tab.js");
	var Preloader = require("./modules/Preloader.js");

	Account.init();
	Player.init();

	YouTube.init();
	SoundCloud.init();

	Search.init();
	Tab.init();

	setTimeout(Preloader.onLoad, 2000);
});

$.fn.filterByData = function(key, value)
{
	return $(this).filter(function()
	{
		return $(this).data(key) && $(this).data(key) == value;
	});
};
