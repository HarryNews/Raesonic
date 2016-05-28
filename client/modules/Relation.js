 var Relation =
 {
 	// Response status codes
	STATUS_CREATED: 1,
	STATUS_UPVOTED: 2,
 };

// Create a relation between two tracks
Relation.create = function(trackId, linkedId)
{
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
			
			// todo: show message according to status
		}
	});
}

// Request relations of the specified track and switch to the list view
Relation.request = function(trackId)
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

			// todo: save relations in a storage
			// todo: switch to the list view of track relations
		}
	});
}

// Update vote on a relation between two tracks
Relation.vote = function(trackId, linkedId, vote)
{
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

			var trust = response;
			
			// todo: update relation's trust display
		}
	});
}

module.exports = Relation;
