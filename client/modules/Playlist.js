Playlist =
{
	SECTION:
	{
		PRIVATE: 1,
		SHARED: 2,
		PUBLIC: 3,
		FAVORITES: 4,
		RECENT: 5,
	},
}

// Create a new playlist with the name provided
Playlist.create = function(name)
{
	$.ajax
	({
		url: "/playlists/",
		type: "POST",
		data: JSON.stringify({ name: name }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var playlistId = response;

			Playlist.active =
			{
				playlistId: playlist[0],
				name: name,
				access: 1
			}

			$("#playlist-name").text(name);
			Playlist.setTrackCounter(0);

			var ItemList = require("./ItemList.js");
			ItemList.setItems( [] );
		}
	});
}

// Retrieve playlist tracks and metadata
Playlist.load = function(playlistId)
{
	$.ajax
	({
		url: "/playlists/" + playlistId + "/",
		type: "GET",
		success: Playlist.onLoadResponse
	});
}

// Retrieve main playlist of the user
Playlist.loadMain = function()
{
	$.ajax
	({
		url: "/own/playlists/main/",
		type: "GET",
		success: Playlist.onLoadResponse
	});
}

// Retrieve the list of all playlists in a section
Playlist.loadSection = function(sectionId, alias)
{
	// todo: request playlists from the server

	var previewCount = sectionId * 3 + 1;

	for(var i = 1; i < previewCount; i++)
	{
		var $info =
			$("<div>")
				.addClass("info")
				.append(
					$("<div>")
						.addClass("name")
						.text("Playlist " + i),
					$("<div>")
						.addClass("details")
						.text("10 tracks")
				);

		var $icon =
			$("<div>")
				.addClass("edit icon fa fa-pencil");

		var $playlist = 
			$("<div>")
				.addClass("playlist")
				.append($info, $icon);

		$("#playlists").append($playlist);
	}

	var storage = [];

	$(".playlist").each(function()
	{
		storage.push( $(this) );
	});

	$("#playlists")
		.data(alias.toLowerCase(), storage)
		.animate({ scrollTop: 0, }, 0);
}

Playlist.onLoadResponse = function(response)
{
	if(response.errors)
		return;

	var playlist = response[0];
	var items = response[1];

	Playlist.active =
	{
		playlistId: playlist[0],
		name: playlist[1],
		access: playlist[2]
	};

	$("#playlist-name").text(Playlist.active.name);
	Playlist.setTrackCounter(items.length);

	var ItemList = require("./ItemList.js");
	ItemList.setItems(items);
}

// Fill the playlists section with data from server or the local storage
Playlist.updateSection = function()
{
	var alias = $("#playlists-menu .active").data("alias");

	$("#playlists").empty();

	var storage = $("#playlists").data( alias.toLowerCase() );

	// Already have the playlists stored, retrieve them and bail out
	if(storage != null)
	{
		storage.forEach(function($playlist)
		{
			$("#playlists").append($playlist);
		});

		$("#playlists").animate({ scrollTop: 0, }, 0);

		return;
	}

	Playlist.loadSection( Playlist.SECTION[alias], alias );
}

// Store alias as a data value of the menu button
Playlist.setMenuAlias = function()
{
	var alias = $(this).attr("id");

	// "playlists-menu-private" > "PRIVATE"
	alias = alias
		.substring(alias.indexOf("playlists-menu-") + 15)
		.toUpperCase();

	$(this).data("alias", alias);
}

// Set active section by alias
Playlist.setActiveSection = function(alias)
{
	var $section =
		$( "#playlists-menu-" + alias.toLowerCase() );

	// Section is already active, bail out
	if($section.is(".active"))
		return;

	$("#playlists-menu div").removeClass("active");
	$section.addClass("active");
	
	Playlist.updateSection();
}

// Set track counter to specified value
Playlist.setTrackCounter = function(count)
{
	$("#playlist-details").text(count + " tracks");
}

// Called upon clicking the playlist header
Playlist.onHeaderClick = function()
{
	var Account = require("./Account.js");
	var hiding = $("#sidebar").is(".visible");

	if( !Account.authenticated && !hiding)
		return Account.showLoginOverlay();

	$("#header-left").toggleClass("active");
	$("#sidebar").toggleClass("visible");

	if(hiding)
		return;

	Playlist.updateSection();
}

// Called upon clicking the menu button
Playlist.onMenuClick = function()
{
	var alias = $(this).data("alias");
	Playlist.setActiveSection(alias);
}

Playlist.init = function()
{
	$("#playlists-menu div")
		.each(Playlist.setMenuAlias)
		.click(Playlist.onMenuClick);

	$("#header-left").click(Playlist.onHeaderClick);
}

module.exports = Playlist;
