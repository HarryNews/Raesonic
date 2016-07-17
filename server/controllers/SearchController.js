module.exports = function(core)
{
	var SearchController = {};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;
	var config = core.config;

	var Track = sequelize.models.Track;

	var like = (config.database.dialect == "postgres")
		? "$iLike"
		: "$like";

	// Search for tracks matching the query
	SearchController.getResults = function(req, res)
	{
		var query = req.body.query.replace(/%/g, "/%");
		var where = { trackId: { $ne: -1 } };
		var params = {};

		if(query.slice(0, 8) == "artist: ")
		{
			// Exact artist name as one of the artists
			var artist = query.slice(8);

			where["$or"] =
			[
				{ artist: artist },
			];

			params[like] = "%" + artist + " &+ %";
			where["$or"][1] = { artist: params }

			var altParams = {};
			altParams[like] = "% &+ " + artist + "%";
			where["$or"][2] = { artist: altParams }
		}
		else if(query.slice(0, 7) == "title: ")
		{
			// Case-insensitive title start
			params[like] = query.slice(7) + "%";
			where.title = params;
		}
		else
		{
			var parts = query.split(/\s(-|–)\s/g);

			if(parts.length > 1)
			{
				// Exact name of one or multiple artists
				var artist = parts[0];

				if(artist.indexOf(" & ") != -1)
				{
					where["$or"] =
					[
						{ artist: artist },
						{ artist: artist.replace(/\s&\s/g, " &+ ") },
					];
				}
				else
				{
					where.artist = artist;
				}

				// Case-insensitive title start
				params[like] = parts[2] + "%";
				where.title = params;
			}
			else
			{
				// Part of either artist or title
				params[like] = "%" + query + "%";

				where["$or"] =
				[
					{ artist: params },
					{ title: params },
				];
			}
		}

		Track.all
		({
			attributes: ["trackId", "artist", "title"],
			limit: 100,
			where: where,
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

	SearchController.init = function()
	{
		app.post("/search",
			paperwork.accept
			({
				query: paperwork.all(String, SearchController.validateQuery)
			}),
			SearchController.getResults);
	}

	return SearchController;
}
