module.exports = function(core)
{
	var SearchController = {};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;
	var passport = core.passport;

	var Track = sequelize.models.Track;

	// Search for tracks matching the query
	SearchController.getResults = function(req, res)
	{
		var query = "%" + req.body.query.replace(/%/g, "/%") + "%";

		Track.all
		({
			attributes: ["trackId", "artist", "title"],
			limit: 100,
			where:
			{
				trackId: { $ne: -1 },
				$or:
				[
					// todo: add combined search
					{ artist: { $like: query } },
					{ title: { $like: query } }
				]
			}
		})
		.then(function(tracks)
		{
			// No results, return an empty array
			if(!tracks)
				return res.json( [] );

			var response = [];

			for(var index in tracks)
			{
				response.push
				([
					tracks[index].trackId,
					tracks[index].artist,
					tracks[index].title
				]);
			}
			
			res.json(response);
		});
	}

	// Returns true if the search query is valid
	SearchController.validateQuery = function(query)
	{
		if(query.length < 3 || query.length > 150)
			return false;

		return true;
	}

	app.post("/search",
		paperwork.accept
		({
			query: paperwork.all(String, SearchController.validateQuery)
		}),
		SearchController.getResults);

	return SearchController;
}
