module.exports = function(core)
{
	var PlaylistController = {};

	var ContentController = require("./ContentController.js")(core);

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;
	var passport = core.passport;

	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var Playlist = sequelize.models.Playlist;
	var Item = sequelize.models.Item;

	// Create a new playlist with specified name
	PlaylistController.createPlaylist = function(req, res)
	{
		// todo: return error if not logged in

		// todo: use actual user id
		Playlist.create
		({
			name: req.body.name,
			userId: 1
		})
		.then(function(playlist)
		{
			res.json(playlist.playlistId);
		});
	}

	// Retrieve playlist info and items
	PlaylistController.getPlaylist = function(req, res)
	{
		// todo: return error if user has no access to playlist

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
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

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

	// Returns true if playlist name is valid
	PlaylistController.validateName = function(name)
	{
		if(name.length < 3 || name.length > 50)
			return false;

		// todo: restrict to a-zA-Z0-9!@#$%^&*();:_-= (estimate)

		return true;
	}
	
	app.post("/playlists",
		paperwork.accept
		({
			name: paperwork.all(String, PlaylistController.validateName),
		}),
		PlaylistController.createPlaylist);

	app.get("/playlists/:playlistId(\\d+)",
		PlaylistController.getPlaylist);
	
	app.post("/playlists/:playlistId(\\d+)",
		paperwork.accept
		({
			sourceId: paperwork.all(Number, ContentController.validateSourceId),
			externalId: paperwork.all(String, ContentController.validateExternalId),
		}),
		PlaylistController.addItem);

	return PlaylistController;
}
