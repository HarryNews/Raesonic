module.exports = function(core)
{
	var RandomString = require("randomstring");

	var PlaylistController =
	{
		DEFAULT_ALIAS_LENGTH: 12,
		// Access methods
		BY_PLAYLISTID: 1,
		BY_ITEMID: 2,
		BY_ALIAS: 3,
		// Access values
		PRIVATE_ACCESS: 1,
		SHARED_ACCESS: 2,
		PUBLIC_ACCESS: 3,
	};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var Playlist = sequelize.models.Playlist;
	var Item = sequelize.models.Item;

	// Creates a new playlist with the specified name
	// Note: Main playlists are not created with this method
	PlaylistController.createPlaylist = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		Playlist.create
		({
			name: req.body.name,
			userId: req.user.userId,
			alias: RandomString.generate(PlaylistController.DEFAULT_ALIAS_LENGTH),
		})
		.then(function(playlist)
		{
			res.json(playlist.playlistId);
		});
	}

	// Retrieve playlist info and items
	PlaylistController.getPlaylist = function(req, res)
	{
		var condition = req.params.alias.match(/[^$\d]/)
			? { alias: req.params.alias }
			: { playlistId: req.params.alias };

		PlaylistController.verifyAccess(req.user, condition, res,
		function onConfirm()
		{
			Playlist.findOne
			({
				attributes: ["playlistId", "name", "access"],
				where: condition,
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

				var items = playlist.Items;
				var responseItems = [];

				for(var index in items)
				{
					responseItems.push
					([
						items[index].Content.Track.trackId,
						items[index].Content.Track.artist,
						items[index].Content.Track.title,
						items[index].itemId,
						items[index].Content.sourceId,
						items[index].Content.externalId
					]);
				}

				var response =
				[
					[
						playlist.playlistId,
						playlist.name,
						playlist.access,
						playlist.alias,
					],
					responseItems
				];

				res.json(response);
			});
		});
	}

	// Retrieve main playlist of the user
	PlaylistController.getMainPlaylist = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		Playlist.findOne
		({
			where: { userId: req.user.userId },
			order: "playlistId DESC"
		})
		.then(function(playlist)
		{
			if(!playlist)
				return res.status(404).json({ errors: ["playlist not found"] });

			req.params.alias = playlist.playlistId.toString();
			PlaylistController.getPlaylist(req, res);
		});
	}

	// Add content as a new playlist item
	PlaylistController.addItem = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		PlaylistController.verifyOwnership(req.user, PlaylistController.BY_PLAYLISTID, req.params.playlistId, res,
		function onConfirm()
		{
			// User is the playlist owner, proceed to adding item
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
						// Content is not yet linked to a track, pass default values
						var response =
						[
							-1,
							"Unknown Artist",
							"Unknown Track",
							item.itemId,
						];

						return res.json(response);
					}

					var response =
					[
						content.Track.trackId,
						content.Track.artist,
						content.Track.title,
						item.itemId,
					];

					res.json(response);
				});
			});
		});
	}

	// Creates a main playlist for the newly created account
	PlaylistController.createMainPlaylist = function(user, tr)
	{
		return Playlist.create
		({
			name: "Main",
			userId: user.userId,
			alias: RandomString.generate(PlaylistController.DEFAULT_ALIAS_LENGTH),
		},
		{ transaction: tr })
		.then(function()
		{
			return user;
		});
	}

	// Calls confirm if the user is a playlist owner
	PlaylistController.verifyOwnership = function(user, method, entityId, res, confirm)
	{
		var params = {};

		switch(method)
		{
			case PlaylistController.BY_PLAYLISTID:
			{
				params =
				{
					attributes: ["userId"],
					where: { playlistId: entityId }
				};
				break;
			}
			case PlaylistController.BY_ITEMID:
			{
				params =
				{
					attributes: ["userId"],
					include:
					[{
						model: Item,
						where: { itemId: entityId }
					}]
				};
				break;
			}
			default:
			{
				return res.status(500).json({ errors: ["internal error"] });
			}
		}

		Playlist
		.findOne(params)
		.then(function(playlist)
		{
			if(!playlist)
				return res.status(404).json({ errors: ["playlist not found"] });

			if(user.userId != playlist.userId)
				return res.status(403).json({ errors: ["no access"] });

			confirm();
		});
	}

	// Calls confirm if the user can view playlist
	PlaylistController.verifyAccess = function(user, condition, res, confirm)
	{
		Playlist.findOne
		({
			attributes: ["userId", "access"],
			where: condition
		})
		.then(function(playlist)
		{
			if(!playlist)
				return res.status(404).json({ errors: ["playlist not found"] });

			// Playlist owners always have access
			if(user && user.userId == playlist.userId)
				return confirm();

			// Shared playlists can only be reached by their alias
			if(!condition.alias &&
				playlist.access == PlaylistController.SHARED_ACCESS)
				return res.status(403).json({ errors: ["no access"] });

			// Playlist owners don't reach this line, deny access
			if(playlist.access == PlaylistController.PRIVATE_ACCESS)
				return res.status(403).json({ errors: ["no access"] });

			confirm();
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
	
	PlaylistController.init = function()
	{
		var ContentController = core.controllers.Content;

		app.post("/playlists",
			paperwork.accept
			({
				name: paperwork.all(String, PlaylistController.validateName),
			}),
			PlaylistController.createPlaylist);

		app.get("/playlists/:alias",
			PlaylistController.getPlaylist);

		app.get("/own/playlists/main",
			PlaylistController.getMainPlaylist);
		
		app.post("/playlists/:playlistId(\\d+)",
			paperwork.accept
			({
				sourceId: paperwork.all(Number, ContentController.validateSourceId),
				externalId: paperwork.all(String, ContentController.validateExternalId),
			}),
			PlaylistController.addItem);
	}

	return PlaylistController;
}
