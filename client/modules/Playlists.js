Playlists =
{
	activeId: 1 // todo: use playlistId from current URL or user playlists
}

// Create a new playlist with the name provided
Playlists.create = function(name)
{
	var ItemList = require("./ItemList.js");
	
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

			Playlists.activeId = playlistId;
			$("#playlist-name").text(name);
			ItemList.setItems( [] );
			Playlists.setTrackCounter(0);
		}
	});
}

// Retrieve playlist tracks and metadata
Playlists.load = function(playlistId)
{
	var ItemList = require("./ItemList.js");
	
	$.ajax
	({
		url: "/playlists/" + playlistId + "/",
		type: "GET",
		success: function(response)
		{
			if(response.errors)
				return;

			var playlist = response[0];
			var items = response[1];

			$("#playlist-name").text(playlist[0]);
			ItemList.setItems(items);
			Playlists.setTrackCounter(items.length);
		}
	});
}

// Set track counter to specified value
Playlists.setTrackCounter = function(count)
{
	$("#playlist-details").text(count + " tracks");
}

module.exports = Playlists;
