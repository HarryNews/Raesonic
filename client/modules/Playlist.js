Playlist = {}

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

// Set track counter to specified value
Playlist.setTrackCounter = function(count)
{
	$("#playlist-details").text(count + " tracks");
}

module.exports = Playlist;
