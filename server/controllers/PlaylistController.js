module.exports = function(app, sequelize)
{
	var PlaylistController = {};

	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var Playlist = sequelize.models.Playlist;
	var Item = sequelize.models.Item;

	// Create a new playlist with specified name
	PlaylistController.createPlaylist = function(req, res)
	{
		if(!req.body || !req.body.name || req.body.name.length > 50)
			return res.status(500).json({ error: true });

		// todo: return error if not logged in
		// todo: return error if playlist name contains restricted characters
		// todo: use actual user id

		Playlist.create
		({
			name: req.body.name,
			userId: 1
		});
	}

	// Retrieve playlist info and items
	PlaylistController.getPlaylist = function(req, res)
	{
		Playlist.findOne
		({
			attributes: ["name", "access"],
			where: { playlistId: req.params.playlistId },
			order: "itemId DESC",
			include:
			[{
				model: Item,
				attributes: ["itemId"],
				include:
				[{
					model: Content,
					attributes: ["sourceId", "externalId"],
					include:
					[{
						model: Track,
						attributes: ["trackId", "artist", "title"]
					}]
				}]
			}]
		})
		.then(function(playlist)
		{
			if(!playlist)
				return res.json( [] );

			// todo: return error if user has no access to playlist

			var response = [ [playlist.name, playlist.access], [] ];

			var items = playlist.Items;

			for(var index in items)
			{
				response[1].push
				([
					items[index].Content.Track.trackId,
					items[index].Content.Track.artist,
					items[index].Content.Track.title,
					items[index].itemId,
					items[index].Content.sourceId,
					items[index].Content.externalId
				]);
			}

			res.json(response);
		});
	}

	// Add content as a new playlist item
	PlaylistController.addItem = function(req, res)
	{
		if(!req.body || !req.body.sourceId || !req.body.externalId)
			return res.status(500).json({ error: true });

		// todo: check sourceId to be 1/2, make sure externalId is a string/int in valid range
		// todo: return error if not logged in
		// todo: return error if playlist does not belong to that user

		// First we need to find the content or create one if it doesn't exist
		Content.findOrCreate
		({
			where:
			{
				sourceId: req.body.sourceId,
				externalId: req.body.externalId
			},
			defaults: { trackId: -1 },
			include:
			[{
				model: Track,
				attributes: ["trackId", "artist", "title"]
			}]
		})
		.spread(function(content, created)
		{
			// Now we have the contentId so the item can be created
			Item.create
			({
				playlistId: req.params.playlistId,
				contentId: content.contentId
			})
			.then(function(item)
			{
				if(created)
				{
					// Content has been created just now, it is not linked to any track so we pass default values
					var data =
					[
						-1,
						"Unknown Artist",
						"Unknown Track",
						item.itemId
					];

					return res.json(data);
				}

				var data =
				[
					content.Track.trackId,
					content.Track.artist,
					content.Track.title,
					item.itemId
				];

				res.json(data);
			});
		});
	}

	app
		.route("/playlists")
			.post(PlaylistController.createPlaylist);

	app
		.route("/playlists/:playlistId(\\d+)")
			.get(PlaylistController.getPlaylist)
			.post(PlaylistController.addItem);

	return PlaylistController;
}
