var HistoryTab =
{
	ALIAS: "history",
	// History action types
	TYPE_TRACK_EDITS: 1,
	TYPE_CONTENT_LINKS: 2,
};

// Request history for specified entity
HistoryTab.request = function(historyType, entityId)
{
	var request = {};

	switch(historyType)
	{
		case HistoryTab.TYPE_TRACK_EDITS:
		{
			request =
			{
				url: "/tracks/" + entityId + "/edits/",
				key: "track-edits",
				field: "trackId",
			};

			break;
		}
		case HistoryTab.TYPE_CONTENT_LINKS:
		{
			request =
			{
				url: "/content/" + entityId + "/links/",
				key: "content-links",
				field: "externalId",
			};

			break;
		}
		default:
		{
			return;
		}
	}
	
	// Remove sourceId part from the entityId
	if(request.field == "externalId")
		entityId = entityId.substring(2);

	// Wipe the data storage
	$("#tab-history").data
	({
		[request.key]: [],
		[request.field]: entityId,
	});

	// Remove existing actions
	var $destination = $("#history-" + request.key);
	$destination.empty();

	// No track attached, bail out
	if(request.field == "trackId" && entityId == -1)
		return;

	$.ajax
	({
		url: request.url,
		type: "GET",
		success: function(response)
		{
			if(response.errors)
				return;

			var $item = $(".item").filterByData(request.field, entityId);

			// Couldn't find the item, bail out
			if(!$item.length)
				return;

			// Item is no longer active, bail out
			if(!$item.is(".active"))
				return;

			$("#tab-history").data(request.key, response);

			var latestArtist;
			var latestTitle;

			response.forEach(function addAction(action)
			{
				var actionId = action[0];
				var artist = action[1];
				var title = action[2];
				var date = action[3];
				var username = action[4];

				if(artist)
					latestArtist = artist;

				if(title)
					latestTitle = title;

				date = HistoryTab.getRelativeDate(date);

				$destination.prepend(
					$("<div>")
						.addClass("action")
						.append(
							$("<div>")
								.addClass("changes")
								.append(
									$("<div>")
										.addClass("artist")
										.text(latestArtist),
									$("<div>")
										.addClass("title")
										.text(latestTitle)
								),
							$("<div>")
								.addClass("details")
								.append(
									$("<div>")
										.addClass("user")
										.text(username),
									$("<div>")
										.addClass("date")
										.text(date)
								)
						)
				);
			})
		}
	});
}

// Returns a relative date in a readable format
// (c) John Resig & Faiz
HistoryTab.getRelativeDate = function(date)
{
	var date = new Date((date || "").replace(/-/g, "/").replace(/[TZ]/g, " ")),
		diff = ( ( ( new Date() ).getTime() - date.getTime() ) / 1000),
		dayDiff = Math.floor(diff / 86400);

	var year = date.getFullYear(),
		month = date.getMonth() + 1,
		day = date.getDate();

	if (isNaN(dayDiff) || dayDiff < 0 || dayDiff >= 31)
		return (
			year.toString() + "-"
			+ ( (month < 10) ? "0" + month.toString() : month.toString() ) + "-"
			+ ( (day < 10) ? "0" + day.toString() : day.toString() )
		);

		var r =
		( 
			(
				dayDiff == 0 && 
				(
					(diff < 60 && "just now")
						|| (diff < 120 && "1 minute ago")
						|| (diff < 3600 && Math.floor(diff / 60) + " minutes ago")
						|| (diff < 7200 && "1 hour ago")
						|| (diff < 86400 && Math.floor(diff / 3600) + " hours ago")
				)
			)
			|| (dayDiff == 1 && "Yesterday")
			|| (dayDiff < 7 && dayDiff + " days ago")
			|| (dayDiff < 31 && Math.ceil(dayDiff / 7) + " weeks ago")
		);

		return r;
}

// Clear storage variables
HistoryTab.clearStorage = function()
{
	$("#tab-history").removeData();
}

// Called when the history tab becomes active
HistoryTab.onSetActive = function($overrideItem)
{
	var $item = $overrideItem || $(".item.active");

	// No active item, bail out
	if(!$item.length)
		return;

	// Update track edits data if a different track is being set
	if($item.data("trackId") != $("#tab-history").data("trackId"))
	{
		HistoryTab.request( HistoryTab.TYPE_TRACK_EDITS,
			$item.data("trackId") );
	}

	// Update content links data if a different content is being set
	if($item.data("externalId") != $("#tab-history").data("externalId"))
	{
		HistoryTab.request( HistoryTab.TYPE_CONTENT_LINKS,
			$item.data("sourceId") + "/" + $item.data("externalId") );
	}
}

// Called upon active item change
HistoryTab.onItemChange = function($item)
{
	HistoryTab.onSetActive($item);
}

HistoryTab.init = function()
{

}

module.exports = HistoryTab;
