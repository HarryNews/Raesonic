Playlists =
{
	activeId: 1 // todo: use playlistId from current URL or user playlists
}

// Set track counter to specified value
Playlists.setTrackCounter = function(count)
{
	$("#playlist-details").text(count + " tracks");
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
			if(response.error)
				return;

			var playlist = response[0];
			var items = response[1];

			$("#playlist-name").text(playlist[0]);
			ItemList.setItems(items);
			Playlists.setTrackCounter(items.length);
		}
	});
}

module.exports = Playlists;
