var Overlay = require("./Overlay.js");

var Item = {};

// Play the specified item
Item.play = function($item)
{
	var Player = require("./Player.js");
	Player.setItem($item);
}

// Remove specified item from the playlist
Item.remove = function(itemId)
{
	$.ajax
	({
		url: "/items/" + itemId + "/",
		type: "DELETE",
		success: function(response)
		{
			if(response.errors)
				return;

			var $item = $(".item").filterByData("itemId", itemId);

			if($item.is(".active"))
			{
				var Player = require("./Player.js");
				var ItemList = require("./ItemList.js");
				Player.switchItem(ItemList.NEXT_ITEM);
			}

			$item.remove();
			Playlist.setTrackCounter($(".item").length);

			Overlay.destroy();
		}
	});
}

// Change item's artist and/or title information
Item.rename = function(itemId, trackId, artist, title, artistChanged, titleChanged)
{
	var trackExists = (trackId != -1);

	var tracksUrl = trackExists
		? "/tracks/" + trackId + "/"
		: "/tracks/";

	var data = trackExists
		?
		{
			itemId: itemId,
			artist: { name: artist, changed: artistChanged},
			title: { name: title, changed: titleChanged },
		}
		:
		{
			itemId: itemId,
			artist: artist,
			title: title,
		};

	$.ajax
	({
		url: tracksUrl,
		type: trackExists ? "PUT" : "POST",
		data: JSON.stringify(data),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var trackId = response;

			var externalId = $(".item")
				.filterByData("itemId", itemId)
				.data("externalId");

			var $item = $(".item").filterByData("externalId", externalId)

			artist = Item.formatArtist(artist);
			title = Item.formatTitle(title);

			$(":nth-child(1)", $item).html(artist);
			$(":nth-child(2)", $item).html(title);

			// Update meta and history if the item is active
			if($item.is(".active"))
			{
				$("#meta-artist").html(artist);
				$("#meta-title").html(title);

				setTimeout(function()
				{
					var Tab = require("./Tab.js");
					Tab.History.clearStorage();
					Tab.setActive(Tab.History);
					
					setTimeout(function()
					{
						var Tab = require("./Tab.js");
						Tab.onItemChange($item);
					}, 1000);
				}, 3000);
			}

			$item.data("trackId", trackId);
			Overlay.destroy();
		}
	});
}

// Updates the item editing overlay
Item.updateEditOverlay = function()
{
	// Without itemId no changes are possible
	if(!Item.editing.itemId)
		return Overlay.setAction(null);

	var artistChanged = ( $("#edit-artist").val() != Item.editing.artist );
	var titleChanged = ( $("#edit-title").val() != Item.editing.title );

	var trackExists = (Item.editing.trackId != -1);

	// At least one field needs to be different to confirm changes
	// If there is no track assigned, both fields are required
	var saveAllowed = trackExists
		? (artistChanged || titleChanged)
		: (artistChanged && titleChanged)

	saveAllowed
		? Overlay.setAction("Save", Item.onItemSaveClick)
		: Overlay.setAction("Remove", Item.onItemRemoveClick);
}

// Replaces &+ with <span>&</span>
Item.formatArtist = function(artist)
{
	return artist.replace(/&\+/g, "<span>&</span>")
}

// Replaces  (...) with <span>(...)</span>
Item.formatTitle = function(title)
{
	return title.replace(/\((.+)\)/g, "<span>$1</span>");
}

// Replaces <span>&</span> with &+
Item.restoreArtist = function(artist)
{
	return artist.replace(/<span>&amp;<\/span>/g, "&+");
}

// Replaces <span>(...)</span> with (...)
Item.restoreTitle = function(title)
{
	return title.replace(/<span>(.+)<\/span>/g, "($1)");
}

// Called upon clicking the item's artist or title element
Item.onClick = function()
{
	var $item = $(this).parent();
	Item.play($item);
}

// Called upon clicking the pencil icon
Item.onEditIconClick = function()
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return Account.showLoginOverlay();
	
	$item = $(this).parent();

	Item.editing = 
	{
		itemId: $item.data("itemId"),
		trackId: $item.data("trackId"),
		artist: "",
		title: "",
	};
	
	var trackExists = (Item.editing.trackId != -1);

	if(trackExists)
	{
		Item.editing.artist = Item.restoreArtist( $(":nth-child(1)", $item).html() );
		Item.editing.title = Item.restoreTitle( $(":nth-child(2)", $item).html() );
	}
	
	Overlay.create("Edit track",
	[{
		tag: "<input>",
		attributes:
		{
			id: "edit-artist",
			type: "text",
			maxlength: 50,
			placeholder: "Artist",
		},
		val: Item.editing.artist,
		keyup: Item.updateEditOverlay,
	},
	{
		tag: "<input>",
		attributes:
		{
			id: "edit-title",
			type: "text",
			maxlength: 50,
			placeholder: "Title",
		},
		val: Item.editing.title,
		keyup: Item.updateEditOverlay,
	}],
	function onOverlayCreate()
	{
		Item.updateEditOverlay();
	});
}

// Called upon clicking the save button in the overlay
Item.onItemSaveClick = function()
{
	var artistChanged = ( $("#edit-artist").val() != Item.editing.artist );
	var titleChanged = ( $("#edit-title").val() != Item.editing.title );

	Item.rename
	(
		Item.editing.itemId,
		Item.editing.trackId,
		$("#edit-artist").val(),
		$("#edit-title").val(),
		artistChanged,
		titleChanged
	);
}

// Called upon clicking the remove button in the overlay
Item.onItemRemoveClick = function()
{
	Item.remove(Item.editing.itemId);
}

module.exports = Item;
