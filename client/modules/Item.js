var Item = {};

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
		var artistChanged = ($("#edit-artist").val() != artist);
		var titleChanged = ($("#edit-title").val() != title);

		if((trackId != -1) ? (artistChanged || titleChanged) : (artistChanged && titleChanged))
		{
			$("#window-button").text("SAVE").unbind().click(function()
			{
				Item.rename(itemId, trackId, $("#edit-artist").val(), $("#edit-title").val(), artistChanged, titleChanged);
			});
			return;
		}

		if(!itemId)
			return $("#window-button").text("");

		$("#window-button").text("REMOVE").unbind().click(function()
		{
			Item.remove(itemId);
		});
	}
	if(trackId != -1)
	{
		artist = $(":nth-child(1)", $item).html().replace(/<span>&amp;<\/span>/g, "&+");
		title = $(":nth-child(2)", $item).html().replace(/<span>(.+)<\/span>/g, "($1)");
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
				.val(artist).keyup(updateWindowButton)
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
	$("#overlay").hide().removeClass("hidden").fadeIn(200).unbind().click(function(e)
	{
		if(e.target != this) return;
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
			if(response.error)
				return;

			var $item = $(".item").filterByData("itemId", itemId);

			if($item.is(".active"))
				Player.switchItem(Direction.Next);

			$item.remove();
			Playlists.setTrackCounter($(".item").length);
			$("#overlay").click();
		}
	});
}
Item.rename = function(itemId, trackId, artist, title, artistChanged, titleChanged)
{
	var tracksUrl = "/tracks/";

	if(trackId != -1)
		tracksUrl = tracksUrl + trackId + "/";

	var trackExists = (trackId != -1);

	$.ajax
	({
		url: tracksUrl,
		type: trackExists ? "PUT" : "POST",
		data:
		{
			itemId: itemId,
			artist: trackExists ? [artist, artistChanged] : artist,
			title: trackExists ? [title, titleChanged] : title
		},
		success: function(response)
		{
			if(response.error)
				return;

			var trackId = response;
			var externalId = $(".item").filterByData("itemId", itemId).data("externalId");
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

$.fn.filterByData = function(key, value)
{
	return $(this).filter(function() { return $(this).data(key) && $(this).data(key) == value; });
};

module.exports = Item;
