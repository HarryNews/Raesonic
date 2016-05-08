var Enum = require("./Enum.js");

var Item = {};

// Play the specified item
Item.play = function($item)
{
	var Player = require("./Player.js");
	Player.setItem($item);
}

// Start editing the item
Item.edit = function()
{
	$item = $(this).parent();

	var trackId = $item.data("trackId");
	var itemId = $item.data("itemId");

	var artist = "";
	var title = "";

	function updateWindowButton()
	{
		// Without itemId no changes are possible
		if(!itemId)
			return $("#window-button").text("");

		var artistChanged = ($("#edit-artist").val() != artist);
		var titleChanged = ($("#edit-title").val() != title);

		// At least one field needs to be different to confirm changes
		// If there is no track assigned, both fields are required
		var saveAllowed = (trackId != -1)
			? (artistChanged || titleChanged)
			: (artistChanged && titleChanged)

		if(saveAllowed)
		{
			$("#window-button")
				.text("SAVE")
				.unbind()
				.click(function()
				{
					Item.rename(itemId, trackId, $("#edit-artist").val(), $("#edit-title").val(), artistChanged, titleChanged);
				});

			return;
		}

		$("#window-button")
			.text("REMOVE")
			.unbind()
			.click(function()
			{
				Item.remove(itemId);
			});
	}
	
	if(trackId != -1)
	{
		artist = $(":nth-child(1)", $item)
			.html()
			.replace(/<span>&amp;<\/span>/g, "&+");

		title = $(":nth-child(2)", $item)
			.html()
			.replace(/<span>(.+)<\/span>/g, "($1)");
	}

	$("#window")
		.empty()
		.append(
			$("<div>")
				.attr("id", "window-header")
				.text("Edit track")
		)
		.append(
			$("<input>")
				.attr({ "id": "edit-artist", "type": "text", "maxlength": 50, "placeholder": "Artist" })
				.val(artist)
				.keyup(updateWindowButton)
		)
		.append(
			$("<input>")
				.attr({ "id": "edit-title", "type": "text", "maxlength": 50, "placeholder": "Title" })
				.val(title)
				.keyup(updateWindowButton)
		)
		.prepend($("<button>").attr("id", "window-button")
	);

	updateWindowButton();

	$("#overlay")
		.hide()
		.removeClass("hidden")
		.fadeIn(200)
		.unbind()
		.click(function(e)
		{
			if(e.target != this)
				return;

			$(this).fadeOut(200, function()
			{
				$(this).addClass("hidden");
			});
		});
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
				Player.switchItem(Enum.Direction.Next);
			}

			$item.remove();
			Playlist.setTrackCounter($(".item").length);
			$("#overlay").click();
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

			var $items = $(".item").filterByData("externalId", externalId)

			artist = artist.replace(/&\+/g, "<span>&</span>");
			title = title.replace(/\((.+)\)/g, "<span>$1</span>");

			$(":nth-child(1)", $items).html(artist);
			$(":nth-child(2)", $items).html(title);

			if($items.is(".active"))
			{
				$("#meta-artist").html(artist);
				$("#meta-title").html(title);
			}

			$items.data("trackId", trackId);
			$("#overlay").click();
		}
	});
}

// Called upon clicking the item's artist or title element
Item.onClick = function()
{
	var $item = $(this).parent();
	Item.play($item);
}

module.exports = Item;
