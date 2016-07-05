var Throttle = require("throttle-debounce/throttle");

var Relation =
{
	// Response status codes
	STATUS_CREATED: 1,
	STATUS_UPVOTED: 2,
	// User vote types
	VOTE_POSITIVE: 1,
	VOTE_CLEAR: 0,
	VOTE_NEGATIVE: -1,
};

// Create a relation between two tracks
Relation.create = function(trackId, linkedId)
{
	var Toast = require("./Toast.js");

	$.ajax
	({
		url: "/relations/",
		type: "POST",
		data: JSON.stringify({ trackId: trackId, linkedId: linkedId }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var relationId = response[0];
			var status = response[1];

			var Overlay = require("./Overlay.js");
			Overlay.destroy();

			var message = (status == Relation.STATUS_CREATED)
				? "Recommendation created successfully"
				: "Recommendation has been upvoted";

			Toast.show(message, Toast.INFO);
		},
		error: Toast.onRequestError,
	});
}
Relation.createThrottled = Throttle(5000,
function(trackId, linkedId)
{
	Relation.create(trackId, linkedId);
});

// Request relations of the specified track and switch to the list view
// Play the item with provided trackId if resuming previous view
Relation.request = function(trackId, resumeTrackId)
{
	$.ajax
	({
		url: "/tracks/" + trackId + "/relations/",
		type: "GET",
		success: function(response)
		{
			if(response.errors)
				return;

			var relations = response;

			if(!relations.length)
			{
				var Toast = require("./Toast.js");
				Toast.show("There are no recommendations for " +
					"this track yet, sorry!", Toast.ERROR);

				return;
			}

			var items = [];

			relations.forEach(function(relation)
			{
				items.push
				([
					relation[0], // trackId
					relation[1], // artist
					relation[2], // title
					null, // no itemId
					null, // no sourceId
					null, // no externalId
					relation[3], // rating
					relation[4], // vote
					relation[5], // flagged
				]);
			});

			items.sort(function(a, b)
			{
				// Sort by rating, descending
				return b[6] - a[6];
			});

			var Item = require("./Item.js");
			$("#related-second-image").html( $("#content-image").html() );
			$("#related-second-title").html(Item.active.title);
			$("#related-second-artist").html(Item.active.artist);

			var name = Item.restoreArtist(Item.active.artist, true) + " – " + 
				Item.restoreTitle(Item.active.title);

			Relation.active =
			{
				trackId: Item.active.trackId,
				artist: Item.active.artist,
				title: Item.active.title,
				name: name,
				resumeTrackId: resumeTrackId,
			};

			var Search = require("./Search.js");
			Search.clear();

			var ItemList = require("./ItemList.js");
			ItemList.setItems(items, ItemList.USE_STORAGE);

			// Switch to the last viewed track if specified
			var $item = (resumeTrackId != null)
				? $(".item").filterByData("trackId", resumeTrackId)
				: $(".item:first");

			if(!$item.length)
				$item = $(".item:first");

			Item.play($item);

			Search.updatePlaceholder();

			$("#related-overlay").fadeOut(200);
		}
	});
}

// Update vote on a relation between two tracks
Relation.vote = function(trackId, linkedId, vote)
{
	var Toast = require("./Toast.js");

	$.ajax
	({
		url: "/tracks/" + trackId + "/relations/" + linkedId + "/votes/",
		type: "PUT",
		data: JSON.stringify({ vote: vote }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var $item = $(".item").filterByData("trackId", trackId);

			// Couldn't find the item, bail out
			if(!$item.length)
				return;

			// Item is no longer active, bail out
			if(!$item.is(".active"))
				return;

			var rating = response[0];
			var voteValue = response[1];

			$item.data
			({
				rating: rating,
				vote: voteValue,
			});

			Relation.updateActiveRating(rating, vote);
		},
		error: Toast.onRequestError,
	});
}
Relation.voteThrottled = Throttle(2000,
function(trackId, linkedId, vote)
{
	Relation.vote(trackId, linkedId, vote);
});

// Set vote on the active relation
Relation.setActiveVote = function(vote, $icon)
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return Account.showLoginOverlay();

	var Item = require("./Item.js");

	if(!Item.active)
		return;

	if( $icon.is(".disabled") )
		return;

	if( $icon.is(".active") )
		vote = Relation.VOTE_CLEAR;

	Relation.voteThrottled(Item.active.trackId,
		Relation.active.trackId, vote);
}

