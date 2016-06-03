var YouTube = require("./api/YouTube.js");
var SoundCloud = require("./api/SoundCloud.js");

$(document).ready(function()
{
	var Account = require("./modules/Account.js");
	var Player = require("./modules/Player.js");
	var Content = require("./modules/Content.js");
	var Playlist = require("./modules/Playlist.js");
	var Relation = require("./modules/Relation.js");
	var Search = require("./modules/Search.js");
	var Tab = require("./modules/Tab.js");
	var Overlay = require("./modules/Overlay.js");
	var Preloader = require("./modules/Preloader.js");

	Account.init(function onAccountSync()
	{
		setTimeout(Preloader.onLoad, 2000);
	});

	Player.init();
	
	YouTube.init();
	SoundCloud.init();

	Content.init();
	Relation.init();
	Search.init();
	Overlay.init();
	Tab.init();
});

$.fn.filterByData = function(key, value)
{
	return $(this).filter(function()
	{
		return $(this).data(key) && $(this).data(key) == value;
	});
};
