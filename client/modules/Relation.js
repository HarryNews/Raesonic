var Relation = {};

// Create a relation between two tracks
Relation.create = function(trackId, linkedId)
{
	$.ajax
	({
		url: "/relations/",
		type: "POST",
		data: { trackId: trackId, linkedId: linkedId },
		success: function(response)
		{
			if(response.error)
				return;

			// todo: show message about successful creation
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
			if(response.error)
				return;

			// todo: save response in a storage
			// todo: switch to the list view of track relations
		}
	});
}

module.exports = Relation;
