var Overlay = require("./Overlay.js");

var Item = {};

// Play the specified item
Item.play = function($item, isManualSwitch)
{
	var Player = require("./Player.js");
	Player.setItem($item, isManualSwitch);
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

				Item.active.trackId = trackId;
				Item.active.artist = artist;
				Item.active.title = title;

				var History = require("./History.js");
				History.clearStorage();

				var Tab = require("./Tab.js");

				// Show history tab with updated entries
				Tab.isActive(Tab.History)
					? History.updateItemActions($item)
					: Tab.setActive(Tab.History);
				
				setTimeout(function()
				{
					// Allow tab interaction if a track is attached
					var Tab = require("./Tab.js");
					Tab.onItemChange($item);
				}, 1000);
			}

			$item.data("trackId", trackId);
			Overlay.destroy();
		}
	});
}

// Update the item editing overlay
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

// Replace &+ with <span>&amp;</span>
Item.formatArtist = function(artist)
{
	return artist.replace(/&\+/g, "<span>&</span>");
}

// Replace  (...) with <span>(...)</span>
Item.formatTitle = function(title)
{
	return title.replace(/\((.+)\)/g, "<span>$1</span>");
}

// Replace <span>&amp;</span> with &+ / &, &amp; with &
Item.restoreArtist = function(artist, clean)
{
	artist = artist
		.replace(/<span>&amp;<\/span>/g,
			clean
				? "&"
				: "&+")
		.replace(/&amp;/g, "&");

	return artist;
}

// Replace <span>(...)</span> with (...), &amp; with &
Item.restoreTitle = function(title)
{
	title = title
		.replace(/<span>(.+)<\/span>/g, "($1)")
		.replace(/&amp;/g, "&");

	return title;
}

// Replace <span> with <span class="padded">
Item.padSpans = function(field)
{
	return field.replace(/<span>/g,
		"<span class=\"padded\">");
}

// Fade out and remove the dropdown
Item.fadeRemoveDropdown = function()
{
	$("#add-list")
		.fadeOut(200, function onDropdownFadeOut()
		{
			$(this).remove();
		})
		.parent()
		.removeClass("adding");

	$("body").unbind("mousedown", Item.onDocumentMouseDown);
	$("body").unbind("keydown", Item.onDocumentKeyDown);

	$("#items").unbind("scroll touchmove mousewheel",
		Item.onItemListScroll);
}

// Return vertical offset of the item
Item.getScrollOffset = function($item, offset)
{
	return $item.height() *
		(
			$item
				.siblings(":visible")
				.addBack()
				.index($item) +
					(offset || 0)
		)
}

// Called upon clicking the item's artist or title element
Item.onClick = function()
{
	var $item = $(this).parent();
	var ItemList = require("./ItemList.js");

	Item.play($item, ItemList.MANUAL_SWITCH);
}

// Called upon clicking the pencil icon
Item.onEditIconClick = function()
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return Account.showLoginOverlay();
	
	var $item = $(this).parent();

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
		Item.editing.artist =
			Item.restoreArtist( $(":nth-child(1)", $item).html() );
		Item.editing.title =
			Item.restoreTitle( $(":nth-child(2)", $item).html() );
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