// Return to normal view after viewing recommendations
Relation.clearView = function()
{
	Relation.active = false;
	$("#related-overlay").fadeIn(200);

	var Search = require("./Search.js");
	Search.clear();

	var ItemList = require("./ItemList.js");
	ItemList.clearFilter();
	ItemList.restoreStorage();

	Search.updatePlaceholder();
}

// Update rating and rating elements state on related tab
Relation.updateActiveRating = function(rating, vote)
{
	$("#related-rating").text(rating);

	var Reputation = require("./Reputation.js");

	var canVoteUp = Reputation.hasPermission(
		Reputation.PERMISSION.VOTE_RELATIONS_UP, true
	);
	var canVoteDown = Reputation.hasPermission(
		Reputation.PERMISSION.VOTE_RELATIONS_DOWN, true
	);

	$("#related-upvote")
		.attr("title", canVoteUp
			? "These tracks are similar" +
				( (vote > 0) ? " (click to undo)" : "" )
			: "Not enough reputation"
		)
		.toggleClass( "active", (vote > 0) )
		.toggleClass("disabled", !canVoteUp);

	$("#related-downvote")
		.attr("title", canVoteDown
			? "These tracks are different" +
				( (vote < 0) ? " (click to undo)" : "")
			: "Not enough reputation"
		)
		.toggleClass( "active", (vote < 0) )
		.toggleClass("disabled", !canVoteDown);
}

// Called when a relation item is selected, and when it is made active
Relation.onRelationItemChange = function($item, artist, title)
{
	$("#related-first-title").html(title);
	$("#related-first-artist").html(artist);

	var data = $item.data();

	Relation.active.resumeTrackId = data.trackId;
	Relation.updateActiveRating(data.rating, data.vote);

	var Reputation = require("./Reputation.js");

	var canSubmitFlags = Reputation.hasPermission(
		Reputation.PERMISSION.SUBMIT_FLAGS, true
	);

	var Flag = require("./Flag.js");

	$("#related-flag")
		.data
		({
			entityType: Flag.ENTITY.RELATION,
			entityId: $item.data("trackId"),
			secondId: Relation.active.trackId,
			artist: artist,
			title: title,
			secondArtist: Relation.active.artist,
			secondTitle: Relation.active.title,
		})
		.toggleClass( "active", $item.data("flagged") )
		.toggleClass("disabled", !canSubmitFlags)
		.attr("title", canSubmitFlags
			? "Flag for moderator attention"
			: "Not enough reputation"
		);
}

// Called when the user account status has changed
Relation.onAccountSync = function()
{
	var $item = $(".item.active");

	if(!$item.length)
		return;

	var data = $item.data();
	Relation.updateActiveRating(data.rating, data.vote);
}

// Called upon pressing the view relations button
Relation.onViewRelationsClick = function()
{
	var Item = require("./Item.js");

	if(!Item.active)
		return;

	Relation.request(Item.active.trackId);
}

// Called upon pressing the plus icon on the related tab
Relation.onAddIconClick = function()
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return Account.showLoginOverlay();

	var $item = $(".item.active");

	if(!$item.length)
		return;

	var isHiding = ($item.find("#add-list").length);

	$item.find(".add.icon").click();

	if(isHiding)
		return;

	// Line up the dropdown with the related tab
	$("#add-list")
		.addClass("aligned")
		.css("top", $("#items").scrollTop() +
		$("#tab-related").offset().top - $("#items").offset().top);
}

// Called upon pressing the upvote icon on the related tab
Relation.onUpvoteIconClick = function()
{
	Relation.setActiveVote( Relation.VOTE_POSITIVE, $(this) );
}

// Called upon pressing the downvote icon on the related tab
Relation.onDownvoteIconClick = function()
{
	Relation.setActiveVote( Relation.VOTE_NEGATIVE, $(this) );
}

Relation.init = function()
{
	$("#related-overlay").click(Relation.onViewRelationsClick);
	$("#related-add").click(Relation.onAddIconClick);
	$("#related-upvote").click(Relation.onUpvoteIconClick);
	$("#related-downvote").click(Relation.onDownvoteIconClick);

	var Flag = require("./Flag.js");
	$("#related-flag").click(Flag.onIconClick);
}

module.exports = Relation;