// Called upon clicking the plus icon
Item.onAddIconClick = function()
{
	var $item = $(this).parent();

	// Dropdown is shown on the same item, just remove it
	if($item.find("#add-list").length)
		return Item.fadeRemoveDropdown();

	Item.fadeRemoveDropdown();

	var $dropdown = $("<div>").attr("id", "add-list");
	
	// Active item exists and differs from selected, both have tracks attached
	if(Item.active && Item.active.trackId != $item.data("trackId") &&
		Item.active.trackId != -1 && $item.data("trackId") != -1)
	{
		$dropdown.append(
			$("<div>")
				.addClass("list-element")
				.html( "<div class=\"icon fa fa-exchange\"></div>" +
					Item.active.artist + " – " + Item.padSpans(Item.active.title) )
				.click(Item.onRelationElementClick)
		);
	}

	var Playlist = require("./Playlist.js");

	var sections = ["private", "shared", "public"]
	var sectionIcons =
	[
		"private corner icon fa fa-lock",
		"shared corner icon fa fa-link",
		"public corner icon fa fa-globe",
	];

	sections.forEach(function(sectionAlias, sectionIndex)
	{
		var $playlists = $("#playlists").data(sectionAlias);

		if($playlists != null)
		{
			$playlists.forEach(function($playlist)
			{
				var playlistId = $playlist.data("playlistId");

				// Skip active playlist
				if(playlistId == Playlist.active.playlistId)
					return;

				var name = $playlist.find(".name").text();

				$dropdown.append(
					$("<div>")
						.addClass("list-element")
						.html("<div class=\"icon fa fa-list\"></div>" +
							"<div class=\"" +
							sectionIcons[sectionIndex] + "\"></div>" +
							name)
						.data
						({
							playlistId: playlistId,
							name: name,
						})
						.click(Item.onPlaylistElementClick)
				);
			});
		}
	});

	// Below item or above item if it doesn't fit on screen
	var itemsVisible = Math.min($dropdown.children().length, 5);

	var isFittingBelow =
		( $item.offset().top <
			( $(document).height() - itemsVisible * 40 - 80 ) );

	$dropdown.css("top", (isFittingBelow)
		? Item.getScrollOffset($item, 1)
		: Item.getScrollOffset($item, -itemsVisible) + itemsVisible * 3
	);

	$item
		.addClass("adding")
		.append( $dropdown.fadeIn(200) );

	$("body").bind("mousedown", Item.onDocumentMouseDown);
	$("body").bind("keydown", Item.onDocumentKeyDown);

	$("#items").bind("scroll touchmove mousewheel",
		Item.onItemListScroll);
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

// Called upon clicking a track item in the dropdown list
Item.onRelationElementClick = function()
{
	if(Overlay.isActive())
		return;

	Item.fadeRemoveDropdown();

	$item = $(this).parents(".item");

	var trackName = Item.active.artist + "<br>" +
		Item.padSpans(Item.active.title);

	var linkedName = $(":nth-child(1)", $item).html() + "<br>" +
		Item.padSpans( $(":nth-child(2)", $item).html() );

	Overlay.create("Create new recommendation",
	[{
		tag: "<p>",
		text: "You are suggesting that these tracks are similar:",
	},
	{
		tag: "<p>",
		attributes:
		{
			id: "relation-subject",
			class: "subject",
		},
		html: trackName,
		data:
		{
			trackId: Item.active.trackId,
			linkedId: $item.data("trackId"),
		}
	},
	{
		tag: "<p>",
		attributes:
		{
			id: "relation-extra-subject",
			class: "extra subject final",
		},
		html: linkedName,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "relation-create",
			class: "inner window-link",
		},
		text: "Create Recommendation",
		click: Item.onRelationCreateClick,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "relation-cancel",
			class: "window-link",
		},
		text: "Cancel",
		click: Overlay.destroy,
	}],
	function onOverlayCreate()
	{
		
	});
}

// Called upon clicking a playlist item in the dropdown list
Item.onPlaylistElementClick = function()
{
	var $item = $(".item.adding");

	var playlistId = $(this).data("playlistId");
	var playlistName = $(this).data("name");
	var data = $item.data();

	var Content = require("./Content.js")
	Content.copy(playlistId, playlistName,
		data.sourceId, data.externalId);

	Item.fadeRemoveDropdown();
}

// Called upon clicking the create relation button
Item.onRelationCreateClick = function()
{
	var data = $("#relation-subject").data();

	var Relation = require("./Relation.js");
	Relation.create(data.trackId, data.linkedId);
}

// Called when the mouse is pressed somewhere
Item.onDocumentMouseDown = function(event)
{
	var $target = $(event.target);

	// Ignore clicks on the dropdown
	if( $target.is("#add-list") ||
		$target.parents("#add-list").length )
		return;

	Item.fadeRemoveDropdown();
}

// Called when the key is pressed somewhere
Item.onDocumentKeyDown = function(event)
{
	// Ignore keys that do not change the scroll
	if([32, 33, 34, 35, 36, 37, 38, 39, 40]
		.indexOf(event.keyCode) == -1)
			return;

	Item.fadeRemoveDropdown();
}

// Called when the item list is scrolled
Item.onItemListScroll = function(event)
{
	// Not scrolling the dropdown list
	if( !$("#add-list:hover").length )
		return Item.fadeRemoveDropdown();

	if(event.type == "mousewheel")
	{
		var $dropdown = $("#add-list");

		var scrollHeight = $dropdown[0].scrollHeight;
		var scrollTop = $dropdown.scrollTop();
		var height = $dropdown.height();
		var delta = event.originalEvent.wheelDelta;
		var up = (delta > 0);

		// Allow scrolling within the dropdown list
		if( ( !up && ( -delta <= (scrollHeight - height - scrollTop) ) ) ||
			(up && (delta <= scrollTop) ) )
			return;

		// Past the limit, use the edge values
		(up)
			? $dropdown.scrollTop(0)
			: $dropdown.scrollTop(scrollHeight);
	}

	event.preventDefault();
	event.stopPropagation();
	return false;
}

module.exports = Item;
